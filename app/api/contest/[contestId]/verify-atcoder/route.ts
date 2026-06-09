import { NextResponse } from "next/server";
import { getContest, setContest } from "@/lib/contest/store";

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

    if (contest.status !== "running" && contest.status !== "finished") {
      return NextResponse.json({ error: "Contest is not currently available for verification." }, { status: 400 });
    }

    // 2. Parse submission ID and contest ID from input
    let submissionId = String(submissionIdOrUrl).trim();
    let atcoderContestId: string | null = null;

    // Check if the input is a full AtCoder URL
    // e.g., https://atcoder.jp/contests/abc320/submissions/50022786
    const urlMatch = submissionId.match(/\/contests\/([^/]+)\/submissions\/(\d+)/);
    if (urlMatch) {
      atcoderContestId = urlMatch[1];
      submissionId = urlMatch[2];
    } else {
      // It's just a submission ID. We must find the AtCoder contest ID from the problem URL.
      const problem = contest.problems.find((p) => p.id === problemId);
      if (problem && problem.oj === "atcoder") {
        const pUrlMatch = problem.url.match(/\/contests\/([^/]+)\/tasks/);
        if (pUrlMatch) {
          atcoderContestId = pUrlMatch[1];
        }
      }
    }

    if (!submissionId || !/^\d+$/.test(submissionId)) {
      return NextResponse.json({ error: "Invalid AtCoder Submission ID." }, { status: 400 });
    }

    if (!atcoderContestId) {
      return NextResponse.json({ error: "Could not determine the AtCoder contest ID for this problem." }, { status: 400 });
    }

    // Check if duplicate submission ID
    const uniqueId = `atcoder:ac-${submissionId}`;
    if (contest.sync.lastSubmissionIds[uniqueId]) {
      return NextResponse.json({ error: "This submission has already been verified and recorded." }, { status: 400 });
    }

    // 3. Find target problem in contest
    const problem = contest.problems.find((p) => p.id === problemId);
    if (!problem) {
      return NextResponse.json({ error: "Selected problem is not part of this contest." }, { status: 400 });
    }

    // 4. Fetch the AtCoder submission detail page
    const subUrl = `https://atcoder.jp/contests/${atcoderContestId}/submissions/${submissionId}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    };

    console.log(`Fetching AtCoder submission for verification from: ${subUrl}`);
    const res = await fetch(subUrl, { headers, cache: "no-store" });
    if (res.status === 404) {
      return NextResponse.json({ error: "Submission not found on AtCoder. Make sure the ID/URL is correct." }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: `AtCoder returned status code ${res.status}` }, { status: 500 });
    }

    const html = await res.text();

    // 5. Parse submission HTML
    const taskMatch = html.match(/\/tasks\/([a-zA-Z0-9_-]+)/);
    const parsedTaskId = taskMatch ? taskMatch[1] : null;

    const userMatch = html.match(/\/users\/([a-zA-Z0-9_-]+)/);
    const parsedUserHandle = userMatch ? userMatch[1] : null;

    const statusMatch = html.match(/id="judge-status"[^>]*>([\s\S]*?)<\/td>/);
    let parsedVerdict = "";
    if (statusMatch) {
      const spanMatch = statusMatch[1].match(/>([^<]+)</);
      parsedVerdict = spanMatch ? spanMatch[1].trim() : statusMatch[1].replace(/<[^>]*>/g, "").trim();
    }

    const timeMatch = html.match(/<time[^>]*>([^<]+)<\/time>/);
    const timeStr = timeMatch ? timeMatch[1] : null;
    const submittedAt = timeStr ? new Date(timeStr).getTime() : null;

    if (!parsedTaskId || !parsedUserHandle || !parsedVerdict || !submittedAt) {
      return NextResponse.json({ error: "Failed to parse details from the AtCoder submission page." }, { status: 500 });
    }

    // 6. Validate parsed details against contest settings & user
    // A. Check user handle matches participant's registered handle
    let expectedHandle: string | null = null;
    if (displayName.trim().toLowerCase() === contest.ownerName.trim().toLowerCase()) {
      const hostAC = contest.handles.find((h) => h.oj === "atcoder");
      if (hostAC) expectedHandle = hostAC.handle;
    } else {
      const participant = contest.participants.find(
        (p) => p.displayName.trim().toLowerCase() === displayName.trim().toLowerCase()
      );
      const participantAC = participant?.handles.find((h) => h.oj === "atcoder");
      if (participantAC) expectedHandle = participantAC.handle;
    }

    if (!expectedHandle) {
      return NextResponse.json({ error: "No AtCoder handle registered for your name in this contest." }, { status: 400 });
    }

    if (parsedUserHandle.toLowerCase() !== expectedHandle.toLowerCase()) {
      return NextResponse.json({
        error: `Submission owner '${parsedUserHandle}' does not match your registered AtCoder handle '${expectedHandle}'.`
      }, { status: 400 });
    }

    // B. Check task ID matches selected problem's externalId
    if (parsedTaskId.toLowerCase() !== problem.externalId.toLowerCase()) {
      return NextResponse.json({
        error: `Submission task ID '${parsedTaskId}' does not match selected problem ID '${problem.externalId}'.`
      }, { status: 400 });
    }

    // C. Check submission time window
    // Must be within the contest window, even if the contest is already finished.
    const startTime = contest.settings.startTime || contest.createdAt;
    const maxTime = contest.settings.durationMinutes > 0
      ? startTime + contest.settings.durationMinutes * 60 * 1000
      : Infinity;

    if (submittedAt < startTime) {
      return NextResponse.json({ error: "Submission was made before the contest started." }, { status: 400 });
    }
    if (submittedAt > maxTime) {
      return NextResponse.json({ error: "Submission was made after the contest ended." }, { status: 400 });
    }

    // D. Check verdict is accepted
    if (parsedVerdict !== "AC") {
      return NextResponse.json({ error: `Submission has not passed all tests. Current verdict: ${parsedVerdict}` }, { status: 400 });
    }

    // 7. Add submission & update state
    const newSubmission = {
      id: `ac-${submissionId}`,
      contestId: contest.id,
      oj: "atcoder" as const,
      handle: expectedHandle,
      problemId: problem.id,
      verdict: "OK" as const,
      submittedAt,
    };

    contest.submissions.push(newSubmission);
    contest.sync.lastSubmissionIds[uniqueId] = true;

    // Trigger progression checks if in Blitz mode
    if (contest.settings.mode === "blitz") {
      const currentProblem = contest.problems[contest.currentProblemIndex];
      if (currentProblem && currentProblem.id === problem.id) {
        contest.currentProblemIndex = Math.min(contest.currentProblemIndex + 1, contest.problems.length - 1);
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
    console.error("Error verifying AtCoder submission:", err);
    return NextResponse.json(
      { error: err.message || "An error occurred while verifying the submission." },
      { status: 500 }
    );
  }
}
