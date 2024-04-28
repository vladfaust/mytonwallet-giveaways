import { Router } from "express";
import { z } from "zod";
import { sequelize } from "../../../lib/sequelize.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { Participant } from "../../../models/participant.js";
import { NewGiveawaySchema, sendError } from "./_common.js";

const GiveawaySchema = NewGiveawaySchema.extend({
  status: z.enum(["pending", "active", "finished"]),
  participantCount: z.number().int().nonnegative(),
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
    zodTypedParse(GiveawaySchema, {
      type: giveaway.type,
      status: giveaway.status,
      endsAt: giveaway.endsAt ?? undefined,
      tokenAddress: giveaway.tokenAddress ?? undefined,
      amount: giveaway.amount,
      receiverCount: giveaway.receiverCount,
      taskUrl: giveaway.taskUrl ?? undefined,
      participantCount: giveaway.get("n_participants") as number,
    }),
  );
});
