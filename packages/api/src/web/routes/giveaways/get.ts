import { Router } from "express";
import { z } from "zod";
import { GIVEAWAY_LINK_TEMPLATE } from "../../../env.js";
import { addressFromRawBuffer } from "../../../lib/ton.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { buildTopUpLink, countParticipants, sendError } from "./_common.js";
import { NewGiveawaySchema } from "./create.js";

export const GiveawaySchema = NewGiveawaySchema.extend({
  id: z.string(),
  status: z.enum(["pending", "active", "finished"]),
  participantCount: z.number().int().nonnegative(),
});

const SuccessResponseSchema = GiveawaySchema.extend({
  giveawayLink: z.string().url(),
  topUpLink: z.string().url(),
});

export default Router().get("/giveaways/:giveawayId", async (req, res) => {
  const giveaway = await Giveaway.findOne({
    where: { id: req.params.giveawayId },
  });

  if (!giveaway) {
    return sendError(res, 404, "Giveaway not found");
  }

  return res.json(
    zodTypedParse(SuccessResponseSchema, {
      id: giveaway.id,
      type: giveaway.type,

      // NOTE: It may be such that the giveaways status
      // is still "active", but the end date has passed.
      // In that case, giveaway would deny further check-ins.
      status: giveaway.status,
      endsAt: giveaway.endsAt?.toString() ?? null,

      tokenAddress: giveaway.tokenAddress
        ? addressFromRawBuffer(giveaway.tokenAddress).toRawString()
        : null,

      amount: giveaway.amount,
      receiverCount: giveaway.receiverCount,
      taskUrl: giveaway.taskUrl ?? null,

      // NOTE: Does not include participants with "awaitingTask" status.
      participantCount: await countParticipants(giveaway.id),

      giveawayLink: GIVEAWAY_LINK_TEMPLATE.replace(":id", giveaway.id),
      topUpLink: buildTopUpLink(giveaway).toString(),
    }),
  );
});
