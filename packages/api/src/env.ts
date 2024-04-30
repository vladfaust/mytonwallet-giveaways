import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const {
  HOST,
  PORT,
  DATABASE_URL,
  REDIS_URL,
  TON_IS_MAINNET,
  TON_WORKCHAIN,
  TON_CLIENT_ENDPOINT,
  TON_MAIN_ADDRESS_MNEMONICS,
  GIVEAWAY_LINK_TEMPLATE,
  SECRET,
  TONCONNECT_MANIFEST_URL,
  TONCONNECT_MANIFEST_ICON_URL,
  JWT_SECRET,
} = z
  .object({
    HOST: z.string(),
    PORT: z
      .string()
      .transform((x) => parseInt(x))
      .pipe(z.number().int().nonnegative()),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    TON_IS_MAINNET: z
      .enum(["0", "1", "false", "true"])
      .optional()
      .default("0")
      .transform((x) => x === "1" || x === "true"),
    TON_WORKCHAIN: z
      .string()
      .transform((x) => parseInt(x))
      .pipe(z.number().int().nonnegative())
      .default("0"),
    TON_CLIENT_ENDPOINT: z.string().url(),
    TON_MAIN_ADDRESS_MNEMONICS: z.string().transform((x) => x.split(/\s+/)),
    GIVEAWAY_LINK_TEMPLATE: z.string(),
    SECRET: z.string(),
    TONCONNECT_MANIFEST_URL: z.string().url(),
    TONCONNECT_MANIFEST_ICON_URL: z.string().url(),
    JWT_SECRET: z.string().transform((x) => Buffer.from(x, "hex")),
  })
  .parse(process.env);
