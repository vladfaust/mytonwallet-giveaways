import bodyParser from "body-parser";
import { Router } from "express";
import { Address } from "ton";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { sequelize } from "../../../lib/sequelize.js";
import { tryParseAddress } from "../../../lib/ton.js";
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
  receiverAddress: z
    .string()
    .refine(tryParseAddress, { message: "Invalid receiver address" })

    // NOTE: To avoid `this` binding error in a static method,
    // they should replace `this.parseRaw` with `Address.parseRaw`.
    //
    // .transform(Address.parse),

    .transform((x) => Address.parse(x)),
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

      // It may be such that the giveaways status
      // is still "active", but the end date has passed.
      if (giveaway.endsAt && giveaway.endsAt < new Date()) {
        return "Giveaway has ended";
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
        return "Participant not found with this address";
      }

      if (participant.status !== "awaitingTask") {
        return "Invalid participant status";
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

      console.log(
        `Updated participant ${participant.id} status to ${participant.status}`,
      );

      // An instant giveaway with a task is complete
      // once N participants complete the task.
      if (giveaway.type === "instant") {
        const participantCount = await countParticipants(
          giveaway.id,
          transaction,
        );

        if (participantCount === giveaway.receiverCount) {
          await giveaway.update({ status: "finished" }, { transaction });

          console.log(
            `Updated giveaway ${giveaway.id} status to ${giveaway.status}`,
          );
        }
      } else {
        // A lottery giveaway is only finished when the lottery is drawn.
      }
    });

    if (error) {
      return sendError(res, 400, error);
    } else {
      return res.json(zodTypedParse(SuccessResponseSchema, { ok: true }));
    }
  });
