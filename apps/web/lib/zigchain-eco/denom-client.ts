import {classifyToken, isCheckableDenom, traceMatches, type TokenView} from './denoms';
import {denomWireSchema, type DenomWire} from './denom-wire';

/**
 * Session AK (F4): the browser side of the token check. Asks ZIGoals' own route (GET /api/chain/denom; no other host),
 * checks the answer's shape strictly, checks the IBC trace's hash again here, and classifies the token by its denom
 * (lib/zigchain-eco/denoms.ts). Known tokens need no read at all. Nothing is stored.
 */
export type TokenCheck =
  | {phase: 'ok'; view: TokenView; wire: DenomWire | null}
  | {phase: 'unavailable'; reason: string};
export const NOT_IN_THIS_BUILD = 'Token checks are not available in this build yet.';
export async function checkToken(network: 'zigchain-1' | 'zig-test-2', denom: string, fetcher: typeof fetch = fetch): Promise<TokenCheck> {
  const value = denom.trim();
  if (!isCheckableDenom(value)) return {phase: 'unavailable', reason: 'That is not a ZIGChain token denom. Paste the full denom: it starts with ibc/, coin.zig1 or zig1, or is azig.'};
  const offline = classifyToken({network, denom: value});
  if (offline.kind === 'zig' || offline.kind === 'known') return {phase: 'ok', view: offline, wire: null};
  let response: Response;
  try { response = await fetcher(`/api/chain/denom?${new URLSearchParams({network, denom: value})}`, {credentials: 'same-origin', cache: 'no-store'}); }
  catch { return {phase: 'unavailable', reason: 'ZIGoals could not reach the network just now. Try again in a minute.'}; }
  if (response.status === 404) return {phase: 'unavailable', reason: NOT_IN_THIS_BUILD};
  if (response.status === 429) return {phase: 'unavailable', reason: 'Too many checks just now. Try again in a minute.'};
  let body: unknown;
  try { body = await response.json(); } catch { return {phase: 'unavailable', reason: 'The answer could not be read.'}; }
  const parsed = denomWireSchema.safeParse(body);
  if (!parsed.success || parsed.data.denom !== value || parsed.data.network !== network) return {phase: 'unavailable', reason: 'The answer could not be read.'};
  const wire = parsed.data;
  if (wire.status === 'unavailable') return {phase: 'unavailable', reason: wire.reason ?? 'The chain did not answer just now.'};
  const trace = wire.trace && await traceMatches(value, wire.trace) ? wire.trace : null;
  return {phase: 'ok', wire, view: classifyToken({network, denom: value, metadata: wire.metadata ?? null, cw20: wire.cw20 ?? null, verifiedTrace: trace})};
}
