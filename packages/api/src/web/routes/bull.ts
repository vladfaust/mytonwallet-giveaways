import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import { DefaultQueue } from "../../lib/bullmq.js";

export const BASE_PATH = "/bull";

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(BASE_PATH);

createBullBoard({
  queues: [new BullMQAdapter(DefaultQueue)],
  serverAdapter,
});

export const router = serverAdapter.getRouter();
