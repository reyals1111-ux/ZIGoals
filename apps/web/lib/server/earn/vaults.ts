import 'server-only';
import * as z from 'zod';
import {liveOk, liveUnavailable, type LiveEnvelope} from '../../earn/live/envelope';
import {VAULT_IDS, type VaultId, type VaultRow, type VaultsData} from '../../earn/live/types';
import {vaultsFailures} from '../../earn/live/ranges.mjs';
import {chainSource} from './chain';
import {LCD_NAMES, UpstreamFailure, ensure, readAtOneHeight, shape, smartPath, type Fetcher} from './upstream';

/**
 * Session AF chunk 2 (ADR-028 H84, H88; `TIER 3 (egress routes)`): GET /api/earn/vaults. The vault products built on
 * ZIGChain, read from the chain at one block height, each figure on its own (one that fails leaves the others):
 * - Valdora's three USDC vaults on its site (Stablecoin Yield, Private Credit — the page titled "Opportunistic Credit",
 *   at the slug `private-credit` — and Core Income) and Nawa's USDC vault: assets under management, share price, shares,
 *   pending redemptions, paused, and the deposit asset's denom from the raw key `asset_denom`. Every one held USDC on
 *   Noble (USDC.n) on 2026-10-19, the asset Circle stopped minting on 2026-10-13 (the page says so with its source);
 * - Nawa's stZIG vault: what it holds and its fee number (its units are not published, so it is shown as the raw number);
 * - DeFa by InvoiceMate's own value counter (its `active_tvl`).
 * Each contract is pinned to the code and version the chain reported on 2026-10-19 (PIN_MISMATCH otherwise). No address of
 * a person is read or sent: these are public contracts.
 */
export const USDC_N = 'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4';
export const USDC_INJ = 'ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B';
export const VAULTS_MAINNET = Object.freeze({
  'stablecoin-yield': {label: 'Stablecoin Yield', operator: 'valdora', contract: 'zig1h3au5n3lsyqm32ydz3usgy7r9z7wpx4gttcxmypfecz29adtu64svluenp', codeId: '146', contractName: 'valdora-vault', version: '1.0.1'},
  'private-credit': {label: 'Private Credit (Opportunistic Credit)', operator: 'valdora', contract: 'zig1mayx7wkzensav40j3qc8c5lh6s884jlhsu0c0js058t4u9xcg0mql58gkq', codeId: '146', contractName: 'valdora-vault', version: '1.0.1'},
  'core-income': {label: 'Core Income', operator: 'valdora', contract: 'zig1m526fltgrf70qdsufx9k9fdl4x07usjlydcn32jn83fs6za9c5cswd9grk', codeId: '146', contractName: 'valdora-vault', version: '1.0.1'},
  'nawa-usdc': {label: 'Nawa n1USDC vault', operator: 'nawa', contract: 'zig1fn4rrr5knlg93nf3wyme9fzmgve3fftxu5l7wv90llp77mwg7ctq2lfwtd', codeId: '132', contractName: 'valdora-vault', version: '1.0.0'},
} as const satisfies Record<VaultId, {label: string; operator: 'valdora' | 'nawa'; contract: string; codeId: string; contractName: string; version: string}>);
export const NAWA_ZIG_VAULT = Object.freeze({contract: 'zig1fqxfjv54zavyr9464vj6n2jgw9fxgdnxucf866spedunntw0skcsq9gz33', codeId: '60'});
export const DEFA_TVL_LOGGER = Object.freeze({contract: 'zig19pp9rxhqktgpf2yqkwwx6yekmgvnu3hvj0c4e5rlpw88l0shh3qs9qcdyg', codeId: '109'});
const int = z.string().regex(/^\d{1,40}$/), dec = z.string().regex(/^\d{1,20}(\.\d{1,30})?$/), address = z.string().regex(/^zig1[02-9ac-hj-np-z]{38,58}$/);
const schemas = {
  info: z.object({address, contract_info: z.object({code_id: int, admin: z.string().max(100), label: z.string().max(200)})}),
  aum: z.object({data: z.strictObject({aum: int})}),
  price: z.object({data: z.strictObject({price: dec, total_shares: int, aum: int})}),
  paused: z.object({data: z.strictObject({paused: z.boolean()})}),
  version: z.object({data: z.strictObject({version: z.string().max(40), contract: z.string().max(80)})}),
  raw: z.object({data: z.string().max(400)}),
  totalAum: z.object({data: z.strictObject({total_aum: int})}),
  fee: z.object({data: z.strictObject({fee_percentage: z.number().int().nonnegative().max(1_000_000)})}),
  pool: z.object({data: z.strictObject({pool_addr: address})}),
  tvl: z.object({data: int}),
};
const raw = (contract: string, key: string) => `/cosmwasm/wasm/v1/contract/${contract}/raw/${btoa(key)}`;
const decoded = (value: string) => { try { return JSON.parse(atob(value)) as unknown; } catch { return null; } };
const assetOf = (denom: string): 'USDC.n' | 'USDC.inj' | 'other' => denom === USDC_N ? 'USDC.n' : denom === USDC_INJ ? 'USDC.inj' : 'other';
const failed = (error: unknown): {status: 'unavailable'; reason: UpstreamFailure['reason']} => { if (error instanceof UpstreamFailure) return {status: 'unavailable', reason: error.reason}; throw error; };

export async function readVaults(fetcher: Fetcher, now: () => number = Date.now): Promise<LiveEnvelope<VaultsData>> {
  try {
    const {origin, latest, value} = await readAtOneHeight(fetcher, 'mainnet', async get => {
      const vault = async (id: VaultId): Promise<VaultRow> => {
        const pin = VAULTS_MAINNET[id];
        try {
          const q = (query: unknown) => get(smartPath(pin.contract, query));
          const [info, version, price, pending, paused, denom] = await Promise.all([get(`/cosmwasm/wasm/v1/contract/${pin.contract}`), q({contract_version: {}}), q({price_per_full_share: {}}), q({pending_redemption_aum: {}}), q({paused: {}}), get(raw(pin.contract, 'asset_denom'))]);
          const i = shape(schemas.info, info).contract_info, v = shape(schemas.version, version).data;
          ensure(i.code_id === pin.codeId && v.contract === pin.contractName && v.version === pin.version, 'PIN_MISMATCH');
          const p = shape(schemas.price, price).data, assetDenom = decoded(shape(schemas.raw, denom).data);
          ensure(typeof assetDenom === 'string' && /^ibc\/[0-9A-F]{64}$|^[a-z][a-z0-9/._-]{1,120}$/.test(assetDenom), 'MALFORMED');
          return {status: 'ok', label: pin.label, operator: pin.operator, contract: pin.contract, codeId: i.code_id, contractVersion: v.version, aumUnits: p.aum, decimals: 6, pricePerShare: p.price, totalShares: p.total_shares,
            pendingRedemptionUnits: shape(schemas.aum, pending).data.aum, paused: shape(schemas.paused, paused).data.paused, assetDenom, asset: assetOf(assetDenom), admin: i.admin};
        } catch (error) { return failed(error); }
      };
      const nawaZig = async (): Promise<VaultsData['nawaZig']> => {
        try {
          const q = (query: unknown) => get(smartPath(NAWA_ZIG_VAULT.contract, query));
          const [info, total, fee, pool] = await Promise.all([get(`/cosmwasm/wasm/v1/contract/${NAWA_ZIG_VAULT.contract}`), q({total_aum: {}}), q({fee_percentage: {}}), q({oroswap_pool: {}})]);
          const i = shape(schemas.info, info).contract_info;
          ensure(i.code_id === NAWA_ZIG_VAULT.codeId, 'PIN_MISMATCH');
          return {status: 'ok', contract: NAWA_ZIG_VAULT.contract, totalAumUnits: shape(schemas.totalAum, total).data.total_aum, feeNumber: shape(schemas.fee, fee).data.fee_percentage, oroswapPool: shape(schemas.pool, pool).data.pool_addr, admin: i.admin};
        } catch (error) { return failed(error); }
      };
      const defa = async (): Promise<VaultsData['defa']> => {
        try {
          const [info, tvl] = await Promise.all([get(`/cosmwasm/wasm/v1/contract/${DEFA_TVL_LOGGER.contract}`), get(smartPath(DEFA_TVL_LOGGER.contract, {active_tvl: {}}))]);
          ensure(shape(schemas.info, info).contract_info.code_id === DEFA_TVL_LOGGER.codeId, 'PIN_MISMATCH');
          return {status: 'ok', contract: DEFA_TVL_LOGGER.contract, activeTvlUnits: shape(schemas.tvl, tvl).data};
        } catch (error) { return failed(error); }
      };
      const rows = await Promise.all(VAULT_IDS.map(vault));
      const data: VaultsData = {vaults: Object.fromEntries(VAULT_IDS.map((id, i) => [id, rows[i]!])) as VaultsData['vaults'], nawaZig: await nawaZig(), defa: await defa()};
      // An LCD that is down answered nothing: move to the next one rather than show a page of unavailable figures.
      const all = [...rows, data.nawaZig, data.defa];
      if (all.every(f => f.status === 'unavailable' && (f.reason === 'UPSTREAM_DOWN' || f.reason === 'TIMEOUT'))) throw new UpstreamFailure((all[0] as {reason: UpstreamFailure['reason']}).reason);
      return data;
    });
    // A figure outside its range is withdrawn on its own; the rest of the answer stays.
    for (const name of vaultsFailures(value)) {
      const [kind, id] = name.split(':') as [string, string | undefined];
      if (kind === 'vault' && id) value.vaults[id as VaultId] = {status: 'unavailable', reason: 'OUT_OF_RANGE'};
      else if (kind === 'nawaZig') value.nawaZig = {status: 'unavailable', reason: 'OUT_OF_RANGE'};
      else if (kind === 'defa') value.defa = {status: 'unavailable', reason: 'OUT_OF_RANGE'};
    }
    return liveOk({name: LCD_NAMES[origin] ?? 'ZIGChain mainnet LCD', origin}, value, {height: latest.height, observedAt: new Date(latest.time.replace(/\.(\d{3})\d*Z$/, '.$1Z')).toISOString(), fetchedAt: new Date(now()).toISOString()});
  } catch (error) {
    if (error instanceof UpstreamFailure) return liveUnavailable(chainSource('mainnet'), error.reason, new Date(now()).toISOString());
    throw error;
  }
}
