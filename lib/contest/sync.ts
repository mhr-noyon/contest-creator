import { Contest, ContestSubmission } from "@/lib/contest/types";
import { getProvider } from "@/lib/contest/providers";

function buildHandleKey(oj: string, handle: string): string {
  return `${oj}:${handle.toLowerCase()}`;
}

export async function syncContestSubmissions(contest: Contest): Promise<Contest> {
  const startTime = contest.settings.startTime || contest.createdAt;
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

  for (const handleEntry of allHandles) {
    const handleKey = buildHandleKey(handleEntry.oj, handleEntry.handle);
    if (seenHandles.has(handleKey)) continue;
    seenHandles.add(handleKey);

    const provider = getProvider(handleEntry.oj);
    
    // Calculate a safe starting time: 10 minutes (600 seconds) before the contest started.
    const contestStartSeconds = Math.floor(startTime / 1000) - 600;
    
    // Go back by 10 minutes (600 seconds) from the last fetched time as a safety margin for scraping delays.
    const lastFetched = contest.sync.lastFetchedAtByHandle[handleKey];
    let since = lastFetched ? Math.max(contestStartSeconds, lastFetched - 600) : contestStartSeconds;

    // For AtCoder (Kenkoooo API), scrape delays can be long. We must always check from the contest start time.
    if (handleEntry.oj === "atcoder") {
      since = contestStartSeconds;
    }

    const recent = await provider.fetchRecentSubmissions(handleEntry.handle, since, 200);

      recent.forEach((submission) => {
        const problemId = problemMap.get(`${submission.oj}:${submission.problemId.toLowerCase()}`);
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
    (submission) => submission.submittedAt >= startTime
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
