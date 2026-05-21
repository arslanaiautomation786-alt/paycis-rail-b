import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config(); // Load env FIRST before creating client

const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 500, 2000);
  },
  lazyConnect: true,
});

redis.on("error", (err) => {
  console.error("[Redis] Error:", err.message);
});

const TTL_SECONDS = 86400;

export async function checkDuplicate(token: string): Promise<boolean> {
  const exists = await redis.get(`mint:${token}`);
  return exists !== null;
}

export async function registerToken(token: string, status: string): Promise<void> {
  await redis.set(`mint:${token}`, status, "EX", TTL_SECONDS);
}

export async function updateTokenStatus(token: string, status: string): Promise<void> {
  await redis.set(`mint:${token}`, status, "EX", TTL_SECONDS);
}

export async function getTokenStatus(token: string): Promise<string | null> {
  return redis.get(`mint:${token}`);
}

export default redis;