import { getProvider } from "@/lib/contest/providers";
import { ContestProblem, ContestSettings, ContestHandle, DifficultyRange, OJName } from "@/lib/contest/types";
import { clamp } from "@/lib/contest/utils";

const DEFAULT_POINTS = 0;

function normalizeRange(range: DifficultyRange): DifficultyRange {
  return {
    min: Math.max(0, Math.floor(range.min)),
    max: Math.max(0, Math.floor(range.max)),
  };
}

function pickRange(settings: ContestSettings, index: number): DifficultyRange {
  if (settings.difficulty.mode === "per-problem" && settings.difficulty.perProblem) {
    const range = settings.difficulty.perProblem[index] || settings.difficulty.perProblem[0];
    if (range) return normalizeRange(range);
  }
  const fallback = settings.difficulty.global || { min: 800, max: 2000 };
  return normalizeRange(fallback);
}

function buildProblemId(oj: OJName, externalId: string): string {
  return `${oj}:${externalId}`;
}

function shuffle<T>(items: T[]): T[] {
  return items
    .map((value) => ({ value, rand: Math.random() }))
    .sort((a, b) => a.rand - b.rand)
    .map(({ value }) => value);
}

function evenPick<T>(items: T[], count: number): T[] {
  if (items.length <= count) return items.slice();
  const step = items.length / count;
  const picked: T[] = [];
  for (let i = 0; i < count; i += 1) {
    const index = Math.min(items.length - 1, Math.floor(i * step));
    picked.push(items[index]);
  }
  return picked;
}

function buildScoreList(settings: ContestSettings, count: number): number[] {
  const scores = Array.isArray(settings.problemScores) ? settings.problemScores.slice(0, count) : [];
  while (scores.length < count) scores.push(DEFAULT_POINTS);
  return scores.map((score) => (Number.isFinite(score) ? score : DEFAULT_POINTS));
}

export async function generateProblemSet({
  settings,
  handles,
  onProgress,
}: {
  settings: ContestSettings;
  handles: ContestHandle[];
  onProgress?: (problemsGeneratedCount: number) => Promise<void>;
}): Promise<ContestProblem[]> {
  const ojs = Array.from(new Set(handles.map((h) => h.oj)));

  const attemptedByOj: Record<string, Set<string>> = {};

  for (const oj of ojs) {
    const provider = getProvider(oj);
    const handleMap = new Map<string, string>();
    handles
      .filter((h) => h.oj === oj)
      .forEach((handle) => {
        const key = handle.handle.toLowerCase();
        if (!handleMap.has(key)) handleMap.set(key, handle.handle);
      });
    const ojHandles = Array.from(handleMap.values());

    attemptedByOj[oj] = new Set<string>();

    await Promise.all(
      ojHandles.map(async (handle) => {
        try {
          const submissions = await provider.fetchRecentSubmissions(handle, undefined, 10000);
          submissions.forEach((submission) => {
            attemptedByOj[oj].add(submission.problemId.toLowerCase());
          });
        } catch (err) {
          console.warn(`Failed to fetch submissions for ${oj} handle ${handle}:`, err);
        }
      })
    );
  }

  const poolCache: Record<string, Record<string, any[]>> = {
    codeforces: {},
    atcoder: {},
  };

  async function getCachedPool(oj: OJName, range: DifficultyRange) {
    const key = `${range.min}-${range.max}`;
    if (poolCache[oj][key]) {
      return poolCache[oj][key];
    }
    const provider = getProvider(oj);
    const pool = await provider.fetchProblems({
      minRating: range.min,
      maxRating: range.max,
      count: 200,
    });
    poolCache[oj][key] = pool;
    return pool;
  }

  const chosenProblems: any[] = [];
  const chosenProblemIds = new Set<string>();
  const totalCount = clamp(settings.numberOfProblems, 1, 20);

  if (onProgress) {
    await onProgress(0);
  }

  for (let attempt = 0; attempt < 15; attempt++) {
    const needed = totalCount - chosenProblems.length;
    if (needed <= 0) break;

    const currentIterationCandidates: any[] = [];
    const currentIterationCandidateKeys = new Set<string>();

    for (let i = chosenProblems.length; i < totalCount; i++) {
      const range = pickRange(settings, i);

      if (ojs.length === 2) {
        // Fetch 1 CF and 1 AC
        for (const oj of ojs) {
          try {
            const pool = await getCachedPool(oj, range);
            const available = pool.filter((p) => {
              const key = `${oj}:${p.id}`;
              return !chosenProblemIds.has(key) && !currentIterationCandidateKeys.has(key);
            });
            if (available.length > 0) {
              const p = evenPick(shuffle(available), 1)[0];
              currentIterationCandidates.push({ ...p, oj });
              currentIterationCandidateKeys.add(`${oj}:${p.id}`);
            }
          } catch (err) {
            console.warn(`Failed to fetch candidates from ${oj}:`, err);
          }
        }
      } else if (ojs.length === 1) {
        // Fetch 2 from the single selected judge
        const oj = ojs[0];
        try {
          const pool = await getCachedPool(oj, range);
          const available = pool.filter((p) => {
            const key = `${oj}:${p.id}`;
            return !chosenProblemIds.has(key) && !currentIterationCandidateKeys.has(key);
          });
          if (available.length > 0) {
            const selected = evenPick(shuffle(available), Math.min(2, available.length));
            selected.forEach((p) => {
              currentIterationCandidates.push({ ...p, oj });
              currentIterationCandidateKeys.add(`${oj}:${p.id}`);
            });
          }
        } catch (err) {
          console.warn(`Failed to fetch candidates from ${oj}:`, err);
        }
      }
    }

    const shuffledCandidates = shuffle(currentIterationCandidates);

    for (const candidate of shuffledCandidates) {
      if (chosenProblems.length >= totalCount) break;

      const key = `${candidate.oj}:${candidate.id}`;
      if (chosenProblemIds.has(key)) continue;

      const hasSubmission = attemptedByOj[candidate.oj]?.has(candidate.id.toLowerCase());
      if (!hasSubmission) {
        chosenProblems.push(candidate);
        chosenProblemIds.add(key);

        if (onProgress) {
          await onProgress(chosenProblems.length);
        }
      }
    }

    if (chosenProblems.length === totalCount) break;
  }

  if (chosenProblems.length < totalCount) {
    throw new Error(`No available problems found within this settings.`);
  }

  const problems: ContestProblem[] = chosenProblems.map((selectedProblem, i) => {
    const externalId = selectedProblem.id;
    const problemId = `${selectedProblem.oj}:${externalId}`;
    return {
      id: problemId,
      oj: selectedProblem.oj,
      externalId,
      title: selectedProblem.title,
      url: selectedProblem.url,
      rating: selectedProblem.rating ?? null,
      tags: selectedProblem.tags || [],
      order: i,
      points: DEFAULT_POINTS,
      visible: settings.mode === "standard" || i === 0,
    };
  });

  const isScoreBased = settings.rules.rankingType === "score";
  const scoreList = buildScoreList(settings, totalCount);

  if (isScoreBased && settings.difficulty.mode === "global") {
    const sortedScores = [...scoreList].sort((a, b) => a - b);
    const sortedProblems = [...problems].sort((a, b) => (a.rating || 0) - (b.rating || 0));
    sortedProblems.forEach((problem, index) => {
      problem.points = sortedScores[index] ?? DEFAULT_POINTS;
    });
  } else if (isScoreBased) {
    problems.forEach((problem, index) => {
      problem.points = scoreList[index] ?? DEFAULT_POINTS;
    });
  }

  if (isScoreBased && settings.difficulty.mode === "per-problem") {
    if (settings.order === "random") {
      problems.sort(() => 0.5 - Math.random());
    }
  } else if (settings.order === "difficulty") {
    problems.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  } else if (settings.order === "oj") {
    problems.sort((a, b) => a.oj.localeCompare(b.oj));
  } else if (settings.order === "random") {
    problems.sort(() => 0.5 - Math.random());
  }

  return problems.map((problem, index) => ({
    ...problem,
    order: index,
    visible: settings.mode === "standard" || index === 0,
  }));
}
