import { ContestSubmission } from "@/lib/contest/types";
import { OJProblem, OJProviderInterface, ProblemFilter } from "@/lib/contest/providers/types";

const CC_PROBLEMS_URL = "https://www.codechef.com/api/list/problems";
const CC_SUBMISSIONS_URL = "https://www.codechef.com/api/submissions";

function toProblemUrl(code: string): string {
  return `https://www.codechef.com/problems/${code}`;
}

function mapCCVerdict(result?: string): "OK" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER" {
  if (!result) return "OTHER";
  switch (result) {
    case "AC": return "OK";
    case "WA": return "WA";
    case "TLE": return "TLE";
    case "MLE": return "MLE";
    case "RTE": return "RE";
    case "CTE": return "CE";
    default: return "OTHER";
  }
}

let cachedProblems: any = null;
let lastFetchedAt = 0;

async function getCodeChefProblems() {
  const now = Date.now();
  if (cachedProblems && (now - lastFetchedAt < 5 * 60 * 1000)) {
    return cachedProblems;
  }
  const url = `${CC_PROBLEMS_URL}?limit=2000`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("CodeChef problemset unavailable");
  }
  const data = await res.json();
  cachedProblems = data?.problemList || data?.problems || [];
  lastFetchedAt = now;
  return cachedProblems;
}

export const codechefProvider: OJProviderInterface = {
  name: "codechef",
  async fetchProblems(filter: ProblemFilter): Promise<OJProblem[]> {
    const list = await getCodeChefProblems();

    const filtered = list
      .map((problem: any) => {
        const rating = Number(problem?.difficulty ?? problem?.rating ?? 0) || null;
        return {
          id: String(problem?.problemCode || problem?.code || problem?.id || ""),
          title: String(problem?.problemName || problem?.name || ""),
          url: toProblemUrl(String(problem?.problemCode || problem?.code || problem?.id || "")),
          rating,
          tags: [],
          oj: "codechef" as const,
        };
      })
      .filter((problem: OJProblem) => {
        if (!problem.id || !problem.title) return false;
        if (!problem.rating) return false;
        if (problem.rating < filter.minRating || problem.rating > filter.maxRating) return false;
        return true;
      });

    return filtered;
  },
  async fetchRecentSubmissions(handle: string, sinceEpochSeconds?: number): Promise<ContestSubmission[]> {
    const url = `${CC_SUBMISSIONS_URL}?username=${encodeURIComponent(handle)}&page=0`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      throw new Error("CodeChef submissions unavailable");
    }

    const data = await res.json();
    const list = data?.result?.data?.content || data?.content || [];

    return list
      .filter((submission: any) => {
        if (!submission?.date) return true;
        if (!sinceEpochSeconds) return true;
        const epoch = Math.floor(new Date(submission.date).getTime() / 1000);
        return epoch >= sinceEpochSeconds;
      })
      .map((submission: any) => ({
        id: `cc-${submission.id || submission.submissionId || submission.runid}`,
        contestId: "",
        oj: "codechef",
        handle,
        problemId: String(submission.problemCode || submission.problemId || ""),
        verdict: mapCCVerdict(submission.result),
        submittedAt: new Date(submission.date).getTime(),
      }));
  },
  async verifyHandle(handle: string): Promise<boolean> {
    try {
      const url = `https://www.codechef.com/users/${encodeURIComponent(handle)}`;
      const res = await fetch(url, { cache: "no-store" });
      return res.status === 200;
    } catch {
      return false;
    }
  },
};
