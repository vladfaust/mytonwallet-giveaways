import { ZodSchema, z } from "zod";

export function zodTypedParse<T extends ZodSchema>(
  schema: T,
  value: z.infer<T>,
): z.infer<T> {
  return schema.parse(value);
}
