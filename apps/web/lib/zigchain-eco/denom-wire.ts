import * as z from 'zod';

/**
 * Session AK (F4): the answer of GET /api/chain/denom, shared by the server reader (denom-reader.ts) and the browser
 * (denom-client.ts) so the browser never imports server code. Strict objects; names are plain text, capped.
 */
const text = (max: number) => z.string().max(max);
export const denomWireSchema = z.object({
  version: z.literal(1),
  status: z.enum(['ok', 'unavailable']),
  reason: text(300).optional(),
  network: z.enum(['zigchain-1', 'zig-test-2']),
  denom: text(140),
  height: z.string().regex(/^[1-9]\d{0,19}$/).optional(),
  observedAt: z.iso.datetime({offset: true}).optional(),
  trace: z.object({hops: z.array(z.object({port: text(128), channel: text(128)}).strict()).min(1).max(8), base: text(128), path: text(1200)}).strict().nullable().optional(),
  /** true when the chain has a trace for this IBC denom but its hash did not match (never shown as the identity). */
  traceMismatch: z.boolean().optional(),
  metadata: z.object({name: text(80), symbol: text(40), display: text(80), exponent: z.number().int().min(0).max(30).nullable()}).strict().nullable().optional(),
  cw20: z.object({name: text(80), symbol: text(40), decimals: z.number().int().min(0).max(30)}).strict().nullable().optional(),
}).strict();
export type DenomWire = z.infer<typeof denomWireSchema>;
