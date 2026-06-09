import { ContestSubmission } from "@/lib/contest/types";
import { OJProblem, OJProviderInterface, ProblemFilter } from "@/lib/contest/providers/types";
import { redis } from "@/lib/store";

const AC_PROBLEMS_URL = "https://kenkoooo.com/atcoder/resources/merged-problems.json";
const AC_MODELS_URL = "https://kenkoooo.com/atcoder/resources/problem-models.json";
const AC_SUBMISSIONS_URL = "https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions";
const AC_CONTEST_SUBMISSIONS_URL = (contestId: string, page: number) =>
  `https://atcoder.jp/contests/${contestId}/submissions/?page=${page}`;
const AC_SYNC_PAGES = 5;

const ATCODER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

function difficultyToRating(difficulty?: number | null): number | null {
  if (difficulty === null || difficulty === undefined) return null;
  
  // 1. Calculate the displayed AtCoder rating (correcting for low ratings < 400)
  let acRating = difficulty;
  if (difficulty < 400) {
    acRating = 400 / Math.exp((400 - difficulty) / 400);
  }

  // 2. Convert AtCoder rating to Codeforces rating
  const cfRating = 900 + (acRating - 400) * 0.75;

  // 3. Round to the nearest 100 to align with standard Codeforces rating steps
  const roundedRating = Math.round(cfRating / 100) * 100;

  // 4. Ensure we don't go below the minimum Codeforces problem rating (800)
  return Math.max(800, roundedRating);
}

function mapACVerdict(result?: string): "OK" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER" {
  console.log("mapACVerdict result", result);
  if (!result) return "OTHER";
  switch (result) {
    case "AC": return "OK";
    case "WA": return "WA";
    case "TLE": return "TLE";
    case "MLE": return "MLE";
    case "RE": return "RE";
    case "CE": return "CE";
    default: return "OTHER";
  }
}

export function getAtCoderContestIdFromProblemUrl(url: string): string | null {
  const match = url.match(/\/contests\/([^/]+)\/tasks\//i);
  return match ? match[1] : null;
}

type ParsedAtCoderSubmission = {
  submissionId: string;
  handle: string;
  problemId: string;
  verdict: "OK" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER";
  submittedAt: number;
};

function parseAtCoderSubmissionListPage(html: string): ParsedAtCoderSubmission[] {
  const rows: ParsedAtCoderSubmission[] = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const row = rowMatch[1];
    const submissionIdMatch = row.match(/\/submissions\/(\d+)/i);
    const handleMatch = row.match(/\/users\/([^"'<>\s]+)/i);
    const problemMatch = row.match(/\/tasks\/([^"'<>\s]+)/i);
    const verdictMatch =
      row.match(/<span[^>]*class="[^"]*(?:label|badge)[^"]*"[^>]*>\s*([^<]+)\s*<\/span>/i) ||
      row.match(/<td[^>]*>\s*(AC|WA|TLE|MLE|RE|CE|OTHER)\s*<\/td>/i);
    const timeMatch = row.match(/<time[^>]*datetime="([^"]+)"[^>]*>/i) || row.match(/<time[^>]*>([^<]+)<\/time>/i);

    if (!submissionIdMatch || !handleMatch || !problemMatch || !verdictMatch || !timeMatch) {
      continue;
    }

    const submittedAt = new Date(timeMatch[1]).getTime();
    if (!Number.isFinite(submittedAt)) {
      continue;
    }

    rows.push({
      submissionId: submissionIdMatch[1],
      handle: handleMatch[1],
      problemId: problemMatch[1],
      verdict: mapACVerdict(verdictMatch[1].trim()),
      submittedAt,
    });
  }

  return rows;
}

export async function fetchAtCoderContestSubmissions(params: {
  contestId: string;
  handles: string[];
  startTimeMs: number;
  endTimeMs: number;
  pages?: number;
}): Promise<ContestSubmission[]> {
  const { contestId, handles, startTimeMs, endTimeMs, pages = AC_SYNC_PAGES } = params;
  const handleSet = new Set(handles.map((handle) => handle.toLowerCase()));
  const seenSubmissionIds = new Set<string>();
  const submissions: ContestSubmission[] = [];

  for (let page = 1; page <= Math.max(1, pages); page += 1) {
    const url = AC_CONTEST_SUBMISSIONS_URL(contestId, page);
    const res = await fetch(url, { headers: ATCODER_HEADERS, cache: "no-store" });

    if (!res.ok) {
      if (page === 1) {
        throw new Error(`AtCoder submissions page ${page} failed with status ${res.status}`);
      }
      console.warn(`Skipping AtCoder submissions page ${page} because it returned ${res.status}`);
      continue;
    }

    const html = await res.text();
    const rows = parseAtCoderSubmissionListPage(html);

    for (const row of rows) {
      if (!handleSet.has(row.handle.toLowerCase())) continue;
      if (row.submittedAt < startTimeMs || row.submittedAt > endTimeMs) continue;

      const uniqueId = `ac-${row.submissionId}`;
      if (seenSubmissionIds.has(uniqueId)) continue;
      seenSubmissionIds.add(uniqueId);

      submissions.push({
        id: uniqueId,
        contestId: "",
        oj: "atcoder",
        handle: row.handle,
        problemId: row.problemId,
        verdict: row.verdict,
        submittedAt: row.submittedAt,
      });
    }
  }

  return submissions.sort((a, b) => a.submittedAt - b.submittedAt);
}

let cachedProblemsList: OJProblem[] | null = null;
let lastFetchedAt = 0;

async function getAtCoderProblems(): Promise<OJProblem[]> {
  const now = Date.now();
  
  // 1. Try local memory cache (very fast fallback / hot lambda)
  if (cachedProblemsList && (now - lastFetchedAt < 5 * 60 * 1000)) {
    return cachedProblemsList;
  }

  // 2. Try Redis cache (highly recommended for serverless production)
  if (redis) {
    try {
      const cached = await redis.get<OJProblem[]>("atcoder:problems:processed");
      if (cached && Array.isArray(cached) && cached.length > 0) {
        cachedProblemsList = cached;
        lastFetchedAt = now;
        console.log(`Retrieved ${cached.length} pre-processed AtCoder problems from Redis.`);
        return cached;
      }
    } catch (err) {
      console.warn("Failed to retrieve AtCoder problems from Redis:", err);
    }
  }

  // 3. Cache miss: Fetch and pre-process raw data from Kenkoooo
  console.log("Fetching AtCoder problems and models from Kenkoooo...");
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  };

  const [problemsRes, modelsRes] = await Promise.all([
    fetch(AC_PROBLEMS_URL, { headers, cache: "no-store" }),
    fetch(AC_MODELS_URL, { headers, cache: "no-store" }),
  ]);

  if (!problemsRes.ok || !modelsRes.ok) {
    console.error(`AtCoder fetch failed. problemsRes: ${problemsRes.status}, modelsRes: ${modelsRes.status}`);
    throw new Error(`AtCoder problems or models failed to fetch: problems=${problemsRes.status}, models=${modelsRes.status}`);
  }

  let problems: any[] = [];
  let models: any = {};
  try {
    problems = await problemsRes.json();
    models = await modelsRes.json();
  } catch (err) {
    console.error("Failed to parse AtCoder problems/models JSON (possibly blocked by Cloudflare/HTML response):", err);
    throw new Error("AtCoder problems/models API returned an invalid response");
  }

  const processed: OJProblem[] = (problems || [])
    .map((problem: any) => {
      const model = models?.[problem.id];
      const rating = difficultyToRating(model?.difficulty ?? null);
      const title = String(problem.title || "").replace(/^[A-Za-z0-9]+\.\s*/, "");
      return {
        id: problem.id,
        title,
        url: `https://atcoder.jp/contests/${problem.contest_id}/tasks/${problem.id}`,
        rating,
        tags: [] as string[],
        oj: "atcoder" as const,
      };
    })
    .filter((p: OJProblem) => p.rating !== null);

  cachedProblemsList = processed;
  lastFetchedAt = now;

  // 4. Cache pre-processed list to Redis for 24 hours (compact size ~600KB)
  if (redis && processed.length > 0) {
    try {
      await redis.set("atcoder:problems:processed", processed, { ex: 60 * 60 * 24 });
      console.log(`Saved ${processed.length} pre-processed AtCoder problems to Redis.`);
    } catch (err) {
      console.warn("Failed to cache AtCoder problems to Redis:", err);
    }
  }

  return processed;
}

export const atcoderProvider: OJProviderInterface = {
  name: "atcoder",
  async fetchProblems(filter: ProblemFilter): Promise<OJProblem[]> {
    const problems = await getAtCoderProblems();
    console.log("Atcoder problems cached length:", problems.length);

    return problems.filter((problem: OJProblem) => {
      const rating = problem.rating!;
      return rating >= filter.minRating && rating <= filter.maxRating;
    });
  },
  async fetchRecentSubmissions(handle: string, sinceEpochSeconds?: number, limit?: number): Promise<ContestSubmission[]> {
    const fromSeconds = sinceEpochSeconds ?? 0;
    const url = `${AC_SUBMISSIONS_URL}?user=${encodeURIComponent(handle)}&from_second=${fromSeconds}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };
    const res = await fetch(url, { headers, cache: "no-store" });

    console.log("Atcoder url: ", url);
    console.log("Atcoder fromSeconds: ", fromSeconds);

    if (!res.ok) {
      throw new Error("AtCoder submissions unavailable");
    }

    let data: any[] = [];
    try {
      data = await res.json();
    } catch (err) {
      console.error("Failed to parse AtCoder submissions JSON (possibly blocked by Cloudflare/HTML response):", err);
      throw new Error("AtCoder submissions API returned an invalid response");
    }

    console.log("Atcoder submissions", data.slice(0, 2));

    return (data || []).map((submission: any) => ({
      id: `ac-${submission.id}`,
      contestId: "",
      oj: "atcoder",
      handle,
      problemId: submission.problem_id,
      verdict: mapACVerdict(submission.result),
      submittedAt: submission.epoch_second * 1000,
    }));
  },
  async verifyHandle(handle: string): Promise<boolean> {
    try {
      const url = `https://atcoder.jp/users/${encodeURIComponent(handle)}`;
      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      };
      const res = await fetch(url, { headers, cache: "no-store" });
      return res.status === 200;
    } catch {
      return false;
    }
  },
};
