import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number): number | null {
    if (times > 10) {
      console.error("Redis: max retry attempts reached");
      return null;
    }
    return Math.min(times * 100, 3000);
  },
  lazyConnect: true,
});

redis.on("error", (error: Error) => {
  console.error("Redis connection error:", error.message);
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("close", () => {
  console.log("Redis connection closed");
});

redis.connect().catch((error: Error) => {
  console.error("Redis initial connection failed:", error.message);
});

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>,
): Promise<T> {
  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.error(`Redis cache read error for key "${key}":`, error);
  }

  const result = await fetchFn();

  try {
    await redis.set(key, JSON.stringify(result), "EX", ttlSeconds);
  } catch (error) {
    console.error(`Redis cache write error for key "${key}":`, error);
  }

  return result;
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error(`Redis cache invalidation error for pattern "${pattern}":`, error);
  }
}

export async function disconnectRedis(): Promise<void> {
  try {
    await redis.quit();
  } catch (error) {
    console.error("Redis disconnect error:", error);
  }
}
