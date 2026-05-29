import { NextResponse } from "next/server";
import { listActiveContests, getContest } from "@/lib/contest/store";

export async function GET() {
  try {
    const ids = await listActiveContests();
    const contests = await Promise.all(ids.map((id) => getContest(id)));
    const validContests = contests.filter((c) => c !== null);
    
    // Sort contests by active status (waiting/starting/running first, finished last)
    // then by createdAt timestamp descending.
    validContests.sort((a, b) => {
      const aFinished = a.status === "finished";
      const bFinished = b.status === "finished";
      if (aFinished !== bFinished) {
        return aFinished ? 1 : -1;
      }
      return b.createdAt - a.createdAt;
    });

    return NextResponse.json({ contests: validContests });
  } catch (error: any) {
    console.error("Failed to list contests:", error);
    return NextResponse.json({ error: "Failed to list contests" }, { status: 500 });
  }
}
