import { Redis } from "@upstash/redis";

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

// Local fallback for development without Redis
const _global = global as any;
if (!_global.roomsStore) {
  _global.roomsStore = new Map<string, Room>();
}
export const localRoomsStore: Map<string, Room> = _global.roomsStore;

// Upstash Redis configuration (compatible with Vercel KV)
const redisUrl = 
  process.env.KV_REST_API_URL || 
  process.env.UPSTASH_REDIS_REST_URL || 
  process.env.STORAGE_REST_API_URL ||
  process.env.STORAGE_URL;

const redisToken = 
  process.env.KV_REST_API_TOKEN || 
  process.env.UPSTASH_REDIS_REST_TOKEN || 
  process.env.STORAGE_REST_API_TOKEN ||
  process.env.STORAGE_TOKEN;

export const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

export async function getRoom(id: string): Promise<Room | null> {
  if (redis) {
    try {
      const room = await redis.get<Room>(`room:${id}`);
      return room || null;
    } catch (error) {
      console.error("REDIS GET ROOM ERROR, falling back to memory:", error);
    }
  }
  return localRoomsStore.get(id) || null;
}

export async function setRoom(id: string, room: Room): Promise<void> {
  if (redis) {
    try {
      await redis.set(`room:${id}`, room, { ex: 60 * 60 * 24 });
      return;
    } catch (error) {
      console.error("REDIS SET ROOM ERROR, falling back to memory:", error);
    }
  }
  localRoomsStore.set(id, room);
}
