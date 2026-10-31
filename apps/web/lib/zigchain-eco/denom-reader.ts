import * as z from 'zod';
import {CHAIN_LCDS, isChainNetwork, type ChainNetwork} from '../server/chain-lcd';
import {isCheckableDenom, isCw20Contract, isIbcDenom, parseTraceAnswer, traceMatches, type IbcTrace} from './denoms';
import {denomWireSchema, type DenomWire} from './denom-wire';
export {denomWireSchema, type DenomWire} from './denom-wire';

/**
 * Session AK (F4, IBC and token clarity; `TIER 3 (egress routes)` when the lead mounts it at GET /api/chain/denom): one
 * token's facts from the network's own LCD (api.zigchain.com, testnet-api.zigchain.com — the hosts the chain routes
 * already reach; no new host), address-free: the IBC trace (`/ibc/apps/transfer/v1/denoms/{hash}`, the ibc-go v10 path
 * both networks answer; the older `/denom_traces/{hash}` only when the node says the new one is not implemented), the
 * bank metadata, and for a CW20 contract its `token_info`. The trace is kept only when its recomputed hash equals the
 * denom. Every read pinned to one block height; GET only, no credentials, no redirects, bounded body and time. Names
 * are kept as plain text (control and invisible characters removed, length capped), never markup or links.
 */
export const DENOM_SOURCES = CHAIN_LCDS;
const MAX_BODY = 200_000;

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁤﻿]/g, '').trim().slice(0, max) : '';
export class DenomRefused extends Error {}
const PATHS = ['/cosmos/base/tendermint/v1beta1/blocks/latest', '/ibc/apps/transfer/v1/denoms/', '/ibc/apps/transfer/v1/denom_traces/', '/cosmos/bank/v1beta1/denoms_metadata/', '/cosmwasm/wasm/v1/contract/'];
export async function readDenom(network: ChainNetwork, denom: string, fetcher: typeof fetch = fetch): Promise<DenomWire> {
  if (!isChainNetwork(network) || !isCheckableDenom(denom)) throw new DenomRefused('Unsupported network or denom.');
  const rest = CHAIN_LCDS[network], deadline = AbortSignal.timeout(20_000);
  /** null for the chain's own "not found" (code 5) and, when `unimplemented`, its "not implemented" (code 12). */
  async function get(path: string, height?: string, unimplemented = false): Promise<unknown> {
    if (!PATHS.some(p => path.startsWith(p))) throw new DenomRefused('Not an allowed read.');
    const response = await fetcher(rest + path, {method: 'GET', headers: height ? {'x-cosmos-block-height': height} : undefined, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store', signal: AbortSignal.any([deadline, AbortSignal.timeout(10_000)])});
    const body = await response.text();
    if (body.length > MAX_BODY) throw new DenomRefused('The chain answer was too large.');
    if (!response.ok) {
      let code: unknown;
      try { code = (JSON.parse(body) as {code?: unknown}).code; } catch { /* not the chain's error shape */ }
      if (code === 5 && (response.status === 404 || response.status === 400 || response.status === 500)) return null;
      if (unimplemented && code === 12) return undefined;
      throw new DenomRefused('The chain did not answer just now.');
    }
    if (height && response.headers.get('x-cosmos-block-height') !== height) throw new DenomRefused('The chain answered from a different block.');
    return JSON.parse(body);
  }
  const header = z.object({block: z.object({header: z.object({height: z.string().regex(/^[1-9]\d{0,19}$/), chain_id: z.string().max(64), time: z.iso.datetime({offset: true})})})}).parse(await get(PATHS[0]!)).block.header;
  if (header.chain_id !== network) throw new DenomRefused('The chain answered for another network.');
  const height = header.height;
  let trace: IbcTrace | null = null, traceMismatch = false;
  if (isIbcDenom(denom)) {
    const hash = denom.slice(4).toUpperCase();
    let answer = await get(`/ibc/apps/transfer/v1/denoms/${hash}`, height, true);
    if (answer === undefined) answer = await get(`/ibc/apps/transfer/v1/denom_traces/${hash}`, height, true);
    const parsed = answer ? parseTraceAnswer(answer) : null;
    if (parsed && await traceMatches(denom, parsed)) trace = parsed; else if (parsed) traceMismatch = true;
  }
  let metadata: DenomWire['metadata'] = null;
  if (!isCw20Contract(denom)) {
    const value = await get(`/cosmos/bank/v1beta1/denoms_metadata/${encodeURIComponent(denom)}`, height);
    const m = value ? z.object({metadata: z.object({name: z.unknown().optional(), symbol: z.unknown().optional(), display: z.unknown().optional(), base: z.string().max(200), denom_units: z.array(z.object({denom: z.string().max(200), exponent: z.number().int().min(0).max(30)})).max(20)})}).safeParse(value) : null;
    if (m?.success && m.data.metadata.base === denom) {
      const meta = m.data.metadata, display = clean(meta.display, 80);
      metadata = {name: clean(meta.name, 80), symbol: clean(meta.symbol, 40), display, exponent: meta.denom_units.find(u => u.denom === meta.display)?.exponent ?? null};
    }
  }
  let cw20: DenomWire['cw20'] = null;
  if (isCw20Contract(denom)) {
    const query = btoa(JSON.stringify({token_info: {}}));
    const value = await get(`/cosmwasm/wasm/v1/contract/${denom}/smart/${encodeURIComponent(query)}`, height);
    const info = value ? z.object({data: z.object({name: z.unknown(), symbol: z.unknown(), decimals: z.number().int().min(0).max(30)})}).safeParse(value) : null;
    if (info?.success) cw20 = {name: clean(info.data.data.name, 80), symbol: clean(info.data.data.symbol, 40), decimals: info.data.data.decimals};
  }
  return denomWireSchema.parse({version: 1, status: 'ok', network, denom, height, observedAt: new Date(header.time).toISOString(), trace, ...(traceMismatch ? {traceMismatch} : {}), metadata, cw20});
}
export const DENOM_UNAVAILABLE = 'The chain did not answer just now, so this token could not be checked. Try again in a minute.';
export const unavailableDenom = (network: ChainNetwork, denom: string, reason = DENOM_UNAVAILABLE): DenomWire => denomWireSchema.parse({version: 1, status: 'unavailable', reason, network, denom: denom.slice(0, 140)});
