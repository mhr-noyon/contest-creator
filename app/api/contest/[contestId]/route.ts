import { NextResponse } from "next/server";
import { getContest, setContest } from "@/lib/contest/store";
import { hashPassword } from "@/lib/contest/utils";
import { Contest, ContestHandle, ContestParticipant } from "@/lib/contest/types";
import { generateProblemSet } from "@/lib/contest/generator";
import { getProvider } from "@/lib/contest/providers";

function normalizeHandles(input: any): ContestHandle[] {
  if (!Array.isArray(input)) return [];
  const result: ContestHandle[] = [];
  for (const item of input) {
    if (!item?.oj) continue;
    if (typeof item.handle === "string" && item.handle.trim()) {
      result.push({ oj: item.oj as any, handle: item.handle.trim() });
    } else if (Array.isArray(item.handles)) {
      for (const h of item.handles) {
        if (typeof h === "string" && h.trim()) {
          result.push({ oj: item.oj as any, handle: h.trim() });
        }
      }
    }
  }
  return result;
}

function createParticipant(displayName: string, handles: ContestHandle[]): ContestParticipant {
  return {
    id: `p-${displayName.toLowerCase().replace(/\s+/g, "-")}-${Date.now().toString(36)}`,
    displayName,
    handles,
    createdAt: Date.now(),
  };
}

function scrubContest(contest: Contest) {
  return {
    ...contest,
    settings: {
      ...contest.settings,
      passwordHash: null,
      passwordSalt: null,
    },
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const { contestId } = await params;
  const contest = await getContest(contestId);

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  return NextResponse.json({ contest: scrubContest(contest) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  const { contestId } = await params;
  const contest = await getContest(contestId);

  if (!contest) {
    return NextResponse.json({ error: "Contest not found" }, { status: 404 });
  }

  const payload = await request.json();

  if (payload?.action === "verify") {
    if (!contest.settings.requirePassword) {
      return NextResponse.json({ authorized: true });
    }

    const salt = contest.settings.passwordSalt || "";
    const hash = hashPassword(String(payload.password || ""), salt);

    if (hash !== contest.settings.passwordHash) {
      return NextResponse.json({ authorized: false }, { status: 401 });
    }

    return NextResponse.json({ authorized: true });
  }

  if (payload?.action === "join") {
    const displayName = String(payload?.displayName || "").trim();
    const handles = normalizeHandles(payload?.handles);

    if (!displayName) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    const requiredOjs = Array.from(new Set(contest.handles.map((handle) => handle.oj)));
    const missing = requiredOjs.filter((oj) => !handles.some((handle) => handle.oj === oj));

    if (missing.length > 0) {
      return NextResponse.json({ error: "Handles for all contest judges are required." }, { status: 400 });
    }

    // Check if any of the handles are already taken by another participant or the host
    for (const h of handles) {
      const isHost = displayName.toLowerCase() === contest.ownerName.toLowerCase();
      if (!isHost) {
        const hostHasIt = contest.handles.some(
          (hostH) => hostH.oj === h.oj && hostH.handle.toLowerCase() === h.handle.toLowerCase()
        );
        if (hostHasIt) {
          return NextResponse.json(
            { error: `Handle "${h.handle}" on ${h.oj} is already taken by the host.` },
            { status: 400 }
          );
        }
      }

      for (const p of contest.participants) {
        if (p.displayName.toLowerCase() === displayName.toLowerCase()) {
          continue;
        }
        const someoneHasIt = p.handles.some(
          (otherH) => otherH.oj === h.oj && otherH.handle.toLowerCase() === h.handle.toLowerCase()
        );
        if (someoneHasIt) {
          return NextResponse.json(
            { error: `Handle "${h.handle}" on ${h.oj} is already taken by another participant (${p.displayName}).` },
            { status: 400 }
          );
        }
      }
    }

    // Verify participant handles on their respective OJs
    const verificationResults = await Promise.all(
      handles.map(async (h) => {
        const provider = getProvider(h.oj);
        const exists = await provider.verifyHandle(h.handle);
        return { handle: h.handle, oj: h.oj, exists };
      })
    );

    const invalid = verificationResults.find((r) => !r.exists);
    if (invalid) {
      return NextResponse.json(
        { error: `Handle "${invalid.handle}" not found on ${invalid.oj}. Please check and try again.` },
        { status: 400 }
      );
    }

    const existing = contest.participants.find(
      (participant) => participant.displayName.toLowerCase() === displayName.toLowerCase()
    );

    if (existing) {
      existing.handles = handles;
    } else {
      contest.participants.push(createParticipant(displayName, handles));
    }

    await setContest(contestId, contest);
    return NextResponse.json({ contest: scrubContest(contest) });
  }

  if (payload?.action === "reset_starting") {
    if (contest.status === "starting") {
      contest.status = "waiting";
      contest.errorMsg = "Problems not found within this settings.";
      await setContest(contestId, contest);
    }
    return NextResponse.json({ contest: scrubContest(contest) });
  }

  if (payload?.action === "start" && contest.status === "waiting") {
    if (contest.participants.length === 0) {
      return NextResponse.json({ error: "At least one participant is required." }, { status: 400 });
    }

    contest.status = "starting";
    contest.startRequestedAt = Date.now();
    contest.errorMsg = null;
    contest.problemsGeneratedCount = 0;
    await setContest(contestId, contest);

    try {
      const participantHandles = contest.participants.flatMap((participant) => participant.handles);
      const allHandles = [...contest.handles, ...participantHandles];

      const problems = await generateProblemSet({
        settings: contest.settings,
        handles: allHandles,
        onProgress: async (count) => {
          const current = await getContest(contestId);
          if (current && current.status === "starting") {
            current.problemsGeneratedCount = count;
            await setContest(contestId, current);
          }
        },
      });

      const current = await getContest(contestId);
      if (current && current.status === "starting") {
        current.problems = problems;
        current.status = "running";
        current.settings.startTime = Date.now() + 3000;
        current.currentProblemIndex = 0;
        current.nextProblemUnlockedAt = null;
        current.errorMsg = null;
        current.problemsGeneratedCount = problems.length;
        await setContest(contestId, current);
        // Use the updated contest object for the response
        contest.problems = current.problems;
        contest.status = current.status;
        contest.settings = current.settings;
        contest.currentProblemIndex = current.currentProblemIndex;
        contest.nextProblemUnlockedAt = current.nextProblemUnlockedAt;
        contest.errorMsg = current.errorMsg;
        contest.problemsGeneratedCount = current.problemsGeneratedCount;
      }
    } catch (err: any) {
      console.error("Error generating problem set:", err);
      const current = await getContest(contestId);
      if (current && current.status === "starting") {
        current.status = "waiting";
        current.errorMsg = err.message || "Problems not found within this settings.";
        await setContest(contestId, current);
        contest.status = current.status;
        contest.errorMsg = current.errorMsg;
      }
    }

    return NextResponse.json({ contest: scrubContest(contest) });
  }

  return NextResponse.json({ contest: scrubContest(contest) });
}
