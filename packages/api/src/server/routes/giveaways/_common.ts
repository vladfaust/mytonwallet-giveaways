import { Response } from "express";
import { z } from "zod";
import { zodTypedParse } from "../../../lib/utils.js";

export const NewGiveawaySchema = z.object({
  type: z.enum(["instant", "lottery"]),
  endsAt: z.date().optional(),
  tokenAddress: z.string().optional(),
  amount: z.number().positive(),
  receiverCount: z.number().int().positive(),
  taskUrl: z.string().url().optional(),
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
