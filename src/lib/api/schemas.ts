import { z } from 'zod';

/** Backend messages are usually strings but some error paths return objects; normalise to string | undefined. */
export const apiMessage = z
  .unknown()
  .optional()
  .transform((v) => (typeof v === 'string' ? v : undefined));

/** The `{ success, message, data }` envelope every Sobhagya backend endpoint returns. */
export const apiEnvelope = <T extends z.ZodType>(data: T) =>
  z.object({
    success: z.boolean(),
    message: apiMessage,
    data: data.nullable().optional(),
  });

/** Envelope whose `data` is ignored (mutations that only report success). */
export const apiAck = z.looseObject({ success: z.boolean(), message: apiMessage });
export type ApiAck = z.infer<typeof apiAck>;

/** Dates arrive as ISO strings (or occasionally null / missing). */
export const isoDate = z.string().nullish();

/** Numeric fields that some services serialise as strings. */
export const numberish = z
  .union([z.number(), z.string()])
  .nullish()
  .transform((v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  });

/** Accepts a single object or an array and always yields an array (some endpoints return one object when filtered by id). */
export const oneOrMany = <T extends z.ZodType>(item: T) =>
  z.union([z.array(item), item]).transform((v): z.output<T>[] => (Array.isArray(v) ? v : [v]));

export const selectOption = z.object({ value: z.string(), label: z.string() });
export type SelectOption = z.infer<typeof selectOption>;
