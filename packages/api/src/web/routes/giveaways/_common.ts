import { Response } from "express";
import { z } from "zod";
import { zodTypedParse } from "../../../lib/utils.js";

export const NewGiveawaySchema = z.object({
  type: z.enum(["instant", "lottery"]),
  endsAt: z
    .string()
    .transform((x) => new Date(x))
    .nullable(),
  tokenAddress: z.string().nullable(),
  amount: z.string().refine((x) => !isNaN(parseFloat(x)) && parseFloat(x) > 0, {
    message: "Amount must be a positive decimal number",
  }),
  receiverCount: z.number().int().positive(),
  taskUrl: z.string().url().nullable(),
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
