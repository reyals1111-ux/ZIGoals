import * as z from 'zod';
import {ATTESTATION_CHAIN_ID, ATTESTATION_MEMO, ATTESTATION_TYPE_URL} from '../app-environment';
import {ATTESTATION_SOURCE, attestationsWireSchema, type AttestationsWire} from '../staking/attestation';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 D4, H16 (a), H42, H48; `TIER 3 (egress routes)`): the practice badges an address
 * wrote, read back for GET /api/chain/attestations — ZIGChain Testnet only. The official LCDs refuse transaction searches
 * (`?query=`: 403 from testnet-api.zigchain.com, read 2026-10-19 00:15 UTC, as R5 found for api.zigchain.com), so this one
 * read goes to Polkachu's public testnet LCD (zigchain-testnet-api.polkachu.com, network zig-test-2 checked in the same
 * read), sender-scoped as H42 says: the address's own sends, newest first, at most 50. Only a 1 azig send from the address
 * to itself, alone in its transaction, succeeded, with a memo in the attestation format counts; everything else is left
 * out. An address-bearing read through ZIGoals' relay (H16 (a)): GET only, no credentials, bounded, nothing logged.
 */
export {ATTESTATION_SOURCE};
const MAX_BODY = 2_000_000;
const txRow = z.object({
  txhash: z.string().regex(/^[0-9A-Fa-f]{64}$/), height: z.string().regex(/^[1-9]\d{0,19}$/), code: z.number().int(), timestamp: z.iso.datetime({offset: true}),
  tx: z.object({body: z.object({memo: z.string().max(512), messages: z.array(z.object({'@type': z.string().max(200)}).loose()).max(100)}).loose()}).loose(),
}).loose();
async function get(path: string, fetcher: typeof fetch, signal: AbortSignal): Promise<unknown> {
  const response = await fetcher(ATTESTATION_SOURCE + path, {method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'manual', cache: 'no-store', signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)])});
  const text = await response.text();
  if (text.length > MAX_BODY) throw Error('The answer was too large.');
  if (!response.ok) throw Error('The mirror did not answer just now.');
  return JSON.parse(text);
}
export async function readAttestations(address: string, fetcher: typeof fetch = fetch): Promise<AttestationsWire> {
  if (!/^zig1[02-9ac-hj-np-z]{38}$/.test(address)) throw Error('Unsupported address.');
  const deadline = AbortSignal.timeout(30_000);
  const query = `message.sender='${address}' AND message.action='${ATTESTATION_TYPE_URL}'`;
  const [info, found] = await Promise.all([
    get('/cosmos/base/tendermint/v1beta1/node_info', fetcher, deadline),
    get(`/cosmos/tx/v1beta1/txs?${new URLSearchParams({query, limit: '50', order_by: 'ORDER_BY_DESC'})}`, fetcher, deadline),
  ]);
  if (z.object({default_node_info: z.object({network: z.string()}).loose()}).loose().parse(info).default_node_info.network !== ATTESTATION_CHAIN_ID) throw Error('The mirror answered for another network.');
  const rows = z.object({tx_responses: z.array(txRow).max(100).nullable().optional()}).loose().parse(found).tx_responses ?? [];
  const items = rows.flatMap(r => {
    const [m, ...more] = r.tx.body.messages as (Record<string, unknown> & {'@type': string})[];
    const amount = m?.amount as {denom?: unknown; amount?: unknown}[] | undefined;
    const self = m && !more.length && m['@type'] === ATTESTATION_TYPE_URL && m.from_address === address && m.to_address === address && Array.isArray(amount) && amount.length === 1 && amount[0]?.denom === 'azig' && amount[0]?.amount === '1';
    return r.code === 0 && self && ATTESTATION_MEMO.test(r.tx.body.memo) ? [{hash: r.txhash.toUpperCase(), height: r.height, at: new Date(r.timestamp).toISOString(), memo: r.tx.body.memo}] : [];
  }).slice(0, 50);
  return attestationsWireSchema.parse({version: 1, status: 'ok', network: ATTESTATION_CHAIN_ID, source: ATTESTATION_SOURCE, observedAt: new Date().toISOString(), items});
}
export const ATTESTATIONS_UNAVAILABLE = 'The public mirror did not answer just now, so your practice badges could not be read back. Try again in a minute.';
export const unavailableAttestations = (reason = ATTESTATIONS_UNAVAILABLE): AttestationsWire =>
  attestationsWireSchema.parse({version: 1, status: 'unavailable', reason, network: ATTESTATION_CHAIN_ID, source: ATTESTATION_SOURCE, items: []});
