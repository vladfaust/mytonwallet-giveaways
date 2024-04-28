import bodyParser from "body-parser";
import { Router } from "express";
import { z } from "zod";
import {
  NewGiveawaySchema,
  SuccessResponseSchema as SuccessResponseSchemaBase,
} from "./_common.js";

const RequestBodySchema = z.object({
  captchaToken: z.string(),
  receiverAddress: z.string(),
  publicKey: z.string(),
  signedProof: z.string(),
});

const SuccessResponseSchema = SuccessResponseSchemaBase.extend({
  giveaway: NewGiveawaySchema,
});

export default Router()
  .use(bodyParser.json())
  .post("/giveaways/:giveawayId/checkin", (req, res) => {});
