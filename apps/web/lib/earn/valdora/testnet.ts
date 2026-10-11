/**
 * Read-only tracker for Valdora's stZIG staker on ZIGChain testnet (zig-test-2). Session N, owner decisions N4 and N5.
 *
 * - Testnet only, reads only. Nothing here builds a message to sign, holds a key or moves value, and no page imports it.
 * - Pinned to what the chain itself reported at block 8,046,854 on 2026-10-02: contract, code ID, code checksum,
 *   contract version, stZIG denom and decimals (docs/earn/EVIDENCE_2026-10.md, section b). Any difference fails closed.
 * - Query names and response shapes come from the deployed contract's own answers (N5); no schema is published.
 *   A holder's stZIG is read from the bank module, whose units the chain's own denom metadata defines (6 decimals).
 * - The staker's price answers are returned as the contract states them and are never turned into a ZIG value: their
 *   units are not documented (the fields are still named uzig_amount and stzig_amount after the 18-decimal migration).
 * - Amounts stay decimal strings; any arithmetic is BigInt.
 */
import * as z from 'zod';
import { READ_NETWORKS, publicZigAddress } from '../../position-reader';
import { units } from '../../positions';

const testnet = READ_NETWORKS.TESTNET_READ_ONLY;

export const VALDORA_TESTNET = Object.freeze({
  chainId: 'zig-test-2',
  rest: testnet.rest,
  staker: 'zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69',
  stakerLabel: 'stZIG Staker',
  codeId: '2532',
  checksum: '2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C',
  contract: 'stzig-staker',
  version: '1.1.0',
  stZigDenom: 'coin.zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr.stzig',
  stZigDecimals: 6,
  nativeDenom: testnet.denom,
  nativeDecimals: testnet.decimals,
  /** Largest response body accepted, in characters. */
  maxBody: 200_000,
});

export type Failure =
  | 'INVALID_INPUT'
  | 'UNAVAILABLE'
  | 'TOO_LARGE'
  | 'MALFORMED'
  | 'WRONG_NETWORK'
  | 'HEIGHT_MISMATCH'
  | 'CODE_ID_MISMATCH'
  | 'CHECKSUM_MISMATCH'
  | 'VERSION_MISMATCH'
  | 'PAUSED'
  | 'DENOM_MISMATCH'
  | 'DECIMALS_MISMATCH';
export type Result<T> = { ok: true; value: T } | { ok: false; reason: Failure };
const fail = (reason: Failure): { ok: false; reason: Failure } => ({ ok: false, reason });

// ---------- Queries ----------

export type ValdoraQuery =
  | { kind: 'contract_version' | 'paused' | 'protocol_info' | 'total_supply' | 'token_contract' }
  | { kind: 'st_zig_balance'; address: string }
  | { kind: 'st_zig_price' | 'reverse_st_zig_price'; amount: string };

/** The staker smart query for `query`, as the LCD path that carries it. Throws on input it would not send. */
export function buildValdoraQuery(query: ValdoraQuery): { contract: string; path: string; message: string } {
  let body: Record<string, Record<string, string>>;
  if (query.kind === 'st_zig_balance') {
    if (!publicZigAddress.safeParse(query.address).success) throw Error('Invalid public ZIGChain address.');
    body = { st_zig_balance: { address: query.address } };
  } else if (query.kind === 'st_zig_price' || query.kind === 'reverse_st_zig_price') {
    if (!units.safeParse(query.amount).success || BigInt(query.amount) === 0n) throw Error('Amount must be a positive integer string.');
    body = { [query.kind]: { amount: query.amount } };
  } else body = { [query.kind]: {} };
  const message = JSON.stringify(body);
  const encoded = btoa(message);
  // Bech32 addresses, digits and this JSON never produce "+" or "/"; refuse rather than send an ambiguous path.
  if (!/^[A-Za-z0-9=]+$/.test(encoded)) throw Error('Unexpected query encoding.');
  return { contract: VALDORA_TESTNET.staker, path: `/cosmwasm/wasm/v1/contract/${VALDORA_TESTNET.staker}/smart/${encoded}`, message };
}

export const VALDORA_PATHS = Object.freeze({
  latestBlock: '/cosmos/base/tendermint/v1beta1/blocks/latest',
  nodeInfo: '/cosmos/base/tendermint/v1beta1/node_info',
  contractInfo: `/cosmwasm/wasm/v1/contract/${VALDORA_TESTNET.staker}`,
  codeInfo: `/cosmwasm/wasm/v1/code-info/${VALDORA_TESTNET.codeId}`,
  denomMetadata: `/cosmos/bank/v1beta1/denoms_metadata/${VALDORA_TESTNET.stZigDenom}`,
  bankBalance: (address: string) => `/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${VALDORA_TESTNET.stZigDenom}`,
});

// ---------- Parsers: each returns the value or why it was refused ----------

const address = z.string().max(100).regex(/^zig1[02-9ac-hj-np-z]{38,58}$/);
const contractData = <T extends z.ZodRawShape>(shape: T) => z.strictObject({ data: z.strictObject(shape) });
const schemas = {
  latestBlock: z.object({ block: z.object({ header: z.object({ chain_id: z.string().max(100), height: units, time: z.iso.datetime({ offset: true }) }) }) }),
  nodeInfo: z.object({ default_node_info: z.object({ network: z.string().max(100) }) }),
  contractInfo: z.object({ address, contract_info: z.object({ code_id: units, label: z.string().max(200), admin: z.string().max(100) }) }),
  codeInfo: z.object({ code_id: units, checksum: z.string().regex(/^[0-9A-F]{64}$/) }),
  contractVersion: contractData({ contract: z.string().max(100), version: z.string().max(40) }),
  paused: contractData({ paused: z.boolean() }),
  protocolInfo: contractData({
    token_name: z.string().max(100),
    token_denom: z.string().max(200),
    minting_cap: units,
    min_stzig: units,
    min_deposit: units,
    max_withdrawal_scan_limit: z.number().int().nonnegative(),
    withdrawal_request_limit: z.number().int().nonnegative(),
    fees_percentage: units,
    treasury_address: address,
  }),
  totalSupply: contractData({ total_supply: units }),
  tokenContract: contractData({ token_contract: address }),
  stZigBalance: contractData({ address, balance: units }),
  price: contractData({ stzig_amount: units, uzig_amount: units }),
  denomMetadata: z.object({ metadata: z.object({ base: z.string().max(200), display: z.string().max(100), denom_units: z.array(z.object({ denom: z.string().max(200), exponent: z.number().int().nonnegative() })).max(10) }) }),
  bankBalance: z.object({ balance: z.strictObject({ denom: z.string().max(200), amount: units }) }),
};
type Schemas = typeof schemas;
type Parsed<K extends keyof Schemas> = z.infer<Schemas[K]>;
const parser = <K extends keyof Schemas>(key: K) => (json: unknown): Result<Parsed<K>> => {
  const parsed = schemas[key].safeParse(json);
  return parsed.success ? { ok: true, value: parsed.data as Parsed<K> } : fail('MALFORMED');
};
export const parseLatestBlock = parser('latestBlock');
export const parseNodeInfo = parser('nodeInfo');
export const parseContractInfo = parser('contractInfo');
export const parseCodeInfo = parser('codeInfo');
export const parseContractVersion = parser('contractVersion');
export const parsePaused = parser('paused');
export const parseProtocolInfo = parser('protocolInfo');
export const parseTotalSupply = parser('totalSupply');
export const parseTokenContract = parser('tokenContract');
export const parseStZigBalance = parser('stZigBalance');
export const parsePrice = parser('price');
export const parseDenomMetadata = parser('denomMetadata');
export const parseBankBalance = parser('bankBalance');

/** A base-unit amount shown with `decimals` places, BigInt only (no floats): "18633318795402", 6 → "18633318.795402". */
export function displayAmount(amount: string, decimals: number): string {
  if (!units.safeParse(amount).success || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw Error('Invalid amount or decimals.');
  if (decimals === 0) return BigInt(amount).toString();
  const scale = 10n ** BigInt(decimals), value = BigInt(amount);
  const fraction = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return fraction ? `${value / scale}.${fraction}` : `${value / scale}`;
}

// ---------- Reader ----------

export type ValdoraTestnetReading = {
  /** The holder's stZIG from the bank module, in base units, with the decimals the chain's metadata defines. */
  stZig: { amount: string; denom: string; decimals: number };
  /** The staker's own answers, as it states them. Units of the price answer are not documented: never a ZIG value. */
  contractAnswer: {
    stZigBalance: string;
    totalSupply: string;
    priceForOneStZigUnitsUnverified: { stzig_amount: string; uzig_amount: string };
  };
  observedAt: string;
  block: string;
  source: string;
};

/** Reads one holder's stZIG on testnet at a single block height. Fails closed on anything unexpected. */
export async function readValdoraTestnet(fetcher: typeof fetch, holder: string): Promise<Result<ValdoraTestnetReading>> {
  if (!publicZigAddress.safeParse(holder).success) return fail('INVALID_INPUT');
  const deadline = AbortSignal.timeout(30_000);
  async function readAt(path: string, height?: string): Promise<Result<unknown>> {
    let response: Response;
    try {
      response = await fetcher(VALDORA_TESTNET.rest + path, {
        method: 'GET', headers: height ? { 'x-cosmos-block-height': height } : undefined, credentials: 'omit',
        referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store', signal: AbortSignal.any([deadline, AbortSignal.timeout(12_000)]),
      });
    } catch { return fail('UNAVAILABLE'); }
    if (!response.ok) return fail('UNAVAILABLE');
    if (height && response.headers.get('x-cosmos-block-height') !== height) return fail('HEIGHT_MISMATCH');
    const text = await response.text();
    if (text.length > VALDORA_TESTNET.maxBody) return fail('TOO_LARGE');
    try { return { ok: true, value: JSON.parse(text) as unknown }; } catch { return fail('MALFORMED'); }
  }
  const step = async <T>(path: string, parse: (json: unknown) => Result<T>, height?: string): Promise<Result<T>> => {
    const raw = await readAt(path, height);
    return raw.ok ? parse(raw.value) : raw;
  };

  const latest = await step(VALDORA_PATHS.latestBlock, parseLatestBlock);
  if (!latest.ok) return latest;
  const { chain_id, height, time } = latest.value.block.header;
  if (chain_id !== VALDORA_TESTNET.chainId) return fail('WRONG_NETWORK');
  const at = <T>(path: string, parse: (json: unknown) => Result<T>) => step(path, parse, height);

  const node = await at(VALDORA_PATHS.nodeInfo, parseNodeInfo);
  if (!node.ok) return node;
  if (node.value.default_node_info.network !== VALDORA_TESTNET.chainId) return fail('WRONG_NETWORK');
  const info = await at(VALDORA_PATHS.contractInfo, parseContractInfo);
  if (!info.ok) return info;
  if (info.value.address !== VALDORA_TESTNET.staker || info.value.contract_info.code_id !== VALDORA_TESTNET.codeId || info.value.contract_info.label !== VALDORA_TESTNET.stakerLabel) return fail('CODE_ID_MISMATCH');
  const code = await at(VALDORA_PATHS.codeInfo, parseCodeInfo);
  if (!code.ok) return code;
  if (code.value.code_id !== VALDORA_TESTNET.codeId || code.value.checksum !== VALDORA_TESTNET.checksum) return fail('CHECKSUM_MISMATCH');
  const version = await at(buildValdoraQuery({ kind: 'contract_version' }).path, parseContractVersion);
  if (!version.ok) return version;
  if (version.value.data.contract !== VALDORA_TESTNET.contract || version.value.data.version !== VALDORA_TESTNET.version) return fail('VERSION_MISMATCH');
  const paused = await at(buildValdoraQuery({ kind: 'paused' }).path, parsePaused);
  if (!paused.ok) return paused;
  if (paused.value.data.paused) return fail('PAUSED');
  const protocol = await at(buildValdoraQuery({ kind: 'protocol_info' }).path, parseProtocolInfo);
  if (!protocol.ok) return protocol;
  if (protocol.value.data.token_denom !== VALDORA_TESTNET.stZigDenom) return fail('DENOM_MISMATCH');
  const metadata = await at(VALDORA_PATHS.denomMetadata, parseDenomMetadata);
  if (!metadata.ok) return metadata;
  const { base, display, denom_units } = metadata.value.metadata;
  const shown = denom_units.find(unit => unit.denom === display);
  if (base !== VALDORA_TESTNET.stZigDenom || !denom_units.some(unit => unit.denom === base && unit.exponent === 0)) return fail('DENOM_MISMATCH');
  if (!shown || shown.exponent !== VALDORA_TESTNET.stZigDecimals) return fail('DECIMALS_MISMATCH');
  const balance = await at(VALDORA_PATHS.bankBalance(holder), parseBankBalance);
  if (!balance.ok) return balance;
  if (balance.value.balance.denom !== VALDORA_TESTNET.stZigDenom) return fail('DENOM_MISMATCH');
  const stakerBalance = await at(buildValdoraQuery({ kind: 'st_zig_balance', address: holder }).path, parseStZigBalance);
  if (!stakerBalance.ok) return stakerBalance;
  if (stakerBalance.value.data.address !== holder) return fail('MALFORMED');
  const supply = await at(buildValdoraQuery({ kind: 'total_supply' }).path, parseTotalSupply);
  if (!supply.ok) return supply;
  const oneStZig = (10n ** BigInt(VALDORA_TESTNET.stZigDecimals)).toString();
  const price = await at(buildValdoraQuery({ kind: 'st_zig_price', amount: oneStZig }).path, parsePrice);
  if (!price.ok) return price;
  return {
    ok: true,
    value: {
      stZig: { amount: balance.value.balance.amount, denom: VALDORA_TESTNET.stZigDenom, decimals: shown.exponent },
      contractAnswer: { stZigBalance: stakerBalance.value.data.balance, totalSupply: supply.value.data.total_supply, priceForOneStZigUnitsUnverified: price.value.data },
      observedAt: new Date(time).toISOString(),
      block: height,
      source: `${VALDORA_TESTNET.rest} · block ${height}`,
    },
  };
}
