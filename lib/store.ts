export type Problem = {
  contestId: number;
  index: string;
  points: number;
  solvedBy?: "player1" | "player2" | null;
};

export type Player = {
  handle: string;
  score: number;
};

export type Room = {
  id: string;
  problems: Problem[];
  durationMinutes: number;
  startTime: number | null;
  player1: Player | null;
  player2: Player | null;
  currentProblemIndex: number;
  status: "waiting" | "running" | "finished";
  winner: string | null;
  nextProblemUnlockedAt?: number | null;
};
