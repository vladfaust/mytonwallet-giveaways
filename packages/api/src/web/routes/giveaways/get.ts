import { Router } from "express";
import { fromNano } from "ton";
import { z } from "zod";
import { GIVEAWAY_LINK_TEMPLATE } from "../../../env.js";
import { sequelize } from "../../../lib/sequelize.js";
import { bounceable, contract, testOnly } from "../../../lib/ton.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { Participant } from "../../../models/participant.js";
import { GiveawaySchema, sendError } from "./_common.js";

const SuccessResponseSchema = GiveawaySchema.extend({
  giveawayLink: z.string().url(),
  topUpLink: z.string().url(),
});

export default Router().get("/giveaways/:giveawayId", async (req, res) => {
  const giveaway = await Giveaway.findOne({
    where: {
      id: req.params.giveawayId,
    },

    include: [
      {
        model: Participant,
        attributes: [],
      },
    ],

    attributes: [
      "id",
      "type",
      "tokenAddress",
      "amount",
      "receiverCount",
      "status",
      [
        sequelize.fn("COUNT", sequelize.col("Participants.id")),
        "n_participants",
      ],
    ],

    group: "Giveaway.id",
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
      participantCount: parseInt(giveaway.get("n_participants") as string),
      giveawayLink: GIVEAWAY_LINK_TEMPLATE.replace(":id", giveaway.id),
      topUpLink: `ton://transfer/${contract.address.toString({ testOnly, bounceable })}?token=${giveaway.tokenAddress}&amount=${giveaway.amount * BigInt(giveaway.receiverCount)}&comment=${giveaway.id}`,
    }),
  );
});
