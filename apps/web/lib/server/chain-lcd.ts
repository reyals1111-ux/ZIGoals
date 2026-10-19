import * as z from 'zod';
import {VALIDATOR_LCDS, type ValidatorNetwork} from './chain-validators';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16, H42, H58; `TIER 3 (egress routes)`): one coherent read of a ZIGChain network's
 * official LCD for the routes under /api/chain/* (proposals, a proposal, a vote, grants). The pattern of
 * lib/server/chain-validators.ts: the latest block is read first, then every other read is pinned to that height with the
 * `x-cosmos-block-height` request header (which the LCD refuses on a browser preflight — one reason these are server
 * reads), and an answer from any other block is refused. GET only, no credentials, no redirects, bounded bodies and time;
 * egress only to the two official LCDs (VALIDATOR_LCDS). Nothing is logged; a failure throws and the route answers
 * `status: 'unavailable'` with a reason (H58).
 */
export type ChainNetwork = ValidatorNetwork;
export const CHAIN_LCDS = VALIDATOR_LCDS;
export const isChainNetwork = (value: unknown): value is ChainNetwork => typeof value === 'string' && Object.hasOwn(CHAIN_LCDS, value);
const MAX_BODY = 2_000_000;
/** The LCD's own "not found" answers a read may accept: gRPC NotFound (5) and the gov module's InvalidArgument (3). */
export type NotFoundCodes = readonly number[];
export type LcdBlock = {height: string; observedAt: string};
export class LcdRefused extends Error {}
export function lcdReader(network: ChainNetwork, fetcher: typeof fetch = fetch, budgetMs = 30_000) {
  const rest = CHAIN_LCDS[network];
  if (!rest) throw new LcdRefused('Unsupported network.');
  const deadline = AbortSignal.timeout(budgetMs);
  async function get(path: string, height?: string, notFound: NotFoundCodes = []): Promise<unknown> {
    if (!path.startsWith('/cosmos/')) throw new LcdRefused('Only Cosmos module reads.');
    const response = await fetcher(rest + path, {method: 'GET', headers: height ? {'x-cosmos-block-height': height} : undefined, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store', signal: AbortSignal.any([deadline, AbortSignal.timeout(12_000)])});
    const text = await response.text();
    if (text.length > MAX_BODY) throw new LcdRefused('The chain answer was too large.');
    if (notFound.length && (response.status === 404 || response.status === 400)) {
      let body: {code?: unknown} | null = null;
      try { body = JSON.parse(text) as {code?: unknown}; } catch { /* not the chain's own error shape */ }
      if (typeof body?.code === 'number' && notFound.includes(body.code) && /not found|doesn't exist|does not exist/i.test(String((body as {message?: unknown}).message ?? ''))) return null;
    }
    if (!response.ok) throw new LcdRefused('The chain did not answer just now.');
    if (height && response.headers.get('x-cosmos-block-height') !== height) throw new LcdRefused('The chain answered from a different block.');
    return JSON.parse(text);
  }
  const latestSchema = z.object({block: z.object({header: z.object({height: z.string().regex(/^[1-9]\d{0,19}$/), chain_id: z.string().max(64), time: z.iso.datetime({offset: true})})})});
  return {
    source: rest,
    get,
    /** The block every other read of this answer is pinned to; refuses another network's node. */
    async latest(): Promise<LcdBlock> {
      const header = latestSchema.parse(await get('/cosmos/base/tendermint/v1beta1/blocks/latest')).block.header;
      if (header.chain_id !== network) throw new LcdRefused('The chain answered for another network.');
      return {height: header.height, observedAt: new Date(header.time).toISOString()};
    },
  };
}
/** "345600s" → 345600; anything else is refused (never guessed). */
export function secondsOf(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{1,12}(\.\d{1,9})?s$/.test(value)) throw new LcdRefused('A duration the chain did not write as seconds.');
  return Math.floor(Number(value.slice(0, -1)));
}
/** The amount of azig in a coin list (other denoms ignored, never added); "0" when there is none. */
export function azigOf(coins: unknown): string {
  const list = z.array(z.object({denom: z.string().max(200), amount: z.string().regex(/^(0|[1-9]\d{0,77})$/)})).max(50).parse(coins ?? []);
  return list.filter(c => c.denom === 'azig').reduce((n, c) => n + BigInt(c.amount), 0n).toString();
}
