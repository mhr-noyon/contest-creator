import { ContestSubmission } from "@/lib/contest/types";
import { OJProblem, OJProviderInterface, ProblemFilter } from "@/lib/contest/providers/types";

const AC_PROBLEMS_URL = "https://kenkoooo.com/atcoder/resources/merged-problems.json";
const AC_MODELS_URL = "https://kenkoooo.com/atcoder/resources/problem-models.json";
const AC_SUBMISSIONS_URL = "https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions";

function difficultyToRating(difficulty?: number | null): number | null {
  if (difficulty === null || difficulty === undefined) return null;
  if (difficulty >= 400) return Math.round(difficulty);
  const rating = Math.round(400 / Math.exp((400 - difficulty) / 400));
  if (!Number.isFinite(rating)) return null;
  return Math.max(0, rating);
}

function mapACVerdict(result?: string): "OK" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER" {
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
    const fromSeconds = sinceEpochSeconds ?? Math.floor(Date.now() / 1000) - 60 * 60 * 24;
    const url = `${AC_SUBMISSIONS_URL}?user=${encodeURIComponent(handle)}&from_second=${fromSeconds}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error("AtCoder submissions unavailable");
    }

    const data = await res.json();

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
