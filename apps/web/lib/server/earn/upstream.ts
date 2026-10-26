import 'server-only';
import type * as z from 'zod';
import {PROVIDER_USER_AGENT} from '../provider-user-agent';
import type {UnavailableReason} from '../../earn/live/envelope';

/**
 * Session AF (ADR-028 H16, H42, H58; `TIER 3 (egress routes)`): the only way the /api/earn/* routes reach the outside.
 * Server-only (never in connect-src): ZIGChain's official LCDs, Polkachu's public mainnet LCD as the rotation fallback
 * when the official one does not answer, and DefiLlama's two public APIs. Session AH (AF3): /api/earn/shares is the one
 * exception to "no address" below: it asks the LCD for one public address's balance of eight pinned share denoms only.
 * Every other request is a plain GET with no address of
 * a person anywhere (contract and validator addresses are public chain identifiers), no credentials, no referrer, no
 * cache and no redirect followed; an origin outside this list throws before anything is sent. A failure becomes one of
 * the envelope's reasons, never an exception text on the page.
 */
export const EARN_EGRESS = Object.freeze(['https://api.zigchain.com', 'https://testnet-api.zigchain.com', 'https://zigchain-api.polkachu.com', 'https://api.llama.fi', 'https://yields.llama.fi'] as const);
export type EarnOrigin = (typeof EARN_EGRESS)[number];
export type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
export class UpstreamFailure extends Error {
  constructor(readonly reason: UnavailableReason) { super(reason); this.name = 'UpstreamFailure'; }
}
export const REQUEST_TIMEOUT_MS = 12_000;
/** Refuses any URL that is not an HTTPS URL on an allowed origin, without a user, password, port or fragment. */
export function assertEgress(url: string): EarnOrigin {
  const parsed = new URL(url);
  const origin = EARN_EGRESS.find(o => o === parsed.origin);
  if (!origin || parsed.username || parsed.password || parsed.port || parsed.hash) throw new Error('Refusing an upstream outside the Earn egress list.');
  return origin;
}
export type Got = {value: unknown; height: string | null; origin: EarnOrigin};
/** One GET. `height` asks an LCD for that block and requires the answer to say it is that block. */
export async function getJson(fetcher: Fetcher, url: string, {maxChars, height, signal}: {maxChars: number; height?: string; signal?: AbortSignal}): Promise<Got> {
  const origin = assertEgress(url);
  let response: Response;
  try {
    response = await fetcher(url, {method: 'GET', headers: {accept: 'application/json', 'user-agent': PROVIDER_USER_AGENT, ...(height ? {'x-cosmos-block-height': height} : {})}, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]) : AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
  } catch (error) {
    throw new UpstreamFailure(error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'TIMEOUT' : 'UPSTREAM_DOWN');
  }
  const cancel = () => { void response.body?.cancel().catch(() => {}); };
  if (!response.ok) { cancel(); throw new UpstreamFailure('UPSTREAM_DOWN'); }
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxChars) { cancel(); throw new UpstreamFailure('TOO_LARGE'); }
  const answered = response.headers.get('x-cosmos-block-height');
  if (height && answered !== height) { cancel(); throw new UpstreamFailure('MALFORMED'); }
  let text: string;
  try { text = await response.text(); } catch (error) { throw new UpstreamFailure(error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError') ? 'TIMEOUT' : 'UPSTREAM_DOWN'); }
  if (text.length > maxChars) throw new UpstreamFailure('TOO_LARGE');
  try { return {value: JSON.parse(text), height: answered, origin}; } catch { throw new UpstreamFailure('MALFORMED'); }
}
/** A zod parse whose failure is MALFORMED (the zod issue text never leaves the server). */
export function shape<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new UpstreamFailure('MALFORMED');
  return parsed.data;
}
export function ensure(condition: boolean, reason: UnavailableReason): asserts condition {
  if (!condition) throw new UpstreamFailure(reason);
}
/** A CosmWasm smart query's LCD path. The JSON is ZIGoals' own constant; its base64 must be path-safe. */
export function smartPath(contract: string, query: unknown): string {
  if (!/^zig1[02-9ac-hj-np-z]{38,58}$/.test(contract)) throw new Error('Not a ZIGChain contract address.');
  const encoded = btoa(JSON.stringify(query));
  if (!/^[A-Za-z0-9=]+$/.test(encoded)) throw new Error('Unexpected query encoding.');
  return `/cosmwasm/wasm/v1/contract/${contract}/smart/${encoded}`;
}

import type {LcdNetwork} from '../../earn/live/types';
export type {LcdNetwork};
/** ZIGChain's LCDs, official first; Polkachu's only when the official one is down or slow (rotation, H42). */
export const LCDS: Readonly<Record<LcdNetwork, {chainId: string; origins: readonly EarnOrigin[]}>> = Object.freeze({
  mainnet: {chainId: 'zigchain-1', origins: ['https://api.zigchain.com', 'https://zigchain-api.polkachu.com']},
  testnet: {chainId: 'zig-test-2', origins: ['https://testnet-api.zigchain.com']},
});
export const LCD_NAMES: Readonly<Record<string, string>> = Object.freeze({
  'https://api.zigchain.com': 'ZIGChain mainnet LCD (official)', 'https://zigchain-api.polkachu.com': 'ZIGChain mainnet LCD (Polkachu)',
  'https://testnet-api.zigchain.com': 'ZIGChain testnet LCD (official)',
});
export type Latest = {height: string; time: string; chainId: string};
export type AtHeight<T> = {origin: EarnOrigin; latest: Latest; value: T};
const LATEST_PATH = '/cosmos/base/tendermint/v1beta1/blocks/latest';
/**
 * Reads the latest block, then everything `read` asks for at that one height, from the first LCD that answers. A wrong
 * chain id stops at once (WRONG_NETWORK); only an LCD that is down or too slow moves the read to the next one.
 */
export async function readAtOneHeight<T>(fetcher: Fetcher, network: LcdNetwork, read: (get: (path: string, maxChars?: number) => Promise<unknown>, latest: Latest) => Promise<T>): Promise<AtHeight<T>> {
  const {chainId, origins} = LCDS[network];
  let last: UpstreamFailure = new UpstreamFailure('UPSTREAM_DOWN');
  for (const origin of origins) {
    const deadline = AbortSignal.timeout(30_000);
    try {
      const block = (await getJson(fetcher, origin + LATEST_PATH, {maxChars: 200_000, signal: deadline})).value as {block?: {header?: {height?: unknown; time?: unknown; chain_id?: unknown}}};
      const header = block?.block?.header;
      ensure(typeof header?.height === 'string' && /^[1-9]\d{0,19}$/.test(header.height) && typeof header.time === 'string' && typeof header.chain_id === 'string', 'MALFORMED');
      ensure(header.chain_id === chainId, 'WRONG_NETWORK');
      const latest = {height: header.height, time: header.time, chainId: header.chain_id};
      const value = await read(async (path, maxChars = 200_000) => (await getJson(fetcher, origin + path, {maxChars, height: latest.height, signal: deadline})).value, latest);
      return {origin, latest, value};
    } catch (error) {
      if (!(error instanceof UpstreamFailure)) throw error;
      if (error.reason !== 'UPSTREAM_DOWN' && error.reason !== 'TIMEOUT') throw error;
      last = error;
    }
  }
  throw last;
}
