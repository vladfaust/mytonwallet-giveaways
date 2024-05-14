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
  NODE_ENV,

  HOST, // HTTP server host.
  PORT, // HTTP server port.

  BULL_DASHBOARD_USERNAME, // Basic auth username for the Bull dashboard.
  BULL_DASHBOARD_PASSWORD, // Basic auth password for the Bull dashboard.

  DATABASE_URL,
  REDIS_URL,

  TON_MAINNET, // Whether to use the mainnet or not (default: false).
  TON_WORKCHAIN, // The TON workchain to use (default: 0).
  TON_CLIENT_ENDPOINT, // The TON client endpoint.
  TON_CLIENT_API_KEY, // The TON client API key.
  TON_MAIN_ADDRESS_MNEMONICS, // The seed for the main TON wallet.

  TON_HISTORY_CUTOFF, // Before this date, the transactions are ignored.

  GIVEAWAY_LINK_TEMPLATE, // The template for the giveaway link, e.g. `https://my.tt/g/:id`.
  GIVEAWAY_SECRET, // The secret for the giveaway link, as defined by the specification.

  TURNSTILE_SECRET_KEY, // Cloudflare's Turnstile secret key.

  TONCONNECT_MANIFEST_URL, // The URL of the TON Connect manifest JSON file.
  TONCONNECT_MANIFEST_ICON_URL, // The URL of the TON Connect manifest icon.

  JWT_SECRET, // The secret key for JWT in hex format, e.g. `deadbeef`.
} = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .optional()
      .default("development"),

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
    TON_CLIENT_API_KEY: z.string().optional(),
    TON_MAIN_ADDRESS_MNEMONICS: z.string().transform((x) => x.split(/\s+/)),
    TON_HISTORY_CUTOFF: z
      .string()
      .transform((x) => new Date(parseInt(x) * 1000))
      .optional(),

    GIVEAWAY_LINK_TEMPLATE: z.string(),
    GIVEAWAY_SECRET: z.string(),

    TURNSTILE_SECRET_KEY: z.string(),

    TONCONNECT_MANIFEST_URL: z.string().url(),
    TONCONNECT_MANIFEST_ICON_URL: z.string().url(),

    JWT_SECRET: z.string().transform((x) => Buffer.from(x, "hex")),
  })
  .parse(process.env);
