import bodyParser from "body-parser";
import { Router } from "express";
import * as jose from "jose";
import { Address, fromNano } from "ton";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { JWT_SECRET } from "../../../env.js";
import { sequelize } from "../../../lib/sequelize.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
import { Participant } from "../../../models/participant.js";
import {
  GiveawaySchema,
  SuccessResponseSchema as SuccessResponseSchemaBase,
  sendError,
} from "./_common.js";

const RequestBodySchema = z.object({
  // TODO: Validate captcha.
  captchaToken: z.string(),
});

const SuccessResponseSchema = SuccessResponseSchemaBase.extend({
  giveaway: GiveawaySchema,

  // NOTE: Out-of-spec, yet useful for the client.
  // REFACTOR: Extract from the `Participant` model.
  participant: z.object({
    status: z.enum([
      "awaitingTask",
      "awaitingLottery",
      "awaitingPayment",
      "paid",
      "lost",
    ]),
  }),
});

export default Router()
  .use(bodyParser.json())
  .post("/giveaways/:giveawayId/checkin", async (req, res) => {
    const body = RequestBodySchema.safeParse(req.body);
    if (!body.success) {
      return sendError(res, 400, fromZodError(body.error).toString());
    }

    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return sendError(res, 401, "Unauthorized");
    }

    let jwt;
    try {
      jwt = await jose.jwtVerify(token, JWT_SECRET);
    } catch (e) {
      if (e instanceof jose.errors.JOSEError) {
        return sendError(res, 401, "Unauthorized");
      } else {
        throw e;
      }
    }

    const { address: addressString } = jwt.payload as { address: string };
    console.debug(
      `User with address ${addressString} is checking in to giveaway ${req.params.giveawayId}`,
    );

    const result = await sequelize.transaction(async (transaction) => {
      const giveaway = await Giveaway.findOne({
        where: { id: req.params.giveawayId },
        include: [{ model: Participant, attributes: [] }],
        attributes: [
          "id",
          "type",
          "tokenAddress",
          "amount",
          "receiverCount",
          "status",
          "endsAt",
          "taskUrl",
          [
            sequelize.fn("COUNT", sequelize.col("Participants.id")),
            "n_participants",
          ],
        ],
        group: "Giveaway.id",
        transaction,
      });

      if (!giveaway) {
        return sendError(res, 404, "Giveaway not found");
      }

      if (giveaway.status !== "active") {
        return sendError(res, 400, "Giveaway is not active");
      }

      if (giveaway.endsAt && giveaway.endsAt < new Date()) {
        return sendError(res, 400, "Giveaway has ended");
      }

      let participant = await Participant.findOne({
        where: {
          giveawayId: giveaway.id,
          receiverAddress: Address.parseRaw(addressString).toRaw(),
        },
        transaction,
      });

      if (participant) {
        return sendError(res, 429, "Already checked in");
      }

      let participantStatus: Participant["status"];
      if (giveaway.taskUrl) {
        participantStatus = "awaitingTask"; // Waiting for the task completion.
      } else if (giveaway.type === "instant") {
        participantStatus = "awaitingPayment"; // Ready for payout.
      } else {
        participantStatus = "awaitingLottery"; // Waiting for the lottery results.
      }

      await Participant.create(
        {
          giveawayId: giveaway.id,
          receiverAddress: Address.parseRaw(addressString).toRaw(),
          status: participantStatus,
        },
        {
          transaction,
        },
      );

      return {
        giveaway,
        participant: {
          status: participantStatus,
        },
      };
    });

    if (!result) return;

    return res.json(
      zodTypedParse(SuccessResponseSchema, {
        ok: true,
        giveaway: {
          id: result.giveaway.id,
          type: result.giveaway.type,
          status: result.giveaway.status,
          endsAt: result.giveaway.endsAt ?? null,
          tokenAddress: result.giveaway.tokenAddress ?? null,
          amount: fromNano(result.giveaway.amount),
          receiverCount: result.giveaway.receiverCount,
          taskUrl: result.giveaway.taskUrl ?? null,
          participantCount: parseInt(
            result.giveaway.get("n_participants") as string,
          ),
        },
        participant: {
          status: result.participant.status,
        },
      }),
    );
  });
