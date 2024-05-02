import { Router } from "express";
import { fromNano } from "ton";
import { z } from "zod";
import { GIVEAWAY_LINK_TEMPLATE } from "../../../env.js";
import { bounceable, contract, testOnly } from "../../../lib/ton.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { GiveawaySchema, countParticipants, sendError } from "./_common.js";

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
      endsAt: giveaway.endsAt ?? null,
      tokenAddress: giveaway.tokenAddress ?? null,
      amount: fromNano(giveaway.amount),
      receiverCount: giveaway.receiverCount,
      taskUrl: giveaway.taskUrl ?? null,
      participantCount: await countParticipants(giveaway.id),
      giveawayLink: GIVEAWAY_LINK_TEMPLATE.replace(":id", giveaway.id),
      topUpLink: `ton://transfer/${contract.address.toString({ testOnly, bounceable })}?token=${giveaway.tokenAddress}&amount=${giveaway.amount * BigInt(giveaway.receiverCount)}&comment=${giveaway.id}`,
    }),
  );
});
