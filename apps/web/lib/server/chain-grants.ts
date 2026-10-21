import * as z from 'zod';
import {MAX_GRANTS, SEND_GRANT_MESSAGE, STAKE_GRANT_MESSAGES, grantsWireSchema, type Allowance, type Grant, type GrantsWire} from '../staking/grants';
import {azigOf, lcdReader, type ChainNetwork} from './chain-lcd';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16 (a), H45; `TIER 3 (egress routes)`): the permissions an address has given,
 * behind GET /api/chain/grants. An address-bearing read for display, so it goes through ZIGoals' read-only relay as
 * /api/positions does (H16 (a)): the network's official LCD only, at one block height, nothing logged. Paths (each read
 * once live on 2026-10-19 00:15 UTC): /cosmos/authz/v1beta1/grants/granter/{address} (the grants this address gave) and
 * /cosmos/feegrant/v1beta1/issued/{address} (the fee allowances it gave), at most 100 each.
 */
const time = z.iso.datetime({offset: true}).nullable().optional();
const typeUrl = z.string().max(300);
const grantRow = z.object({granter: z.string().max(100), grantee: z.string().max(100), authorization: z.object({'@type': typeUrl}).loose(), expiration: time}).loose();
const allowanceRow = z.object({granter: z.string().max(100), grantee: z.string().max(100), allowance: z.object({'@type': typeUrl}).loose()}).loose();
const list = (key: string, row: z.ZodType) => z.object({[key]: z.array(row).max(MAX_GRANTS), pagination: z.object({next_key: z.string().nullable().optional()}).loose().nullable().optional()}).loose();
const URL_SHAPE = /^\/[A-Za-z0-9_.]{1,199}$/;
const iso = (value: string | null | undefined) => value ? new Date(value).toISOString() : null;
function grantOf(row: z.infer<typeof grantRow>): Grant {
  const a = row.authorization as Record<string, unknown> & {'@type': string};
  const type = URL_SHAPE.test(a['@type']) ? a['@type'] : '/unknown';
  if (type === '/cosmos.authz.v1beta1.GenericAuthorization') return {grantee: row.grantee, kind: 'generic', authorization: type, msgTypeUrl: typeof a.msg === 'string' && URL_SHAPE.test(a.msg) ? a.msg : null, limit: null, validators: null, expiration: iso(row.expiration)};
  if (type === '/cosmos.bank.v1beta1.SendAuthorization') return {grantee: row.grantee, kind: 'send', authorization: type, msgTypeUrl: SEND_GRANT_MESSAGE, limit: Array.isArray(a.spend_limit) && a.spend_limit.length ? azigOf(a.spend_limit) : null, validators: null, expiration: iso(row.expiration)};
  if (type === '/cosmos.staking.v1beta1.StakeAuthorization') {
    const max = a.max_tokens as {denom?: unknown; amount?: unknown} | null | undefined;
    const addresses = (v: unknown) => z.array(z.string().max(100)).max(50).catch([]).parse((v as {address?: unknown} | null | undefined)?.address ?? []);
    return {grantee: row.grantee, kind: 'stake', authorization: type, msgTypeUrl: STAKE_GRANT_MESSAGES[String(a.authorization_type)] ?? null, limit: max && max.denom === 'azig' && typeof max.amount === 'string' && /^(0|[1-9]\d{0,77})$/.test(max.amount) ? max.amount : null, validators: {allow: addresses(a.allow_list), deny: addresses(a.deny_list)}, expiration: iso(row.expiration)};
  }
  return {grantee: row.grantee, kind: 'other', authorization: type, msgTypeUrl: null, limit: null, validators: null, expiration: iso(row.expiration)};
}
function allowanceOf(row: z.infer<typeof allowanceRow>): Allowance {
  let a = row.allowance as Record<string, unknown> & {'@type': string};
  const allowance = URL_SHAPE.test(a['@type']) ? a['@type'] : '/unknown';
  let allowedMessages: string[] = [];
  if (allowance === '/cosmos.feegrant.v1beta1.AllowedMsgAllowance') {
    allowedMessages = z.array(z.string()).max(50).catch([]).parse(a.allowed_messages).filter(m => URL_SHAPE.test(m));
    a = (a.allowance ?? {}) as typeof a;
  }
  const inner = String(a['@type'] ?? '');
  const basic = inner === '/cosmos.feegrant.v1beta1.PeriodicAllowance' ? (a.basic ?? {}) as Record<string, unknown> : a;
  const kind = allowedMessages.length || allowance === '/cosmos.feegrant.v1beta1.AllowedMsgAllowance' ? 'allowed-messages' : inner === '/cosmos.feegrant.v1beta1.BasicAllowance' ? 'basic' : inner === '/cosmos.feegrant.v1beta1.PeriodicAllowance' ? 'periodic' : 'other';
  const limit = Array.isArray(basic.spend_limit) && basic.spend_limit.length ? azigOf(basic.spend_limit) : null;
  return {grantee: row.grantee, kind, allowance, limit, expiration: iso(z.iso.datetime({offset: true}).nullable().optional().catch(null).parse(basic.expiration)), allowedMessages};
}
/** The grants and fee allowances `address` has given on `network`, at one height. */
export async function readGrants(network: ChainNetwork, address: string, fetcher: typeof fetch = fetch): Promise<GrantsWire> {
  if (!/^zig1[02-9ac-hj-np-z]{38}$/.test(address)) throw Error('Unsupported address.');
  const read = lcdReader(network, fetcher);
  const {height, observedAt} = await read.latest();
  const [grants, allowances] = await Promise.all([
    read.get(`/cosmos/authz/v1beta1/grants/granter/${address}?pagination.limit=${MAX_GRANTS}`, height),
    read.get(`/cosmos/feegrant/v1beta1/issued/${address}?pagination.limit=${MAX_GRANTS}`, height),
  ]);
  const g = (list('grants', grantRow).parse(grants).grants as z.infer<typeof grantRow>[]), f = (list('allowances', allowanceRow).parse(allowances).allowances as z.infer<typeof allowanceRow>[]);
  if (g.some(r => r.granter !== address) || f.some(r => r.granter !== address)) throw Error('The chain answered for another address.');
  return grantsWireSchema.parse({version: 1, status: 'ok', network, source: read.source, height, observedAt, grants: g.map(grantOf), allowances: f.map(allowanceOf)});
}
export const GRANTS_UNAVAILABLE = 'The chain did not answer just now, so the permissions you have given could not be read. Try again in a minute.';
export const unavailableGrants = (network: ChainNetwork, reason = GRANTS_UNAVAILABLE): GrantsWire =>
  grantsWireSchema.parse({version: 1, status: 'unavailable', reason, network, source: network === 'zigchain-1' ? 'https://api.zigchain.com' : 'https://testnet-api.zigchain.com', grants: [], allowances: []});
