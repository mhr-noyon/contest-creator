import { ContestSubmission } from "@/lib/contest/types";
import { OJProblem, OJProviderInterface, ProblemFilter } from "@/lib/contest/providers/types";

const CF_PROBLEMSET_URL = "https://codeforces.com/api/problemset.problems";
const CF_SUBMISSION_URL = "https://codeforces.com/api/user.status";

function normalizeProblemId(contestId: number | string, index: string): string {
  return `${contestId}${index}`;
}

function mapCFVerdict(verdict?: string): "OK" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER" {
  if (!verdict) return "OTHER";
  switch (verdict) {
    case "OK": return "OK";
    case "WRONG_ANSWER": return "WA";
    case "TIME_LIMIT_EXCEEDED": return "TLE";
    case "MEMORY_LIMIT_EXCEEDED": return "MLE";
    case "RUNTIME_ERROR": return "RE";
    case "COMPILATION_ERROR": return "CE";
    default: return "OTHER";
  }
}

let cachedProblems: any = null;
let lastFetchedAt = 0;

async function getCodeforcesProblems() {
  const now = Date.now();
  if (cachedProblems && (now - lastFetchedAt < 5 * 60 * 1000)) {
    return cachedProblems;
  }
  const res = await fetch(CF_PROBLEMSET_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Codeforces problems failed to fetch");
  }
  const data = await res.json();
  if (data.status !== "OK") {
    throw new Error("Codeforces problemset unavailable");
  }
  cachedProblems = data.result?.problems || [];
  lastFetchedAt = now;
  return cachedProblems;
}

export const codeforcesProvider: OJProviderInterface = {
  name: "codeforces",
  async fetchProblems(filter: ProblemFilter): Promise<OJProblem[]> {
    const problems = await getCodeforcesProblems();

    const filtered = (problems || []).filter((problem: any) => {
      if (!problem.rating) return false;
      if (problem.rating < filter.minRating || problem.rating > filter.maxRating) return false;
      if (problem.tags?.includes("*special")) return false;
      return true;
    });

    return filtered.slice(0, Math.max(filtered.length, filter.count)).map((problem: any) => ({
      id: normalizeProblemId(problem.contestId, problem.index),
      title: problem.name,
      url: `https://codeforces.com/contest/${problem.contestId}/problem/${problem.index}`,
      rating: problem.rating ?? null,
      tags: problem.tags || [],
      oj: "codeforces",
    }));
  },
  async fetchRecentSubmissions(handle: string, sinceEpochSeconds?: number): Promise<ContestSubmission[]> {
    const url = `${CF_SUBMISSION_URL}?handle=${encodeURIComponent(handle)}&from=1&count=200`;
    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data.status !== "OK") {
      throw new Error("Codeforces submissions unavailable");
    }

    return (data.result || [])
      .filter((submission: any) => {
        if (!submission.creationTimeSeconds) return false;
        if (!sinceEpochSeconds) return true;
        return submission.creationTimeSeconds >= sinceEpochSeconds;
      })
      .map((submission: any) => ({
        id: `cf-${submission.id}`,
        contestId: "",
        oj: "codeforces",
        handle,
        problemId: normalizeProblemId(submission.problem.contestId, submission.problem.index),
        verdict: mapCFVerdict(submission.verdict),
        submittedAt: submission.creationTimeSeconds * 1000,
      }));
  },
  async verifyHandle(handle: string): Promise<boolean> {
    try {
      const url = `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === "OK";
    } catch {
      return false;
    }
  },
};
