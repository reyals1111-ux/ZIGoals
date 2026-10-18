import {fromBase64, fromBech32, toBech32} from '@cosmjs/encoding';
import * as z from 'zod';
import {MAX_WIRE_VALIDATORS, validatorsWireSchema, type ValidatorsWire, type WireValidator} from '../chain/validators-wire';

/**
 * Session AF (ADR-028 H16, H58; `TIER 3 (egress routes)`): the validator facts behind GET /api/chain/validators. Address-free
 * chain data, read by ZIGoals' server from the network's official LCD only (api.zigchain.com, testnet-api.zigchain.com),
 * every read pinned to one block height (the `x-cosmos-block-height` request header the LCD refuses on a browser
 * preflight, which is why this is a server read). Per validator: the staking record, its signing info (uptime, tombstone,
 * keyed by the `zigvalcons` address of its consensus key) and its self-bond (the delegation of the `zig1` account with the
 * operator's 20 bytes). Amounts stay integer strings of azig; shares and rates are exact decimal strings (BigInt), never
 * floats. A failure is thrown and the route answers `status: 'unavailable'` with a reason (H58).
 */
export const VALIDATOR_LCDS = Object.freeze({'zigchain-1': 'https://api.zigchain.com', 'zig-test-2': 'https://testnet-api.zigchain.com'} as const);
export type ValidatorNetwork = keyof typeof VALIDATOR_LCDS;
const MAX_BODY = 2_000_000, PAGES = 5, SELF_BOND_PARALLEL = 8;
const units = z.string().regex(/^(0|[1-9]\d{0,77})$/);
const dec = z.string().regex(/^\d{1,30}(\.\d{1,18})?$/);
const page = z.object({pagination: z.object({next_key: z.string().max(2000).nullable().optional()}).nullable().optional()});
const validatorRow = z.object({
  operator_address: z.string().max(100),
  consensus_pubkey: z.object({'@type': z.string().max(100), key: z.string().max(200)}).nullable().optional(),
  jailed: z.boolean(),
  status: z.enum(['BOND_STATUS_BONDED', 'BOND_STATUS_UNBONDING', 'BOND_STATUS_UNBONDED']),
  tokens: units,
  description: z.object({moniker: z.string().max(10_000).optional(), website: z.string().max(10_000).optional()}),
  commission: z.object({commission_rates: z.object({rate: dec, max_rate: dec, max_change_rate: dec}), update_time: z.string().max(60)}),
});
const signingRow = z.object({address: z.string().max(100), tombstoned: z.boolean(), missed_blocks_counter: z.string().regex(/^\d{1,19}$/)});

/** "0.050000000000000000" → "0.05"; "1.000000000000000000" → "1". Refuses anything outside 0–1. */
export function unitDecimalOf(value: string): string {
  const [whole = '', fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  const out = `${BigInt(whole)}${trimmed ? `.${trimmed}` : ''}`;
  if (!/^(0(\.\d{1,18})?|1)$/.test(out)) throw Error('A rate outside 0–1.');
  return out;
}
/** part ÷ whole as an exact decimal string with up to 18 places (floored), between 0 and 1. */
export function shareOf(part: bigint, whole: bigint): string {
  if (whole <= 0n || part <= 0n) return '0';
  if (part >= whole) return '1';
  const scaled = (part * 10n ** 18n) / whole;
  const fraction = scaled.toString().padStart(18, '0').replace(/0+$/, '');
  return fraction ? `0.${fraction}` : '0';
}
/** The `zigvalcons` address of an ed25519 consensus key (SHA-256 of the key, first 20 bytes). */
export async function valconsOf(pubkey: {'@type': string; key: string}): Promise<string | undefined> {
  if (pubkey['@type'] !== '/cosmos.crypto.ed25519.PubKey') return undefined;
  const key = fromBase64(pubkey.key);
  if (key.length !== 32) return undefined;
  return toBech32('zigvalcons', new Uint8Array(await crypto.subtle.digest('SHA-256', key)).slice(0, 20));
}
export async function readValidators(network: ValidatorNetwork, fetcher: typeof fetch = fetch): Promise<ValidatorsWire> {
  const rest = VALIDATOR_LCDS[network];
  if (!rest) throw Error('Unsupported network.');
  const deadline = AbortSignal.timeout(45_000);
  async function get(path: string, height?: string, allowNotFound = false): Promise<unknown> {
    const response = await fetcher(rest + path, {method: 'GET', headers: height ? {'x-cosmos-block-height': height} : undefined, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store', signal: AbortSignal.any([deadline, AbortSignal.timeout(12_000)])});
    const text = await response.text();
    if (text.length > MAX_BODY) throw Error('The chain answer was too large.');
    if (allowNotFound && response.status === 404) { const body = JSON.parse(text) as {code?: unknown}; if (body?.code === 5) return null; }
    if (!response.ok) throw Error('The chain did not answer just now.');
    if (height && response.headers.get('x-cosmos-block-height') !== height) throw Error('The chain answered from a different block.');
    return JSON.parse(text);
  }
  const header = z.object({block: z.object({header: z.object({height: z.string().regex(/^[1-9]\d{0,19}$/), chain_id: z.string(), time: z.iso.datetime({offset: true})})})}).parse(await get('/cosmos/base/tendermint/v1beta1/blocks/latest')).block.header;
  if (header.chain_id !== network) throw Error('The chain answered for another network.');
  const height = header.height;
  async function pages<T>(path: string, key: string, schema: z.ZodType<T>): Promise<T[]> {
    const all: T[] = []; let cursor = ''; const seen = new Set<string>();
    for (let i = 0; i < PAGES; i++) {
      const value = await get(`${path}?pagination.limit=100${cursor ? `&pagination.key=${encodeURIComponent(cursor)}` : ''}`, height);
      all.push(...z.array(schema).max(100).parse(z.record(z.string(), z.unknown()).parse(value)[key]));
      cursor = page.parse(value).pagination?.next_key ?? '';
      if (!cursor) return all;
      if (seen.has(cursor)) throw Error('Repeated pagination cursor.');
      seen.add(cursor);
    }
    throw Error('Too many validators for one answer.');
  }
  const [rows, signing, slashing, pool] = await Promise.all([
    pages('/cosmos/staking/v1beta1/validators', 'validators', validatorRow),
    pages('/cosmos/slashing/v1beta1/signing_infos', 'info', signingRow),
    get('/cosmos/slashing/v1beta1/params', height),
    get('/cosmos/staking/v1beta1/pool', height),
  ]);
  if (rows.length > MAX_WIRE_VALIDATORS) throw Error('Too many validators for one answer.');
  const window = Number(z.object({params: z.object({signed_blocks_window: z.string().regex(/^[1-9]\d{0,9}$/)})}).parse(slashing).params.signed_blocks_window);
  const bonded = BigInt(z.object({pool: z.object({bonded_tokens: units})}).parse(pool).pool.bonded_tokens);
  const infos = new Map(signing.map(s => [s.address, s]));
  const selfBond = async (operator: string): Promise<string | null> => {
    try {
      const account = toBech32('zig', fromBech32(operator, 90).data);
      const value = await get(`/cosmos/staking/v1beta1/validators/${operator}/delegations/${account}`, height, true);
      if (value === null) return '0';
      const balance = z.object({delegation_response: z.object({balance: z.object({denom: z.literal('azig'), amount: units})})}).parse(value).delegation_response.balance;
      return balance.amount;
    } catch { return null; }
  };
  const validators: WireValidator[] = [];
  for (let i = 0; i < rows.length; i += SELF_BOND_PARALLEL) {
    const batch = rows.slice(i, i + SELF_BOND_PARALLEL);
    const [bonds, consensus] = await Promise.all([Promise.all(batch.map(r => selfBond(r.operator_address))), Promise.all(batch.map(r => r.consensus_pubkey ? valconsOf(r.consensus_pubkey).catch(() => undefined) : undefined))]);
    batch.forEach((r, j) => {
      const info = consensus[j] ? infos.get(consensus[j]!) : undefined;
      const missed = info ? Number(info.missed_blocks_counter) : 0;
      validators.push({
        operator: r.operator_address,
        moniker: (r.description.moniker ?? '').slice(0, 200),
        website: (r.description.website ?? '').slice(0, 300),
        status: r.status === 'BOND_STATUS_BONDED' ? 'bonded' : r.status === 'BOND_STATUS_UNBONDING' ? 'unbonding' : 'unbonded',
        jailed: r.jailed,
        tombstoned: info ? info.tombstoned : null,
        tokens: r.tokens,
        votingPowerShare: r.status === 'BOND_STATUS_BONDED' ? shareOf(BigInt(r.tokens), bonded) : '0',
        commission: {rate: unitDecimalOf(r.commission.commission_rates.rate), maxRate: unitDecimalOf(r.commission.commission_rates.max_rate), maxChangeRate: unitDecimalOf(r.commission.commission_rates.max_change_rate), updatedAt: new Date(r.commission.update_time).toISOString()},
        selfBond: bonds[j] ?? null,
        uptime: info && missed <= window ? {window, missed, signedShare: shareOf(BigInt(window - missed), BigInt(window))} : null,
      });
    });
  }
  validators.sort((a, b) => a.moniker.localeCompare(b.moniker) || a.operator.localeCompare(b.operator));
  return validatorsWireSchema.parse({version: 1, status: 'ok', network, height, observedAt: new Date(header.time).toISOString(), source: rest, bondedTotal: bonded.toString(), validators});
}
export const VALIDATORS_UNAVAILABLE = 'The chain did not answer just now, so validator facts are unavailable. Try again in a minute.';
export function unavailableValidators(network: ValidatorNetwork, reason = VALIDATORS_UNAVAILABLE): ValidatorsWire {
  return validatorsWireSchema.parse({version: 1, status: 'unavailable', reason, network, source: VALIDATOR_LCDS[network], validators: []});
}
