import bodyParser from "body-parser";
import cors from "cors";
import { Router } from "express";
import * as jose from "jose";
import { Address } from "ton";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { JWT_SECRET } from "../../../env.js";
import { redis } from "../../../lib/redis.js";
import { verifySignature } from "../../../lib/ton.js";
import { redisProofKey } from "./_common.js";

const ProofSchema = z.object({
  domain: z.object({
    lengthBytes: z.number().int().positive(),
    value: z.string(),
  }),
  payload: z.string(),
  signature: z.string(),
  timestamp: z.number().int().positive(),
});

const RequestBodySchema = z.object({
  address: z.string(),
  chain: z.number().int(),
  publicKey: z.string(),
  tonProof: ProofSchema,
});

export default Router()
  .use(cors())
  .use(bodyParser.json())
  .post("/tonconnect/proof", async (req, res) => {
    const body = RequestBodySchema.safeParse(req.body);
    if (!body.success) {
      return res
        .status(400)
        .json({ error: fromZodError(body.error).toString() });
    }

    const redisProof = await redis.get(
      redisProofKey(body.data.tonProof.payload),
    );

    if (!redisProof) {
      return res.status(400).json({ error: "Invalid payload" });
    }

    const address = Address.parse(body.data.address);
    const publicKey = Buffer.from(body.data.publicKey, "hex");
    const signature = Buffer.from(body.data.tonProof.signature, "base64");

    if (
      !(await verifySignature(
        publicKey,
        {
          address: address.hash,
          domain: body.data.tonProof.domain,
          payload: body.data.tonProof.payload,
          timestamp: body.data.tonProof.timestamp,
          workchain: address.workChain,
        },
        signature,
      ))
    ) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const jwt = await new jose.SignJWT({
      address: body.data.address,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .sign(JWT_SECRET);

    return res.json({ jwt });
  });
