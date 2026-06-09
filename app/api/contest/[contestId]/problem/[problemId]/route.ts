import { NextResponse } from "next/server";
import { getContest } from "@/lib/contest/store";
import { getOrScrapeProblemStatement } from "@/lib/contest/problems";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string; problemId: string }> }
) {
  const { contestId, problemId } = await params;

  try {
    const contest = await getContest(contestId);
    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    // Find the problem in the contest
    // Since problemId might be prefixed with "atcoder:" or "codeforces:" or be the raw externalId, let's check both
    const problem = contest.problems.find(
      (p) => p.id === problemId || p.externalId === problemId || `${p.oj}:${p.externalId}` === problemId
    );

    if (!problem) {
      return NextResponse.json({ error: "Problem not found in this contest" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const clear = searchParams.get("clear") === "true";

    // Call our scraper utility
    const html = await getOrScrapeProblemStatement(problem.oj, problem.externalId, clear);

    return NextResponse.json({
      problemId: problem.id,
      title: problem.title,
      oj: problem.oj,
      externalId: problem.externalId,
      rating: problem.rating,
      points: problem.points,
      url: problem.url,
      html,
    });
  } catch (err: any) {
    console.error(`Error loading problem ${problemId} for contest ${contestId}:`, err);
    return NextResponse.json(
      { error: err.message || "Failed to load problem statement" },
      { status: 500 }
    );
  }
}
