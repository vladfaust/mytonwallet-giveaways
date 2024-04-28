import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const {
  HOST,
  PORT,
  DATABASE_URL,
  REDIS_URL,
  MAIN_ADDRESS,
  MAIN_ADDRESS_MNEMONICS,
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
    MAIN_ADDRESS: z.string(),
    MAIN_ADDRESS_MNEMONICS: z.string(),
    GIVEAWAY_LINK_TEMPLATE: z.string(),
    SECRET: z.string(),
    TONCONNECT_MANIFEST_URL: z.string().url(),
    TONCONNECT_MANIFEST_ICON_URL: z.string().url(),
    JWT_SECRET: z.string().transform((x) => Buffer.from(x, "hex")),
  })
  .parse(process.env);
