import { Queue } from "bullmq";
import { newRedisClient } from "./redis.js";

export const bullRedis = newRedisClient({ maxRetriesPerRequest: null });

export const DefaultQueue = new Queue("DEFAULT", {
  connection: bullRedis,
});
