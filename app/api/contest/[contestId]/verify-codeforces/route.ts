import { NextResponse } from "next/server";
import { getContest, setContest } from "@/lib/contest/store";

const CF_API = "https://codeforces.com/api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const { contestId } = await params;

  try {
    const { submissionIdOrUrl, problemId, displayName } = await request.json();

    if (!submissionIdOrUrl || !problemId || !displayName) {
      return NextResponse.json(
        { error: "Submission ID/URL, problem selection, and display name are required." },
        { status: 400 }
      );
    }

    // 1. Fetch contest
    const contest = await getContest(contestId);
    if (!contest) {
      return NextResponse.json({ error: "Contest not found." }, { status: 404 });
    }
    if (contest.status !== "running") {
      return NextResponse.json({ error: "Contest is not currently running." }, { status: 400 });
    }

    // 2. Parse submission ID from raw ID or full URL
    // Accepted formats:
    //   - Plain numeric ID:  123456789
    //   - CF contest URL:    https://codeforces.com/contest/1234/submission/123456789
    //   - CF problemset URL: https://codeforces.com/problemset/submission/1234/123456789
    let cfSubmissionId: string | null = null;
    let cfContestId: string | null = null;

    const raw = String(submissionIdOrUrl).trim();

    const contestUrlMatch = raw.match(/\/contest\/(\d+)\/submission\/(\d+)/);
    const problemsetUrlMatch = raw.match(/\/problemset\/submission\/(\d+)\/(\d+)/);

    if (contestUrlMatch) {
      cfContestId = contestUrlMatch[1];
      cfSubmissionId = contestUrlMatch[2];
    } else if (problemsetUrlMatch) {
      cfContestId = problemsetUrlMatch[1];
      cfSubmissionId = problemsetUrlMatch[2];
    } else if (/^\d+$/.test(raw)) {
      cfSubmissionId = raw;
    }

    if (!cfSubmissionId) {
      return NextResponse.json({ error: "Invalid Codeforces Submission ID or URL." }, { status: 400 });
    }

    // 3. Resolve the target problem
    const problem = contest.problems.find((p) => p.id === problemId);
    if (!problem) {
      return NextResponse.json({ error: "Selected problem is not part of this contest." }, { status: 400 });
    }
    if (problem.oj !== "codeforces") {
      return NextResponse.json({ error: "Selected problem is not a Codeforces problem." }, { status: 400 });
    }

    // Extract CF contest ID from externalId (e.g. "1513C" → contest 1513)
    // or from the problem URL
    if (!cfContestId) {
      const urlContestMatch = problem.url.match(/\/contest\/(\d+)\//);
      if (urlContestMatch) {
        cfContestId = urlContestMatch[1];
      } else {
        // Fallback: strip trailing letter(s) from externalId to get contest ID
        const idMatch = problem.externalId.match(/^(\d+)/);
        if (idMatch) cfContestId = idMatch[1];
      }
    }

    if (!cfContestId) {
      return NextResponse.json(
        { error: "Could not determine the Codeforces contest ID for this problem." },
        { status: 400 }
      );
    }

    // 4. Check for duplicate
    const uniqueId = `codeforces:cf-${cfSubmissionId}`;
    if (contest.sync.lastSubmissionIds[uniqueId]) {
      return NextResponse.json(
        { error: "This submission has already been verified and recorded." },
        { status: 400 }
      );
    }

    // 5. Find expected CF handle for this participant
    let expectedHandle: string | null = null;
    if (displayName.trim().toLowerCase() === contest.ownerName.trim().toLowerCase()) {
      const hostCF = contest.handles.find((h) => h.oj === "codeforces");
      if (hostCF) expectedHandle = hostCF.handle;
    } else {
      const participant = contest.participants.find(
        (p) => p.displayName.trim().toLowerCase() === displayName.trim().toLowerCase()
      );
      const participantCF = participant?.handles.find((h) => h.oj === "codeforces");
      if (participantCF) expectedHandle = participantCF.handle;
    }

    if (!expectedHandle) {
      return NextResponse.json(
        { error: "No Codeforces handle registered for your name in this contest." },
        { status: 400 }
      );
    }

    // 6. Fetch submission via Codeforces API
    const apiUrl = `${CF_API}/contest.status?contestId=${cfContestId}&handle=${encodeURIComponent(expectedHandle)}&from=1&count=10000`;
    console.log(`Fetching CF submissions for verification: ${apiUrl}`);

    let cfData: any;
    try {
      const cfRes = await fetch(apiUrl, { cache: "no-store" });
      if (!cfRes.ok) {
        return NextResponse.json(
          { error: `Codeforces API returned status ${cfRes.status}. Try again later.` },
          { status: 502 }
        );
      }
      cfData = await cfRes.json();
    } catch (err) {
      return NextResponse.json(
        { error: "Failed to reach the Codeforces API. Try again later." },
        { status: 502 }
      );
    }

    if (cfData.status !== "OK") {
      return NextResponse.json(
        { error: `Codeforces API error: ${cfData.comment || "Unknown error"}` },
        { status: 400 }
      );
    }

    // 7. Find the specific submission by ID
    const submission = (cfData.result || []).find(
      (s: any) => String(s.id) === cfSubmissionId
    );

    if (!submission) {
      return NextResponse.json(
        { error: `Submission #${cfSubmissionId} not found for handle '${expectedHandle}' in contest ${cfContestId}. Make sure the submission ID is correct and belongs to your registered handle.` },
        { status: 404 }
      );
    }

    // 8. Validate submission details
    // A. Check problem index matches
    const submittedProblemId = `${submission.problem.contestId}${submission.problem.index}`;
    if (submittedProblemId.toLowerCase() !== problem.externalId.toLowerCase()) {
      return NextResponse.json(
        { error: `Submission is for problem '${submittedProblemId}' but selected problem is '${problem.externalId}'.` },
        { status: 400 }
      );
    }

    // B. Check handle matches
    if (submission.author?.members?.[0]?.handle?.toLowerCase() !== expectedHandle.toLowerCase()) {
      return NextResponse.json(
        { error: `Submission author does not match your registered Codeforces handle '${expectedHandle}'.` },
        { status: 400 }
      );
    }

    // C. Check verdict is AC
    if (submission.verdict !== "OK") {
      const readableVerdict: Record<string, string> = {
        WRONG_ANSWER: "Wrong Answer",
        TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
        MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
        RUNTIME_ERROR: "Runtime Error",
        COMPILATION_ERROR: "Compilation Error",
        CHALLENGED: "Challenged",
      };
      const verdictLabel = readableVerdict[submission.verdict] || submission.verdict;
      return NextResponse.json(
        { error: `Submission has not passed all tests. Current verdict: ${verdictLabel}` },
        { status: 400 }
      );
    }

    // D. Check submission time window
    // Must be: during the contest AND submitted at most 5 minutes ago from now
    const submittedAt = submission.creationTimeSeconds * 1000;
    const startTime = contest.settings.startTime || contest.createdAt;
    const maxTime =
      contest.settings.durationMinutes > 0
        ? startTime + contest.settings.durationMinutes * 60 * 1000
        : Infinity;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    if (submittedAt < startTime) {
      return NextResponse.json(
        { error: "Submission was made before the contest started." },
        { status: 400 }
      );
    }
    if (submittedAt > maxTime) {
      return NextResponse.json(
        { error: "Submission was made after the contest ended." },
        { status: 400 }
      );
    }
    if (submittedAt < fiveMinutesAgo) {
      return NextResponse.json(
        { error: "Submission is too old. Only submissions made within the last 5 minutes can be verified." },
        { status: 400 }
      );
    }

    // 9. Record the submission
    const newSubmission = {
      id: `cf-${cfSubmissionId}`,
      contestId: contest.id,
      oj: "codeforces" as const,
      handle: expectedHandle,
      problemId: problem.id,
      verdict: "OK" as const,
      submittedAt,
    };

    contest.submissions.push(newSubmission);
    contest.sync.lastSubmissionIds[uniqueId] = true;

    // Trigger progression in Blitz mode
    if (contest.settings.mode === "blitz") {
      const currentProblem = contest.problems[contest.currentProblemIndex];
      if (currentProblem && currentProblem.id === problem.id) {
        contest.currentProblemIndex = Math.min(
          contest.currentProblemIndex + 1,
          contest.problems.length - 1
        );
        contest.nextProblemUnlockedAt = Date.now() + 60 * 1000;
        contest.problems = contest.problems.map((prob, index) => ({
          ...prob,
          visible: contest.settings.mode === "standard" || index <= contest.currentProblemIndex,
        }));
      }
    }

    await setContest(contestId, contest);

    return NextResponse.json({ success: true, submission: newSubmission });
  } catch (err: any) {
    console.error("Error verifying Codeforces submission:", err);
    return NextResponse.json(
      { error: err.message || "An error occurred while verifying the submission." },
      { status: 500 }
    );
  }
}
