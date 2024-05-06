import { Response } from "express";
import { Transaction } from "sequelize";
import { z } from "zod";
import {
  addressFromRawBuffer,
  bounceable,
  contract,
  testOnly,
} from "../../../lib/ton.js";
import { zodTypedParse } from "../../../lib/utils.js";
import { Giveaway } from "../../../models/giveaway.js";
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

/**
 * Counts participants of a giveaway.
 *
 * @param transaction Database transaction, if any.
 * @param includeAwaitingTask Whether to include participants with
 * "awaitingTask" status, defaults to `false`.
 */
export async function countParticipants(
  giveawayId: string,
  transaction?: Transaction | undefined,
  includeAwaitingTask = false,
) {
  const status: Participant["status"][] = [
    "awaitingLottery",
    "awaitingPayment",
    "paid",
    "lost",
  ];

  if (includeAwaitingTask) {
    status.push("awaitingTask");
  }

  return Participant.count({
    where: {
      giveawayId,
      status,
    },
    transaction,
  });
}

/**
 * Builds a TON URI for topping up a giveaway.
 */
export function buildTopUpLink(giveaway: Giveaway): URL {
  const topUpLink = new URL(
    `ton://transfer/${contract.address.toString({ testOnly, bounceable })}`,
  );

  if (giveaway.tokenAddress) {
    topUpLink.searchParams.set(
      "token",
      addressFromRawBuffer(giveaway.tokenAddress).toString({
        urlSafe: true,
        testOnly,
        bounceable: true,
      }),
    );
  }

  topUpLink.searchParams.set(
    "amount",
    (BigInt(giveaway.amount) * BigInt(giveaway.receiverCount)).toString(),
  );

  topUpLink.searchParams.set("text", giveaway.id);

  return topUpLink;
}
