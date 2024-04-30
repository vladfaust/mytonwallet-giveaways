import bodyParser from "body-parser";
import decimal from "decimal.js-light";
import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { GIVEAWAY_LINK_TEMPLATE, MAIN_ADDRESS, SECRET } from "../../../env.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { NewGiveawaySchema, sendError } from "./_common.js";
const { Decimal } = decimal;

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

    if (body.data.secret !== SECRET) {
      return sendError(res, 400, "Invalid secret");
    }

    const giveaway = await Giveaway.create({
      ...body.data.giveaway,
      taskToken: body.data.giveaway.taskUrl ? nanoid() : undefined,
    });

    return res.json(
      zodTypedParse(SuccessResponseSchema, {
        id: giveaway.id,
        giveawayLink: GIVEAWAY_LINK_TEMPLATE.replace(":id", giveaway.id),
        topUpLink: `ton://transfer/${MAIN_ADDRESS}?token=${giveaway.tokenAddress}&amount=${new Decimal(giveaway.amount).mul(giveaway.receiverCount)}&comment=${giveaway.id}`,
        taskToken: giveaway.taskToken,
      }),
    );
  });