import { NextResponse } from "next/server";
import { getContest, listActiveContests, removeActiveContest, setContest } from "@/lib/contest/store";
import { syncContestSubmissions } from "@/lib/contest/sync";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ids = await listActiveContests();
  const results: Record<string, string> = {};

  for (const id of ids) {
    const contest = await getContest(id);
    if (!contest) {
      await removeActiveContest(id);
      continue;
    }

    const hasAtCoderProblems = contest.problems.some((problem) => problem.oj === "atcoder");
    if (!hasAtCoderProblems) {
      continue;
    }

    const updated = await syncContestSubmissions(contest);
    await setContest(id, updated);

    if (updated.status === "finished") {
      await removeActiveContest(id);
    }

    results[id] = "synced";
  }

  return NextResponse.json({ ok: true, results });
}