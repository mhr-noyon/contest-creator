import { ContestSubmission } from "@/lib/contest/types";
import { OJProblem, OJProviderInterface, ProblemFilter } from "@/lib/contest/providers/types";

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

let cachedProblems: any = null;
let cachedModels: any = null;
let lastFetchedAt = 0;

async function getAtCoderProblemsAndModels() {
  const now = Date.now();
  if (cachedProblems && cachedModels && (now - lastFetchedAt < 5 * 60 * 1000)) {
    return { problems: cachedProblems, models: cachedModels };
  }
  const [problemsRes, modelsRes] = await Promise.all([
    fetch(AC_PROBLEMS_URL, { cache: "no-store" }),
    fetch(AC_MODELS_URL, { cache: "no-store" }),
  ]);
  if (!problemsRes.ok || !modelsRes.ok) {
    throw new Error("AtCoder problems or models failed to fetch");
  }
  cachedProblems = await problemsRes.json();
  cachedModels = await modelsRes.json();
  lastFetchedAt = now;
  return { problems: cachedProblems, models: cachedModels };
}

export const atcoderProvider: OJProviderInterface = {
  name: "atcoder",
  async fetchProblems(filter: ProblemFilter): Promise<OJProblem[]> {
    const { problems, models } = await getAtCoderProblemsAndModels();

    // print first 2
    console.log("Atcoder problems", problems?.slice(0, 2));
    console.log("Atcoder models", models?.slice(0, 2));

    const filtered = (problems || []) 
      .map((problem: any) => {
        const model = models?.[problem.id];
        const rating = difficultyToRating(model?.difficulty ?? null);
        const title = String(problem.title || "").replace(/^[A-Za-z0-9]+\.\s*/, "");
        return {
          id: problem.id,
          title,
          url: `https://atcoder.jp/contests/${problem.contest_id}/tasks/${problem.id}`,
          rating,
          tags: [],
          oj: "atcoder" as const,
        };
      })
      .filter((problem: OJProblem) => {
        if (!problem.rating) return false;
        if (problem.rating < filter.minRating || problem.rating > filter.maxRating) return false;
        return true;
      });

    return filtered;
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
