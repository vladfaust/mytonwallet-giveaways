import { Worker } from "bullmq";
import { Lottery } from "./jobs/lottery.js";
import { Payout } from "./jobs/payout.js";
import { SyncBlockchain } from "./jobs/syncBlockchain.js";
import { DefaultQueue } from "./lib/bullmq.js";
import { bullRedis } from "./lib/redis.js";

new Worker(
  DefaultQueue.name,
  async (job) => {
    switch (job.name) {
      case SyncBlockchain.name:
        return await SyncBlockchain.perform(job);
      case Payout.name:
        return await Payout.perform(job);
      case Lottery.name:
        return await Lottery.perform(job);

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

// Repeat `Payout` every 5 minutes.
await DefaultQueue.add(
  Payout.name,
  {},
  {
    repeat: {
      pattern: "0 */5 * * * *",
    },
  },
);

// Repeat `Lottery` every 5 minutes.
await DefaultQueue.add(
  Lottery.name,
  {},
  {
    repeat: {
      pattern: "0 */5 * * * *",
    },
  },
);
