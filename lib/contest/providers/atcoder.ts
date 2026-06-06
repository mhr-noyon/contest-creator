import { ContestSubmission } from "@/lib/contest/types";
import { OJProblem, OJProviderInterface, ProblemFilter } from "@/lib/contest/providers/types";
import { redis } from "@/lib/store";

const AC_PROBLEMS_URL = "https://kenkoooo.com/atcoder/resources/merged-problems.json";
const AC_MODELS_URL = "https://kenkoooo.com/atcoder/resources/problem-models.json";
const AC_SUBMISSIONS_URL = "https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions";

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

  // 3. Cache miss: Fetch and pre-process raw data
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

  const problems = await problemsRes.json();
  const models = await modelsRes.json();

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
  async fetchRecentSubmissions(handle: string, sinceEpochSeconds?: number): Promise<ContestSubmission[]> {
    const fromSeconds = sinceEpochSeconds ?? 0;
    const url = `${AC_SUBMISSIONS_URL}?user=${encodeURIComponent(handle)}&from_second=${fromSeconds}`;
    const res = await fetch(url, { cache: "no-store" });

    console.log("Atcoder url: ", url);
    console.log("Atcoder fromSeconds: ", fromSeconds);

    if (!res.ok) {
      throw new Error("AtCoder submissions unavailable");
    }

    const data = await res.json();

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
      const res = await fetch(url, { cache: "no-store" });
      return res.status === 200;
    } catch {
      return false;
    }
  },
};
