import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * A boolean environment variable is a string that can be either
 * `0`, `1`, `false` or `true` (case-insensitive).
 */
function booleanString() {
  return z
    .string()
    .toLowerCase()
    .pipe(z.enum(["0", "1", "false", "true"]))
    .transform((x) => x === "1" || x === "true");
}

export const {
  HOST,
  PORT,

  BULL_DASHBOARD_USERNAME,
  BULL_DASHBOARD_PASSWORD,

  DATABASE_URL,
  REDIS_URL,

  TON_MAINNET,
  TON_WORKCHAIN,
  TON_CLIENT_ENDPOINT,
  TON_MAIN_ADDRESS_MNEMONICS,

  GIVEAWAY_LINK_TEMPLATE,
  GIVEAWAY_SECRET,

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

    BULL_DASHBOARD_USERNAME: z.string(),
    BULL_DASHBOARD_PASSWORD: z.string(),

    TON_MAINNET: booleanString().optional().default("false"),
    TON_WORKCHAIN: z
      .string()
      .transform((x) => parseInt(x))
      .pipe(z.number().int().nonnegative())
      .default("0"),
    TON_CLIENT_ENDPOINT: z.string().url(),
    TON_MAIN_ADDRESS_MNEMONICS: z.string().transform((x) => x.split(/\s+/)),

    GIVEAWAY_LINK_TEMPLATE: z.string(),
    GIVEAWAY_SECRET: z.string(),

    TONCONNECT_MANIFEST_URL: z.string().url(),
    TONCONNECT_MANIFEST_ICON_URL: z.string().url(),

    JWT_SECRET: z.string().transform((x) => Buffer.from(x, "hex")),
  })
  .parse(process.env);
