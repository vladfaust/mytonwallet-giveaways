import { Response } from "express";
import { Transaction } from "sequelize";
import { z } from "zod";
import { zodTypedParse } from "../../../lib/utils.js";
import { Participant } from "../../../models/participant.js";

export const SuccessResponseSchema = z.object({
  ok: z.literal(true),
});

export const ErrorResponseSchema = z.object({
  error: z.string(),
});

export function sendError(res: Response, statusCode: number, error: string) {
  res.status(statusCode).json(
    zodTypedParse(ErrorResponseSchema, {
      error,
    }),
  );
}

export async function countParticipants(
  giveawayId: string,
  transaction?: Transaction,
) {
  return Participant.count({
    where: {
      giveawayId,

      // NOTE: Those with status "awaitingTask" are not counted.
      status: ["awaitingLottery", "awaitingPayment", "paid", "lost"],
    },
    transaction,
  });
}
