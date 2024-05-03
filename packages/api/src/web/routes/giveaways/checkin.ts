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
  SuccessResponseSchema as SuccessResponseSchemaBase,
  countParticipants,
  sendError,
} from "./_common.js";
import { GiveawaySchema } from "./get.js";

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
    console.log(
      `User with address ${addressString} is trying to check in to giveaway ${req.params.giveawayId}`,
    );

    let participantCount: number = 0;
    const result = await sequelize.transaction(async (transaction) => {
      const giveaway = await Giveaway.findOne({
        where: { id: req.params.giveawayId },
        attributes: [
          "id",
          "type",
          "tokenAddress",
          "amount",
          "receiverCount",
          "status",
          "endsAt",
          "taskUrl",
        ],
        transaction,
      });

      if (!giveaway) {
        // NOTE: (Spec) I'd rather return code 404 here.
        return "Giveaway not found";
      }

      if (giveaway.status !== "active") {
        return "Giveaway is not active";
      }

      if (giveaway.endsAt && giveaway.endsAt < new Date()) {
        return "Giveaway has ended";
      }

      let participant = await Participant.findOne({
        where: {
          giveawayId: giveaway.id,
          receiverAddress: Address.parse(addressString).toRaw(),
        },
        transaction,
      });

      if (participant) {
        return "Already checked in";
      }

      participantCount = await countParticipants(giveaway.id, transaction);
      if (participantCount === giveaway.receiverCount) {
        return "Giveaway is full";
      }

      let participantStatus: Participant["status"];
      if (giveaway.taskUrl) {
        // Waiting for the task completion.
        participantStatus = "awaitingTask";
        // participantCount++; // We don't count those awaiting the task.
      } else if (giveaway.type === "instant") {
        // Ready for payout.
        participantStatus = "awaitingPayment";
        participantCount++;
      } else {
        // Waiting for the lottery results.
        participantStatus = "awaitingLottery";
        participantCount++;
      }

      participant = await Participant.create(
        {
          giveawayId: giveaway.id,

          // NOTE: Raw address includes the workchain ID.
          receiverAddress: Address.parse(addressString).toRaw(),

          status: participantStatus,
        },
        { transaction },
      );

      return {
        giveaway,
        participant: {
          status: participantStatus,
        },
      };
    });

    if (typeof result === "string") {
      return sendError(res, 400, result);
    }

    return res.json(
      zodTypedParse(SuccessResponseSchema, {
        ok: true,
        giveaway: {
          id: result.giveaway.id,
          type: result.giveaway.type,
          status: result.giveaway.status,
          endsAt: result.giveaway.endsAt?.toString() ?? null,
          tokenAddress: result.giveaway.tokenAddress ?? null,
          amount: fromNano(result.giveaway.amount),
          receiverCount: result.giveaway.receiverCount,
          taskUrl: result.giveaway.taskUrl ?? null,
          participantCount,
        },
        participant: {
          status: result.participant.status,
        },
      }),
    );
  });
