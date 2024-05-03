import { Router } from "express";
import { fromNano } from "ton";
import { z } from "zod";
import { GIVEAWAY_LINK_TEMPLATE } from "../../../env.js";
import { bounceable, contract, testOnly } from "../../../lib/ton.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { countParticipants, sendError } from "./_common.js";
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
      status: giveaway.status,
      endsAt: giveaway.endsAt?.toString() ?? null,
      tokenAddress: giveaway.tokenAddress ?? null,
      amount: fromNano(giveaway.amount),
      receiverCount: giveaway.receiverCount,
      taskUrl: giveaway.taskUrl ?? null,
      participantCount: await countParticipants(giveaway.id),
      giveawayLink: GIVEAWAY_LINK_TEMPLATE.replace(":id", giveaway.id),
      topUpLink: `ton://transfer/${contract.address.toString({ testOnly, bounceable })}?token=${giveaway.tokenAddress}&amount=${BigInt(giveaway.amount) * BigInt(giveaway.receiverCount)}&text=${giveaway.id}`,
    }),
  );
});
