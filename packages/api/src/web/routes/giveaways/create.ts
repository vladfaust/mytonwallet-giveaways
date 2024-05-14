import bodyParser from "body-parser";
import { Router } from "express";
import { nanoid } from "nanoid";
import { Address } from "ton";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { GIVEAWAY_LINK_TEMPLATE, GIVEAWAY_SECRET } from "../../../env.js";
import { tryParseAddress } from "../../../lib/ton.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { buildTopUpLink, sendError } from "./_common.js";

export const NewGiveawaySchema = z.object({
  type: z.enum(["instant", "lottery"]),

  // NOTE: I'd like to make it `z.date()`, but Zod doesn't
  // differentiate between input & output schema types.
  endsAt: z
    .string()
    .refine((x) => new Date(x), { message: "Invalid date" })
    .nullable(),

  tokenAddress: z
    .string()
    .refine(tryParseAddress, { message: "Invalid token address." })
    .nullable(),

  amount: z.string().refine((x) => Number(x), {
    message: "Amount must be a number, e.g. 1 for 1 nanoton",
  }),

  receiverCount: z.number().int().positive(),
  taskUrl: z.string().url().nullable(),
});

const RequestBodySchema = z.object({
  giveaway: NewGiveawaySchema.refine(
    (data) => data.type === "instant" || data.endsAt,
    { message: "Lottery giveaways must have an `endsAt` date" },
  ),
  secret: z.string(),
});

const SuccessResponseSchema = z.object({
  id: z.string(),
  giveawayLink: z.string().url(),
  topUpLink: z.string().url(),
  taskToken: z.string().nullable(),
});

export default Router()
  .use(bodyParser.json())
  .post("/giveaways", async (req, res) => {
    const body = RequestBodySchema.safeParse(req.body);

    if (!body.success) {
      return sendError(res, 400, fromError(body.error).toString());
    }

    if (body.data.secret !== GIVEAWAY_SECRET) {
      return sendError(res, 400, "Invalid secret");
    }

    // ADHOC: Validate the number here instead of in the schema
    // due to Zod's limitations (can be mitigated).
    try {
      BigInt(body.data.giveaway.amount);
    } catch (e) {
      console.warn(`${body.data.giveaway.amount} is not a valid bigint number`);
      return sendError(res, 400, "Amount must be a valid bigint number");
    }

    const giveaway = await Giveaway.create({
      ...body.data.giveaway,
      tokenAddress: body.data.giveaway.tokenAddress
        ? Address.parse(body.data.giveaway.tokenAddress).toRaw()
        : undefined,
      endsAt: body.data.giveaway.endsAt
        ? new Date(body.data.giveaway.endsAt)
        : undefined,
      amount: body.data.giveaway.amount,
      taskToken: body.data.giveaway.taskUrl ? nanoid() : undefined,
    });

    return res.json(
      zodTypedParse(SuccessResponseSchema, {
        id: giveaway.id,
        giveawayLink: GIVEAWAY_LINK_TEMPLATE.replace(":id", giveaway.id),
        topUpLink: buildTopUpLink(giveaway).toString(),
        taskToken: giveaway.taskToken,
      }),
    );
  });
