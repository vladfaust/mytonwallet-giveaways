import { Router } from "express";
import * as jose from "jose";
import { Address } from "ton";
import { JWT_SECRET } from "../../../env.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Participant } from "../../../models/participant.js";
import {
  SuccessResponseSchema as SuccessResponseSchemaBase,
  sendError,
} from "./_common.js";
import { ParticipantSchema } from "./checkin.js";

const SuccessResponseSchema = SuccessResponseSchemaBase.extend({
  participant: ParticipantSchema,
});

/**
 * Check if current user is checked in to the giveaway.
 */
export default Router().get(
  "/giveaways/:giveawayId/checkin",
  async (req, res) => {
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

    const participant = await Participant.findOne({
      where: {
        giveawayId: req.params.giveawayId,
        receiverAddress: Address.parse(addressString).toRaw(),
      },
      attributes: ["status"],
    });

    if (participant) {
      return res.send(
        zodTypedParse(SuccessResponseSchema, {
          ok: true,
          participant,
        }),
      );
    } else {
      return sendError(res, 404, "Participant not found");
    }
  },
);
