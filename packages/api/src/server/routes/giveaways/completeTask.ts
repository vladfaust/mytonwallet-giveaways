import bodyParser from "body-parser";
import { Router } from "express";
import { z } from "zod";
import { fromError } from "zod-validation-error";
import { sequelize } from "../../../lib/sequelize.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { Participant } from "../../../models/participant.js";
import { SuccessResponseSchema, sendError } from "./_common.js";

const RequestBodySchema = z.object({
  taskToken: z.string(),
  receiverAddress: z.string(),
});

export default Router()
  .use(bodyParser.json())
  .post("/giveaways/:giveawayId/complete-task", async (req, res) => {
    const body = RequestBodySchema.safeParse(req.body);

    if (!body.success) {
      return sendError(res, 400, fromError(body.error).toString());
    }

    const giveaway = await Giveaway.findOne({
      where: {
        id: req.params.giveawayId,
        taskToken: body.data.taskToken,
      },
    });

    if (!giveaway) {
      return sendError(res, 400, "Invalid task token");
    }

    let error: string | undefined;
    await sequelize.transaction(async (t) => {
      const participant = await Participant.findOne({
        where: {
          giveawayId: giveaway.id,
          receiverAddress: body.data.receiverAddress,
        },
        transaction: t,
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
        { status: "awaitingPayment" },
        { transaction: t },
      );
    });

    if (error) {
      return sendError(res, 400, error);
    } else {
      return res.json(zodTypedParse(SuccessResponseSchema, { ok: true }));
    }
  });
