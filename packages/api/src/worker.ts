import { Worker } from "bullmq";
import { SyncBlockchain } from "./jobs/syncBlockchain.js";
import { DefaultQueue } from "./lib/bullmq.js";
import { bullRedis } from "./lib/redis.js";

new Worker(
  DefaultQueue.name,
  async (job) => {
    switch (job.name) {
      case SyncBlockchain.name:
        return await SyncBlockchain.perform(job);

      default: {
        throw new Error(`Unknown job name "${job.name}"`);
      }
    }
  },
  {
    connection: bullRedis,
  },
);

// Repeat `SyncBlockchain` every 5 minutes.
await DefaultQueue.add(
  SyncBlockchain.name,
  {},
  {
    repeat: {
      pattern: "0 */5 * * * *",
    },
  },
);
