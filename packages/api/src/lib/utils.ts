import { ZodSchema, z } from "zod";

/**
 * Ensures that the given value is of the given Zod schema.
 */
export function zodTypedParse<T extends ZodSchema>(
  schema: T,
  value: z.infer<T>,
): z.infer<T> {
  return schema.parse(value);
}
