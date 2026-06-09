import { ContestSubmission } from "@/lib/contest/types";
import { OJProblem, OJProviderInterface, ProblemFilter } from "@/lib/contest/providers/types";
import crypto from "crypto";

function normalizeProblemId(contestId: number | string, index: string): string {
  return `${contestId}${index}`;
}

function mapCFVerdict(verdict?: string): "OK" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER" {
  console.log("mapCFVerdict verdict", verdict);
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

function buildCFUrl(methodName: string, params: Record<string, string | number>): string {
  const apiKey = process.env.CF_API_KEY;
  const apiSecret = process.env.CF_SECRET_KEY;

  if (!apiKey || !apiSecret) {
    const query = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `https://codeforces.com/api/${methodName}?${query}`;
  }

  const time = Math.floor(Date.now() / 1000);
  const allParams: Record<string, string | number> = {
    ...params,
    apiKey,
    time,
  };

  const sortedKeys = Object.keys(allParams).sort();
  const sortedQuery = sortedKeys
    .map((k) => `${k}=${allParams[k]}`)
    .join("&");

  const rand = Math.random().toString(36).substring(2, 8).padStart(6, "0");

  const hashSource = `${rand}/${methodName}?${sortedQuery}#${apiSecret}`;
  const hash = crypto.createHash("sha512").update(hashSource).digest("hex");

  const apiSig = `${rand}${hash}`;
  return `https://codeforces.com/api/${methodName}?${sortedQuery}&apiSig=${apiSig}`;
}

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

let cachedProblems: any = null;
let lastFetchedAt = 0;

async function getCodeforcesProblems() {
  const now = Date.now();
  if (cachedProblems && (now - lastFetchedAt < 5 * 60 * 1000)) {
    return cachedProblems;
  }
  const url = buildCFUrl("problemset.problems", {});
  const res = await fetch(url, { headers, cache: "no-store" });
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
  async fetchRecentSubmissions(handle: string, sinceEpochSeconds?: number, limit?: number): Promise<ContestSubmission[]> {
    const count = limit ?? 200;
    const url = buildCFUrl("user.status", { handle, from: 1, count });
    const res = await fetch(url, { headers, cache: "no-store" });
    const data = await res.json();

    console.log("Codeforces Url: ", url);
    console.log("Codeforces fromEpochSeconds: ", sinceEpochSeconds);
    console.log("Codeforces submissions", data.result?.slice(0, 2));

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
      const url = buildCFUrl("user.info", { handles: handle });
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      return data.status === "OK";
    } catch {
      return false;
    }
  },
};
