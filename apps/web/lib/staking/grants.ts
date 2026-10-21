import * as z from 'zod';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H45, H46): the permissions a person's address has given — authz grants (another
 * address may send a message as this one) and fee allowances (another address may pay its fees from this one) — read-only
 * and in plain words, from `GET /api/chain/grants?network=…&address=…` (lib/server/chain-grants.ts). A grant can be
 * revoked (`MsgRevoke`, lib/staking/messages.ts `revoke`) by a direct signer only: CosmJS 0.38 has no Ledger (amino)
 * format for authz. ZIGoals never creates a grant or an allowance, and a fee allowance is shown, not ended (its message is
 * not in H46's list).
 *
 * The typed authorizations (send and stake) carry no message type of their own on the chain's answer, so the table below
 * names the one each covers, as DATA: it is the `msgTypeUrl` field a revoke names, never the type of a signed message
 * (lib/staking/staking-guard.test.ts pins that this file builds no message).
 */
export const GRANT_NETWORKS = ['zigchain-1', 'zig-test-2'] as const;
export const GRANT_SOURCES = ['https://api.zigchain.com', 'https://testnet-api.zigchain.com'] as const;
export const MAX_GRANTS = 100;
const azig = z.string().regex(/^(0|[1-9]\d{0,77})$/);
const iso = z.iso.datetime({offset: true});
/** A ZIGChain account (20 bytes) or contract (32 bytes) address, as the chain writes it. */
const zigAddress = z.string().regex(/^zig1([02-9ac-hj-np-z]{38}|[02-9ac-hj-np-z]{58})$/);
const typeUrl = z.string().regex(/^\/[A-Za-z0-9_.]{1,199}$/);
export const SEND_GRANT_MESSAGE = '/cosmos.bank.v1beta1.MsgSend';
/** StakeAuthorization's `authorization_type` → the one staking message it covers (data, for a revoke). */
export const STAKE_GRANT_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
  AUTHORIZATION_TYPE_DELEGATE: '/cosmos.staking.v1beta1.MsgDelegate',
  AUTHORIZATION_TYPE_UNDELEGATE: '/cosmos.staking.v1beta1.MsgUndelegate',
  AUTHORIZATION_TYPE_REDELEGATE: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
  AUTHORIZATION_TYPE_CANCEL_UNBONDING_DELEGATION: '/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation',
});
export const grantSchema = z.object({
  grantee: zigAddress,
  kind: z.enum(['generic', 'send', 'stake', 'other']),
  /** The authorization's own type, as the chain names it. */
  authorization: typeUrl,
  /** The message the grant lets the grantee send for this address (what a revoke names); null when unknown. */
  msgTypeUrl: typeUrl.nullable(),
  /** Send: the ZIG it may still send; stake: the most it may stake; null = no limit (or not ZIG). */
  limit: azig.nullable(),
  validators: z.object({allow: z.array(z.string().max(100)).max(50), deny: z.array(z.string().max(100)).max(50)}).strict().nullable(),
  expiration: iso.nullable(),
}).strict();
export type Grant = z.infer<typeof grantSchema>;
export const allowanceSchema = z.object({
  grantee: zigAddress,
  kind: z.enum(['basic', 'periodic', 'allowed-messages', 'other']),
  allowance: typeUrl,
  limit: azig.nullable(),
  expiration: iso.nullable(),
  allowedMessages: z.array(typeUrl).max(50),
}).strict();
export type Allowance = z.infer<typeof allowanceSchema>;
export const grantsWireSchema = z.object({
  version: z.literal(1),
  status: z.enum(['ok', 'unavailable']),
  reason: z.string().max(300).optional(),
  network: z.enum(GRANT_NETWORKS),
  source: z.enum(GRANT_SOURCES),
  height: z.string().regex(/^[1-9]\d{0,19}$/).optional(),
  observedAt: iso.optional(),
  grants: z.array(grantSchema).max(MAX_GRANTS),
  allowances: z.array(allowanceSchema).max(MAX_GRANTS),
}).strict().superRefine((wire, context) => {
  if (wire.source !== (wire.network === 'zigchain-1' ? GRANT_SOURCES[0] : GRANT_SOURCES[1])) context.addIssue({code: 'custom', message: 'The source is the network\'s own LCD.'});
  if (wire.status === 'ok' && (!wire.height || !wire.observedAt || wire.reason !== undefined)) context.addIssue({code: 'custom', message: 'An ok answer carries height and observedAt, and no reason.'});
  if (wire.status === 'unavailable' && (!wire.reason || wire.grants.length || wire.allowances.length)) context.addIssue({code: 'custom', message: 'An unavailable answer carries a reason and nothing else.'});
});
export type GrantsWire = z.infer<typeof grantsWireSchema>;

/** What a message lets someone do, by its name (the last part of its type URL). */
const ACTS: Readonly<Record<string, string>> = Object.freeze({
  MsgSend: 'send tokens from your wallet',
  MsgMultiSend: 'send tokens from your wallet',
  MsgDelegate: 'stake your ZIG',
  MsgUndelegate: 'unstake your ZIG',
  MsgBeginRedelegate: 'move your stake between validators',
  MsgCancelUnbondingDelegation: 'cancel your unstaking',
  MsgWithdrawDelegatorReward: 'claim your staking rewards',
  MsgSetWithdrawAddress: 'change where your rewards are paid',
  MsgVote: 'vote for you',
  MsgVoteWeighted: 'vote for you',
  MsgDeposit: 'add to a proposal’s deposit for you',
  MsgSubmitProposal: 'submit a proposal for you',
  MsgExecuteContract: 'use smart contracts for you',
  MsgTransfer: 'send tokens to another chain from your wallet',
  MsgGrant: 'give permissions for you',
  MsgRevoke: 'end permissions for you',
});
export function actWords(msgTypeUrl: string | null): string {
  if (!msgTypeUrl) return 'act for you in a way ZIGoals cannot name';
  const name = msgTypeUrl.split('.').pop() ?? '';
  return ACTS[name] ?? `send "${name}" messages for you`;
}
const short = (address: string) => address.length > 20 ? `${address.slice(0, 10)}…${address.slice(-6)}` : address;
const zig = (azig: string) => { const whole = azig.length > 18 ? azig.slice(0, -18) : '0', fraction = azig.padStart(19, '0').slice(-18).replace(/0+$/, ''); return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''} ZIG`; };
const until = (expiration: string | null) => expiration ? `until ${expiration.slice(0, 10)}` : 'with no end date';
/** One plain sentence per grant: who may do what for this address, how much, until when. */
export function grantWords(grant: Grant): string {
  const limit = grant.kind === 'send' ? grant.limit ? `, up to ${zig(grant.limit)} more` : ', with no limit' : grant.kind === 'stake' && grant.limit ? `, up to ${zig(grant.limit)}` : '';
  const only = grant.validators?.allow.length ? `, only with ${grant.validators.allow.length} chosen validator${grant.validators.allow.length === 1 ? '' : 's'}` : grant.validators?.deny.length ? `, except ${grant.validators.deny.length} validator${grant.validators.deny.length === 1 ? '' : 's'}` : '';
  return `${short(grant.grantee)} may ${actWords(grant.msgTypeUrl)}${limit}${only}, ${until(grant.expiration)}.`;
}
export function allowanceWords(allowance: Allowance): string {
  const limit = allowance.limit ? `up to ${zig(allowance.limit)}` : allowance.kind === 'periodic' ? 'up to a limit each period' : 'with no limit';
  const only = allowance.allowedMessages.length ? ` for ${allowance.allowedMessages.length} kind${allowance.allowedMessages.length === 1 ? '' : 's'} of transaction only` : '';
  return `${short(allowance.grantee)} may use your ZIG to pay its own network fees, ${limit}${only}, ${until(allowance.expiration)}.`;
}
