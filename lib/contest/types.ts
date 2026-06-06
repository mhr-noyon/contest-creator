export type OJName = "codeforces" | "atcoder";

export type ContestMode = "blitz" | "standard";
export type ContestStatus = "waiting" | "starting" | "running" | "finished";
export type RankingType = "icpc" | "penalty" | "score" | "custom";
export type ProblemOrder = "random" | "difficulty" | "oj" | "manual";

export type ContestHandle = {
  oj: OJName;
  handle: string;
};

export type ContestProblem = {
  id: string;
  oj: OJName;
  externalId: string;
  title: string;
  url: string;
  rating?: number | null;
  tags: string[];
  order: number;
  points: number;
  visible: boolean;
};

export type ContestParticipant = {
  id: string;
  displayName: string;
  handles: ContestHandle[];
  createdAt: number;
};

export type ContestRuleConfig = {
  rankingType: RankingType;
  wrongSubmissionPenaltyMinutes: number;
  frozenScoreboardMinutes: number;
  firstSolveBonus: number;
  attemptPenalty: number;
  tieBreakers: string[];
};

export type DifficultyMode = "global" | "per-problem";

export type DifficultyRange = {
  min: number;
  max: number;
};

export type ContestDifficultyConfig = {
  mode: DifficultyMode;
  global?: DifficultyRange | null;
  perProblem?: DifficultyRange[] | null;
};

export type ContestSettings = {
  title: string;
  description?: string | null;
  durationMinutes: number;
  startTime: number | null;
  mode: ContestMode;
  numberOfProblems: number;
  difficulty: ContestDifficultyConfig;
  problemScores?: number[] | null;
  rules: ContestRuleConfig;
  order: ProblemOrder;
  showRatings: boolean;
  requirePassword: boolean;
  passwordHash?: string | null;
  passwordSalt?: string | null;
};

export type ContestSubmission = {
  id: string;
  contestId: string;
  oj: OJName;
  handle: string;
  problemId: string;
  verdict: "OK" | "WA" | "TLE" | "MLE" | "RE" | "CE" | "OTHER";
  submittedAt: number;
};

export type ContestSyncState = {
  lastSyncedAt: number;
  lastSubmissionIds: Record<string, true>;
  lastFetchedAtByHandle: Record<string, number>;
};

export type Contest = {
  id: string;
  createdAt: number;
  status: ContestStatus;
  ownerName: string;
  settings: ContestSettings;
  handles: ContestHandle[];
  participants: ContestParticipant[];
  problems: ContestProblem[];
  submissions: ContestSubmission[];
  sync: ContestSyncState;
  currentProblemIndex: number;
  nextProblemUnlockedAt: number | null;
  startRequestedAt?: number | null;
  errorMsg?: string | null;
};

export type ScoreboardProblemState = {
  solved: boolean;
  attempts: number;
  lastAttemptAt: number | null;
  solveTimeSeconds: number | null;
  firstBlood: boolean;
};

export type ScoreboardEntry = {
  participantId: string;
  displayName: string;
  solvedCount: number;
  penaltyMinutes: number;
  totalScore: number;
  problems: Record<string, ScoreboardProblemState>;
};

export type Scoreboard = {
  contestId: string;
  updatedAt: number;
  frozen: boolean;
  entries: ScoreboardEntry[];
};
