import { z } from "zod";

/** A v4 UUID — the id shape used across every entity. */
export const uuidSchema = z.string().uuid();

/** ISO-8601 timestamp string. */
export const isoTimestampSchema = z.string().datetime({ offset: true });

/** Standard cursor pagination envelope. */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Uniform error envelope returned by the platform API. */
export const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
  }),
});
export type ErrorResponse = z.infer<typeof errorSchema>;
