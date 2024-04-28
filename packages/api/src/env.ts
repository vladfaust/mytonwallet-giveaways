import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

export const {
  HOST,
  PORT,
  DATABASE_URL,
  MAIN_ADDRESS,
  MAIN_ADDRESS_MNEMONICS,
  GIVEAWAY_LINK_TEMPLATE,
  SECRET,
} = z
  .object({
    HOST: z.string(),
    PORT: z
      .string()
      .transform((x) => parseInt(x))
      .pipe(z.number().int().nonnegative()),
    DATABASE_URL: z.string().url(),
    MAIN_ADDRESS: z.string(),
    MAIN_ADDRESS_MNEMONICS: z.string(),
    GIVEAWAY_LINK_TEMPLATE: z.string(),
    SECRET: z.string(),
  })
  .parse(process.env);
