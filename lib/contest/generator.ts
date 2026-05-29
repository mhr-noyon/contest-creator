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
}: {
  settings: ContestSettings;
  handles: ContestHandle[];
}): Promise<ContestProblem[]> {
  const ojs = Array.from(new Set(handles.map((h) => h.oj)));

  const solvedByOj: Record<string, Set<string>> = {};

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

    solvedByOj[oj] = new Set<string>();

    await Promise.all(
      ojHandles.map(async (handle) => {
        try {
          const submissions = await provider.fetchRecentSubmissions(handle);
          submissions.forEach((submission) => {
            if (submission.verdict === "OK") {
              solvedByOj[oj].add(submission.problemId);
            }
          });
        } catch (err) {
          console.warn(`Failed to fetch submissions for ${oj} handle ${handle}:`, err);
        }
      })
    );
  }

  const problems: ContestProblem[] = [];
  const totalCount = clamp(settings.numberOfProblems, 1, 20);

  for (let i = 0; i < totalCount; i += 1) {
    const range = pickRange(settings, i);
    
    const preferredOjs: OJName[] = [];
    const startIndex = i % ojs.length;
    for (let k = 0; k < ojs.length; k += 1) {
      preferredOjs.push(ojs[(startIndex + k) % ojs.length]);
    }

    let selectedProblem = null;
    let selectedOj: OJName | null = null;

    for (const oj of preferredOjs) {
      try {
        const provider = getProvider(oj);
        const pool = await provider.fetchProblems({
          minRating: range.min,
          maxRating: range.max,
          count: 200,
        });

        const filtered = pool.filter(
          (problem) =>
            !solvedByOj[oj]?.has(problem.id) &&
            !problems.some((p) => p.id === buildProblemId(oj, problem.id))
        );

        if (filtered.length > 0) {
          selectedProblem = evenPick(shuffle(filtered), 1)[0];
          selectedOj = oj;
          break;
        }
      } catch (err) {
        console.warn(`Failed to fetch problems from ${oj}:`, err);
      }
    }

    if (!selectedProblem || !selectedOj) {
      throw new Error(
        `No available problems found across selected judges (${ojs.join(", ")}) in rating range ${range.min}-${range.max}`
      );
    }

    const externalId = selectedProblem.id;
    const problemId = buildProblemId(selectedOj, externalId);

    problems.push({
      id: problemId,
      oj: selectedOj,
      externalId,
      title: selectedProblem.title,
      url: selectedProblem.url,
      rating: selectedProblem.rating ?? null,
      tags: selectedProblem.tags || [],
      order: i,
      points: DEFAULT_POINTS,
      visible: settings.mode === "standard" || i === 0,
    });
  }

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
