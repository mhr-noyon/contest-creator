import { Contest, ContestSubmission } from "@/lib/contest/types";
import { getProvider } from "@/lib/contest/providers";
import { fetchAtCoderContestSubmissions, getAtCoderContestIdFromProblemUrl } from "@/lib/contest/providers/atcoder";

function buildHandleKey(oj: string, handle: string): string {
  return `${oj}:${handle.toLowerCase()}`;
}

function getContestWindow(contest: Contest): { startTimeMs: number; endTimeMs: number } {
  const startTimeMs = contest.settings.startTime || contest.createdAt;
  const hasDuration = contest.settings.durationMinutes > 0;
  const endTimeMs = hasDuration
    ? startTimeMs + contest.settings.durationMinutes * 60 * 1000
    : Number.POSITIVE_INFINITY;
  return { startTimeMs, endTimeMs };
}

function getAtCoderContestId(contest: Contest): string | null {
  for (const problem of contest.problems) {
    if (problem.oj !== "atcoder") continue;
    const contestId = getAtCoderContestIdFromProblemUrl(problem.url);
    if (contestId) return contestId;
  }
  return null;
}

export async function syncContestSubmissions(contest: Contest): Promise<Contest> {
  const { startTimeMs, endTimeMs } = getContestWindow(contest);
  const problemMap = new Map<string, string>();

  contest.problems.forEach((problem) => {
    problemMap.set(`${problem.oj}:${problem.externalId.toLowerCase()}`, problem.id);
  });

  const newSubmissions: ContestSubmission[] = [];
  const nowSeconds = Math.floor(Date.now() / 1000);

  const seenHandles = new Set<string>();

  const allHandles = [
    ...contest.handles,
    ...contest.participants.flatMap((p) => p.handles),
  ];

  const atcoderContestId = getAtCoderContestId(contest);
  const atcoderHandles = Array.from(
    new Map(
      allHandles
        .filter((handleEntry) => handleEntry.oj === "atcoder")
        .map((handleEntry) => [handleEntry.handle.toLowerCase(), handleEntry])
    ).values()
  );

  if (atcoderContestId && atcoderHandles.length > 0) {
    try {
      const recentAtcoder = await fetchAtCoderContestSubmissions({
        contestId: atcoderContestId,
        handles: atcoderHandles.map((handleEntry) => handleEntry.handle),
        startTimeMs,
        endTimeMs,
        pages: 5,
      });

      recentAtcoder.forEach((submission) => {
        const problemId = problemMap.get(`${submission.oj}:${submission.problemId}`);
        if (!problemId) return;

        const uniqueId = `${submission.oj}:${submission.id}`;
        if (contest.sync.lastSubmissionIds[uniqueId]) return;

        contest.sync.lastSubmissionIds[uniqueId] = true;
        newSubmissions.push({
          ...submission,
          contestId: contest.id,
          problemId,
        });
      });

      atcoderHandles.forEach((handleEntry) => {
        contest.sync.lastFetchedAtByHandle[buildHandleKey(handleEntry.oj, handleEntry.handle)] = nowSeconds;
      });
    } catch (error) {
      console.warn("AtCoder contest submissions scrape failed, falling back to provider fetch:", error);
    }
  }

  for (const handleEntry of allHandles) {
    if (handleEntry.oj === "atcoder" && atcoderContestId) {
      if (contest.sync.lastFetchedAtByHandle[buildHandleKey(handleEntry.oj, handleEntry.handle)]) {
        continue;
      }
    }

    const handleKey = buildHandleKey(handleEntry.oj, handleEntry.handle);
    if (seenHandles.has(handleKey)) continue;
    seenHandles.add(handleKey);

    const provider = getProvider(handleEntry.oj);
    
    // Calculate a safe starting time: 10 minutes (600 seconds) before the contest started.
    const contestStartSeconds = Math.floor(startTimeMs / 1000) - 600;
    
    // Go back by 10 minutes (600 seconds) from the last fetched time as a safety margin for scraping delays.
    const lastFetched = contest.sync.lastFetchedAtByHandle[handleKey];
    const since = lastFetched ? Math.max(contestStartSeconds, lastFetched - 600) : contestStartSeconds;

    const recent = await provider.fetchRecentSubmissions(handleEntry.handle, since, 200);

      recent.forEach((submission) => {
        const problemId = problemMap.get(`${submission.oj}:${submission.problemId}`);
        if (!problemId) return;

        const uniqueId = `${submission.oj}:${submission.id}`;
        if (contest.sync.lastSubmissionIds[uniqueId]) return;

        contest.sync.lastSubmissionIds[uniqueId] = true;

        newSubmissions.push({
          ...submission,
          contestId: contest.id,
          problemId,
        });
      });

      contest.sync.lastFetchedAtByHandle[handleKey] = nowSeconds;
    }

  const mergedSubmissions = [...contest.submissions, ...newSubmissions].filter(
    (submission) => submission.submittedAt >= startTimeMs && submission.submittedAt <= endTimeMs
  );

  contest.submissions = mergedSubmissions;
  contest.sync.lastSyncedAt = Date.now();

  if (contest.status === "running" && contest.settings.durationMinutes > 0 && contest.settings.startTime) {
    const elapsed = Date.now() - contest.settings.startTime;
    if (elapsed >= contest.settings.durationMinutes * 60 * 1000) {
      contest.status = "finished";
    }
  }

  if (contest.settings.mode === "blitz" && contest.problems.length > 0) {
    const currentProblem = contest.problems[contest.currentProblemIndex];
    if (currentProblem) {
      const solved = contest.submissions.some(
        (submission) => submission.problemId === currentProblem.id && submission.verdict === "OK"
      );
      if (solved) {
        contest.currentProblemIndex = Math.min(contest.currentProblemIndex + 1, contest.problems.length - 1);
        contest.nextProblemUnlockedAt = Date.now() + 60 * 1000;
        contest.problems = contest.problems.map((problem, index) => ({
          ...problem,
          visible: contest.settings.mode === "standard" || index <= contest.currentProblemIndex,
        }));
      }
    }
  }

  return contest;
}
