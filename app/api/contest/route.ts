import { NextResponse } from "next/server";
import { Contest, ContestHandle, ContestSettings } from "@/lib/contest/types";
import { generateContestId, createSalt, hashPassword } from "@/lib/contest/utils";
import { getContest, setContest } from "@/lib/contest/store";
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

function normalizeSettings(input: any): ContestSettings {
  const rules = {
    rankingType: input?.rules?.rankingType || "icpc",
    wrongSubmissionPenaltyMinutes: Number(input?.rules?.wrongSubmissionPenaltyMinutes || 20),
    frozenScoreboardMinutes: Number(input?.rules?.frozenScoreboardMinutes || 0),
    firstSolveBonus: Number(input?.rules?.firstSolveBonus || 0),
    attemptPenalty: Number(input?.rules?.attemptPenalty || 0),
    tieBreakers: Array.isArray(input?.rules?.tieBreakers) ? input.rules.tieBreakers : [],
  };

  return {
    title: String(input?.title || "Custom Virtual Contest").trim(),
    description: String(input?.description || "").trim(),
    durationMinutes: Number(input?.durationMinutes || 120),
    startTime: null,
    mode: input?.mode === "blitz" ? "blitz" : "standard",
    numberOfProblems: Number(input?.numberOfProblems || 5),
    difficulty: {
      mode: input?.difficulty?.mode === "per-problem" ? "per-problem" : "global",
      global: input?.difficulty?.global || { min: 800, max: 1600 },
      perProblem: Array.isArray(input?.difficulty?.perProblem) ? input.difficulty.perProblem : null,
    },
    problemScores: Array.isArray(input?.problemScores) ? input.problemScores : null,
    rules,
    order: input?.order || "random",
    showRatings: Boolean(input?.showRatings ?? false),
    requirePassword: Boolean(input?.requirePassword ?? false),
    passwordHash: null,
    passwordSalt: null,
  };
}

async function createUniqueContestId(): Promise<string> {
  for (let i = 0; i < 10; i += 1) {
    const id = generateContestId();
    const existing = await getContest(id);
    if (!existing) return id;
  }
  throw new Error("Unable to allocate contest id");
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const handles = normalizeHandles(payload?.handles);
    const settings = normalizeSettings(payload?.settings);
    const ownerName = String(payload?.ownerName || "Host").trim();

    if (handles.length === 0) {
      return NextResponse.json({ error: "At least one handle is required." }, { status: 400 });
    }

    // Verify host handles on their respective OJs
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

    const contestId = await createUniqueContestId();

    if (settings.requirePassword && payload?.password) {
      const salt = createSalt();
      settings.passwordSalt = salt;
      settings.passwordHash = hashPassword(String(payload.password), salt);
    }

    const contest: Contest = {
      id: contestId,
      createdAt: Date.now(),
      status: "waiting",
      ownerName,
      settings,
      handles,
      participants: [
        {
          id: `p-owner-${Date.now().toString(36)}`,
          displayName: ownerName,
          handles: handles,
          createdAt: Date.now(),
        }
      ],
      problems: [],
      submissions: [],
      sync: {
        lastSyncedAt: 0,
        lastSubmissionIds: {},
        lastFetchedAtByHandle: {},
      },
      currentProblemIndex: 0,
      nextProblemUnlockedAt: null,
    };

    await setContest(contestId, contest);

    return NextResponse.json({ contestId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create contest" }, { status: 500 });
  }
}
