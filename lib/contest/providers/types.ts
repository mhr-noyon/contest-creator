import { ContestSubmission, OJName } from "@/lib/contest/types";

export type ProblemFilter = {
  minRating: number;
  maxRating: number;
  count: number;
  tags?: string[];
};

export type OJProblem = {
  id: string;
  title: string;
  url: string;
  rating?: number | null;
  tags: string[];
  oj: OJName;
};

export type OJProviderInterface = {
  name: OJName;
  fetchProblems(filter: ProblemFilter): Promise<OJProblem[]>;
  fetchRecentSubmissions(handle: string, sinceEpochSeconds?: number): Promise<ContestSubmission[]>;
  verifyHandle(handle: string): Promise<boolean>;
};
