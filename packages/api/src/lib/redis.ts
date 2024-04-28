import { Redis, RedisOptions } from "ioredis";
import { REDIS_URL } from "../env.js";

export function newRedisClient(options: RedisOptions = {}) {
  return new Redis(REDIS_URL, options);
}

export const redis = newRedisClient();
export const bullRedis = newRedisClient({ maxRetriesPerRequest: null });

// Test connection.
redis.ping().then(() => {
  console.log("Redis connection OK");
});
