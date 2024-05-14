import { Worker } from "bullmq";
import { JOB_LOTTERY_CRON, JOB_PAYOUT_CRON, JOB_SYNC_CRON } from "./env.js";
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

console.log(`Setting SyncBlockchain cron to ${JOB_SYNC_CRON}`);
await DefaultQueue.add(
  SyncBlockchain.name,
  {},
  {
    repeat: {
      pattern: JOB_SYNC_CRON,
    },
  },
);

console.log(`Setting Payout cron to ${JOB_PAYOUT_CRON}`);
await DefaultQueue.add(
  Payout.name,
  {},
  {
    repeat: {
      pattern: JOB_PAYOUT_CRON,
    },
  },
);

console.log(`Setting Lottery cron to ${JOB_LOTTERY_CRON}`);
await DefaultQueue.add(
  Lottery.name,
  {},
  {
    repeat: {
      pattern: JOB_LOTTERY_CRON,
    },
  },
);
