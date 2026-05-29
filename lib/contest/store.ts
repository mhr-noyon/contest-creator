import { redis } from "@/lib/store";
import { Contest } from "@/lib/contest/types";

const _global = global as typeof globalThis & {
  contestStore?: Map<string, Contest>;
  contestActiveSet?: Set<string>;
};

if (!_global.contestStore) {
  _global.contestStore = new Map<string, Contest>();
}

if (!_global.contestActiveSet) {
  _global.contestActiveSet = new Set<string>();
}

const localContestStore = _global.contestStore;
const localActiveSet = _global.contestActiveSet;

const CONTEST_TTL_SECONDS = 60 * 60 * 24;

export async function getContest(id: string): Promise<Contest | null> {
  if (redis) {
    try {
      const contest = await redis.get<Contest>(`contest:${id}`);
      return contest || null;
    } catch (error) {
      console.error("REDIS GET CONTEST ERROR, falling back to memory:", error);
    }
  }
  return localContestStore.get(id) || null;
}

export async function setContest(id: string, contest: Contest): Promise<void> {
  if (redis) {
    try {
      await redis.set(`contest:${id}`, contest, { ex: CONTEST_TTL_SECONDS });
      await redis.sadd("contest:active", id);
      await redis.expire("contest:active", CONTEST_TTL_SECONDS);
      return;
    } catch (error) {
      console.error("REDIS SET CONTEST ERROR, falling back to memory:", error);
    }
  }
  localContestStore.set(id, contest);
  localActiveSet.add(id);
}

export async function listActiveContests(): Promise<string[]> {
  if (redis) {
    try {
      const ids = await redis.smembers("contest:active");
      return (ids || []).filter(Boolean);
    } catch (error) {
      console.error("REDIS LIST ACTIVE CONTESTS ERROR, falling back to memory:", error);
    }
  }
  return Array.from(localActiveSet);
}

export async function removeActiveContest(id: string): Promise<void> {
  if (redis) {
    try {
      await redis.srem("contest:active", id);
      return;
    } catch (error) {
      console.error("REDIS REMOVE ACTIVE CONTEST ERROR, falling back to memory:", error);
    }
  }
  localActiveSet.delete(id);
}
