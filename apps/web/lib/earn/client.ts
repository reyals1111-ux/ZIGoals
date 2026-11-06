import * as z from 'zod';
import {UNAVAILABLE_REASONS, liveEnvelopeSchema, type UnavailableReason} from './live/envelope';
import type {ChainData, DefillamaData, MeasuredData, OroswapData, ValdoraData, VaultsData} from './live/types';

/**
 * Session AF (L1): the Earn page's reads, all same-origin (the app's own /api routes; the browser never talks to an LCD
 * or DefiLlama, ADR-028 H16). An answer that is not the live envelope is treated as unavailable, never shown.
 */
// CI14 (weights): the families and their cadence live in families.ts (the Earn page reads them before this reader loads).
import {EARN_FAMILIES, type EarnFamily} from './families';
// CI20: the ask itself (fetch, same-origin, never throws) lives in ask-route.ts, so the live hook asks on mount and only
// the checking of the answer waits for this chunk; readEarn / readValidators ask and check in one call, as before.
import {askRoute, type RouteAnswer} from './ask-route';
export {EARN_FAMILIES, type EarnFamily};
export type FamilyData = {chain: ChainData; valdora: ValdoraData; oroswap: OroswapData; defillama: DefillamaData; validators: ValidatorsAnswer; vaults: VaultsData; measured: MeasuredData};
/** A good answer as the page shows it: its source (a name; the host that answered when the route names it), block and times. */
export type LiveAnswer<T> = {source: {name: string; origin?: string}; height?: string; observedAt?: string; fetchedAt: string; stale: boolean; reason?: UnavailableReason; data: T};
/** What the page knows about a family right now. `reason` comes from the route, or from the page when the route itself failed. */
export type LiveState<T> =
  | {phase: 'loading'}
  | {phase: 'ok'; answer: LiveAnswer<T>}
  | {phase: 'unavailable'; reason: UnavailableReason | 'NOT_IN_THIS_BUILD'; source?: {name: string; origin?: string}};

const plain = (reason: UnavailableReason | 'NOT_IN_THIS_BUILD') => ({phase: 'unavailable' as const, reason});
const envelope = liveEnvelopeSchema(z.record(z.string(), z.unknown()));
/** One of the /api/earn/* families, as a page state. */
export async function readEarn<F extends Exclude<EarnFamily, 'validators'>>(family: F): Promise<LiveState<FamilyData[F]>> {
  return earnAnswer<FamilyData[F]>(await askRoute(EARN_FAMILIES[family].path));
}
/** What one /api/earn/* answer means for the page (CI20: the check, apart from the ask). */
export function earnAnswer<T>(got: RouteAnswer): LiveState<T> {
  if ('failed' in got) return plain(got.timeout ? 'TIMEOUT' : 'UPSTREAM_DOWN');
  if (got.status === 404) return plain('NOT_IN_THIS_BUILD');
  const parsed = envelope.safeParse(got.body);
  if (!parsed.success) return plain(got.status === 429 ? 'RATE_LIMITED' : got.status >= 500 || got.status === 0 ? 'UPSTREAM_DOWN' : 'MALFORMED');
  if (parsed.data.status === 'unavailable') return {phase: 'unavailable', reason: parsed.data.reason, source: parsed.data.source};
  return {phase: 'ok', answer: parsed.data as unknown as LiveAnswer<T>};
}

/**
 * GET /api/chain/validators?network= (built by lane L2a; until it merges this build answers 404 and the section says so).
 * The wire shape is L2a's: {version: 1, status, reason?, network, height?, observedAt?, source, bondedTotal?, validators}.
 * The page reads the fields it shows strictly and `source` loosely (a name, or {name, origin|url}).
 */
const share = z.union([z.string().regex(/^\d{1,3}(\.\d{1,30})?$/), z.number().finite().nonnegative()]).transform(v => Number(v));
const count = z.union([z.string().regex(/^\d{1,20}$/), z.number().int().nonnegative()]).transform(v => Number(v));
const amount = z.string().regex(/^\d{1,60}(\.\d{1,30})?$/);
const validatorSchema = z.object({
  operator: z.string().regex(/^zigvaloper1[02-9ac-hj-np-z]{38,58}$/), moniker: z.string().max(200), website: z.string().max(300).nullable().optional(),
  status: z.enum(['bonded', 'unbonding', 'unbonded']), jailed: z.boolean(), tombstoned: z.boolean().nullable(), tokens: amount, votingPowerShare: share,
  commission: z.object({rate: share, maxRate: share, maxChangeRate: share, updatedAt: z.string().max(40).nullable().optional()}),
  selfBond: amount.nullable(), uptime: z.object({window: count, missed: count, signedShare: share}).nullable(),
});
const validatorsSchema = z.object({
  // The route's reason is a plain sentence (lane L2a, up to 300 characters); an unknown reason reads as UPSTREAM_DOWN below.
  version: z.literal(1), status: z.enum(['ok', 'unavailable']), reason: z.string().max(300).optional(), network: z.string().max(20),
  height: z.union([z.string(), z.number()]).optional(), observedAt: z.string().max(40).optional(),
  source: z.union([z.string().max(120), z.object({name: z.string().max(120), origin: z.string().max(200).optional(), url: z.string().max(200).optional()})]),
  bondedTotal: amount.optional(), validators: z.array(validatorSchema).max(500),
});
export type Validator = z.infer<typeof validatorSchema>;
export type ValidatorsAnswer = z.infer<typeof validatorsSchema> & {fetchedAt: string};
const LCD_NAMES: Readonly<Record<string, string>> = {'https://api.zigchain.com': 'ZIGChain mainnet LCD (official)', 'https://testnet-api.zigchain.com': 'ZIGChain testnet LCD (official)'};
export async function readValidators(): Promise<LiveState<ValidatorsAnswer>> {
  return validatorsAnswer(await askRoute(EARN_FAMILIES.validators.path));
}
/** What one validators answer means for the page (CI20: the check, apart from the ask). */
export function validatorsAnswer(got: RouteAnswer): LiveState<ValidatorsAnswer> {
  if ('failed' in got) return plain('UPSTREAM_DOWN');
  if (got.status === 404) return plain('NOT_IN_THIS_BUILD');
  const parsed = validatorsSchema.safeParse(got.body);
  // crit1: a route that answers 5xx (or nothing) did not answer; only a readable answer in the wrong shape is MALFORMED (as readEarn).
  if (!parsed.success) return plain(got.status === 429 ? 'RATE_LIMITED' : got.status >= 500 || got.status === 0 ? 'UPSTREAM_DOWN' : 'MALFORMED');
  // L2a's route names its source by the LCD's origin; the page shows the plain name of that official service.
  const sourceName = typeof parsed.data.source === 'string' ? (LCD_NAMES[parsed.data.source] ?? parsed.data.source) : parsed.data.source.name;
  if (parsed.data.status === 'unavailable') return {phase: 'unavailable', reason: (UNAVAILABLE_REASONS as readonly string[]).includes(parsed.data.reason ?? '') ? parsed.data.reason as UnavailableReason : 'UPSTREAM_DOWN', source: {name: sourceName}};
  const fetchedAt = new Date().toISOString();
  return {phase: 'ok', answer: {source: {name: sourceName}, ...(parsed.data.height !== undefined ? {height: String(parsed.data.height)} : {}), ...(parsed.data.observedAt ? {observedAt: parsed.data.observedAt} : {}), fetchedAt, stale: false, data: {...parsed.data, fetchedAt}}};
}
