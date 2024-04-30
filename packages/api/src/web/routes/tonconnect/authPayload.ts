import cors from "cors";
import { Router } from "express";
import { nanoid } from "nanoid";
import { redis } from "../../../lib/redis.js";
import { redisProofKey } from "./_common.js";

/** In seconds. */
const REDIS_PROOF_TTL = 60;

export default Router()
  .use(cors())
  .get("/tonconnect/auth-payload", async (req, res) => {
    const payload = nanoid();
    await redis.set(redisProofKey(payload), "1", "EX", REDIS_PROOF_TTL);
    res.send(payload);
  });
