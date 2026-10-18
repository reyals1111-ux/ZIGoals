import * as z from 'zod';

/**
 * Session AF (ADR-028 H16, H58; `TIER 3 (egress routes)`): the answer of `GET /api/chain/validators?network=…`, shared by
 * the route (lib/server/chain-validators.ts), the staking validator picker and the Earn hub (lane L1). Address-free chain
 * data read by ZIGoals' server from the network's official LCD at one block height. The shape is fixed: strict objects,
 * every amount an integer string of azig, every share and rate a decimal string between 0 and 1, never a float.
 * - `status: 'ok'` carries `height`, `observedAt`, `bondedTotal` and the validators; `status: 'unavailable'` carries a plain
 *   `reason` and an empty list (HTTP 200, H58): an unavailable source is a normal state, shown as such, never as zero.
 * - `website` is text only, never rendered as a link (outgoing links come only from the verified link registry).
 * - `tombstoned` is null when the chain has no signing info for the validator; `selfBond` is null when its own account's
 *   delegation could not be read; `uptime` is null without signing info.
 */
export const VALIDATOR_NETWORKS = ['zigchain-1', 'zig-test-2'] as const;
export const VALIDATOR_SOURCES = ['https://api.zigchain.com', 'https://testnet-api.zigchain.com'] as const;
export const MAX_WIRE_VALIDATORS = 200;
const azig = z.string().regex(/^(0|[1-9]\d{0,77})$/);
/** A decimal string between 0 and 1 inclusive, at most 18 places ("0", "0.05", "1"). */
export const unitDecimal = z.string().regex(/^(0(\.\d{1,18})?|1(\.0{1,18})?)$/);
const iso = z.iso.datetime({offset: true});
export const wireValidatorSchema = z.object({
  operator: z.string().regex(/^zigvaloper1[02-9ac-hj-np-z]{38}$/),
  moniker: z.string().max(200),
  website: z.string().max(300),
  status: z.enum(['bonded', 'unbonding', 'unbonded']),
  jailed: z.boolean(),
  tombstoned: z.boolean().nullable(),
  tokens: azig,
  votingPowerShare: unitDecimal,
  commission: z.object({rate: unitDecimal, maxRate: unitDecimal, maxChangeRate: unitDecimal, updatedAt: iso}).strict(),
  selfBond: azig.nullable(),
  uptime: z.object({window: z.number().int().positive().max(10_000_000), missed: z.number().int().min(0).max(10_000_000), signedShare: unitDecimal}).strict().nullable(),
}).strict();
export const validatorsWireSchema = z.object({
  version: z.literal(1),
  status: z.enum(['ok', 'unavailable']),
  reason: z.string().max(300).optional(),
  network: z.enum(VALIDATOR_NETWORKS),
  height: z.string().regex(/^[1-9]\d{0,19}$/).optional(),
  observedAt: iso.optional(),
  source: z.enum(VALIDATOR_SOURCES),
  bondedTotal: azig.optional(),
  validators: z.array(wireValidatorSchema).max(MAX_WIRE_VALIDATORS),
}).strict().superRefine((wire, context) => {
  if (wire.status === 'ok' && (wire.height === undefined || wire.observedAt === undefined || wire.bondedTotal === undefined || wire.reason !== undefined))
    context.addIssue({code: 'custom', message: 'An ok answer carries height, observedAt and bondedTotal, and no reason.'});
  if (wire.status === 'unavailable' && (!wire.reason || wire.validators.length > 0))
    context.addIssue({code: 'custom', message: 'An unavailable answer carries a reason and no validators.'});
  const source = wire.network === 'zigchain-1' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com';
  if (wire.source !== source) context.addIssue({code: 'custom', message: 'The source is the network\'s own LCD.'});
  if (new Set(wire.validators.map(v => v.operator)).size !== wire.validators.length) context.addIssue({code: 'custom', message: 'Each validator once.'});
});
export type ValidatorsWire = z.infer<typeof validatorsWireSchema>;
export type WireValidator = z.infer<typeof wireValidatorSchema>;
