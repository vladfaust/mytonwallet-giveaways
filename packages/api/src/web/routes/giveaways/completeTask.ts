import bodyParser from "body-parser";
import { Router } from "express";
import { Address } from "ton";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { sequelize } from "../../../lib/sequelize.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { Participant } from "../../../models/participant.js";
import {
  SuccessResponseSchema,
  countParticipants,
  sendError,
} from "./_common.js";

const RequestBodySchema = z.object({
  taskToken: z.string().min(1),
  receiverAddress: z.string().transform((x) => Address.parse(x)),
});

export default Router()
  .use(bodyParser.json())
  .post("/giveaways/:giveawayId/complete-task", async (req, res) => {
    const body = RequestBodySchema.safeParse(req.body);

    if (!body.success) {
      return sendError(res, 400, fromError(body.error).toString());
    }

    const error = await sequelize.transaction(async (transaction) => {
      const giveaway = await Giveaway.findOne({
        where: {
          // OPTIMIZE: Add index.
          id: req.params.giveawayId,
          taskToken: body.data.taskToken,
        },
        transaction,
      });

      if (!giveaway) {
        return "Invalid task token";
      }

      if (giveaway.status !== "active") {
        return "Giveaway is not active";
      }

      const participant = await Participant.findOne({
        where: {
          giveawayId: giveaway.id,
          receiverAddress: body.data.receiverAddress.toRaw(),
        },
        transaction,
        lock: true,
      });

      if (!participant) {
        return "Invalid receiver address";
      }

      if (participant.status !== "awaitingTask") {
        return "Invalid participant status";
      }

      const participantCount = await countParticipants(
        giveaway.id,
        transaction,
      );

      if (participantCount === giveaway.receiverCount) {
        // NOTE: Technically, it's not a error, because the callback caller
        // is not responsible in this case. It's just the participant
        // being too slow on the task. But we're returning a error
        // here so that the caller doesn't send any more updates.
        return "The giveaway is full. No more participants are allowed.";
      }

      await participant.update(
        {
          // If the giveaway is instant, the participant is ready to receive the prize.
          // If the giveaway is a lottery, shall wait for the lottery to be drawn.
          status:
            giveaway.type === "instant" ? "awaitingPayment" : "awaitingLottery",
        },
        { transaction },
      );
    });

    if (error) {
      return sendError(res, 400, error);
    } else {
      return res.json(zodTypedParse(SuccessResponseSchema, { ok: true }));
    }
  });
