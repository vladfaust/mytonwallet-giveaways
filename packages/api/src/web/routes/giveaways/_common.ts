import { Response } from "express";
import { Transaction } from "sequelize";
import { toNano } from "ton";
import { z } from "zod";
import { zodTypedParse } from "../../../lib/utils.js";
import { Participant } from "../../../models/participant.js";

export const NewGiveawaySchema = z.object({
  type: z.enum(["instant", "lottery"]),
  endsAt: z
    .string()
    .transform((x) => new Date(x))
    .nullable(),
  tokenAddress: z.string().nullable(),
  amount: z.string().refine((x) => toNano(x), {
    message: "Amount must be a positive decimal number, e.g. 1.0",
  }),
  receiverCount: z.number().int().positive(),
  taskUrl: z.string().url().nullable(),
});

export const GiveawaySchema = NewGiveawaySchema.extend({
  id: z.string(),
  status: z.enum(["pending", "active", "finished"]),
  participantCount: z.number().int().nonnegative(),
});

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
