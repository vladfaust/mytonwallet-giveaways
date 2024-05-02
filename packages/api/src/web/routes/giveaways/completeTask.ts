import bodyParser from "body-parser";
import { Router } from "express";
import { Address } from "ton";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { sequelize } from "../../../lib/sequelize.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { Participant } from "../../../models/participant.js";
import { SuccessResponseSchema, sendError } from "./_common.js";

const RequestBodySchema = z.object({
  taskToken: z.string(),
  receiverAddress: z.string().transform((x) => Address.parse(x)),
});

export default Router()
  .use(bodyParser.json())
  .post("/giveaways/:giveawayId/complete-task", async (req, res) => {
    const body = RequestBodySchema.safeParse(req.body);

    if (!body.success) {
      return sendError(res, 400, fromError(body.error).toString());
    }

    let error: string | undefined;
    await sequelize.transaction(async (transaction) => {
      const giveaway = await Giveaway.findOne({
        where: {
          id: req.params.giveawayId,
          taskToken: body.data.taskToken,
        },
      });

      if (!giveaway) {
        error = "Invalid task token";
        return;
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
        error = "Invalid receiver address";
        return;
      }

      if (participant.status !== "awaitingTask") {
        error = "Invalid participant status";
        return false;
      }

      await participant.update(
        {
          // If the giveaway is instant, the participant is ready to receive the prize.
          // If the giveaway is a lottery, shall wait for the lottery to be drawn.
          status:
            giveaway.type === "instant" ? "awaitingPayment" : "awaitingLottery",
        },
        {
          transaction: transaction,
        },
      );
    });

    if (error) {
      return sendError(res, 400, error);
    } else {
      return res.json(zodTypedParse(SuccessResponseSchema, { ok: true }));
    }
  });
