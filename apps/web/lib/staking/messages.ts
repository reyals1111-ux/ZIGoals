import {isValoper, isZigAccount} from './address';

/**
 * Session AF (ADR-028 H46, H60; `TIER 3 (wallet/signing)`): the only messages ZIGoals ever asks a wallet to sign. Pure
 * builders, no chain access: each returns plain `{typeUrl, value}` objects CosmJS's default registry encodes.
 * - Exactly five types: MsgDelegate, MsgUndelegate, MsgBeginRedelegate, MsgWithdrawDelegatorReward (claim one; claim all
 *   is one signature carrying one per validator, every validator listed on the review screen, H60) and gov **v1beta1**
 *   MsgVote (CosmJS 0.38 has its amino converter, so Ledger can sign it; v1 has none).
 * - ZIG only, by base denom: every amount is `{denom: 'azig', amount: <positive integer string>}`; no builder takes a
 *   denom, so a look-alike token can never be staked from here (lib/staking/decoy-guard.ts).
 * - Addresses are checked: the delegator a `zig1…` account, every validator a `zigvaloper1…` operator (20 bytes).
 */
export const STAKING_TYPE_URLS = Object.freeze({
  delegate: '/cosmos.staking.v1beta1.MsgDelegate',
  undelegate: '/cosmos.staking.v1beta1.MsgUndelegate',
  redelegate: '/cosmos.staking.v1beta1.MsgBeginRedelegate',
  claim: '/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward',
  vote: '/cosmos.gov.v1beta1.MsgVote',
} as const);
export const ZIG_DENOM = 'azig';
/** Claim all: at most this many validators in one signature (the chain bonds at most 14 today). */
export const MAX_CLAIM_VALIDATORS = 32;
export type Coin = {readonly denom: 'azig'; readonly amount: string};
export type DelegateMessage = {readonly typeUrl: typeof STAKING_TYPE_URLS.delegate; readonly value: {readonly delegatorAddress: string; readonly validatorAddress: string; readonly amount: Coin}};
export type UndelegateMessage = {readonly typeUrl: typeof STAKING_TYPE_URLS.undelegate; readonly value: {readonly delegatorAddress: string; readonly validatorAddress: string; readonly amount: Coin}};
export type RedelegateMessage = {readonly typeUrl: typeof STAKING_TYPE_URLS.redelegate; readonly value: {readonly delegatorAddress: string; readonly validatorSrcAddress: string; readonly validatorDstAddress: string; readonly amount: Coin}};
export type ClaimMessage = {readonly typeUrl: typeof STAKING_TYPE_URLS.claim; readonly value: {readonly delegatorAddress: string; readonly validatorAddress: string}};
export type VoteMessage = {readonly typeUrl: typeof STAKING_TYPE_URLS.vote; readonly value: {readonly proposalId: bigint; readonly voter: string; readonly option: number}};
export type StakingMessage = DelegateMessage | UndelegateMessage | RedelegateMessage | ClaimMessage | VoteMessage;
/** gov v1beta1 VoteOption numbers (cosmos-sdk gov.proto). */
export const VOTE_OPTIONS = Object.freeze({yes: 1, abstain: 2, no: 3, no_with_veto: 4} as const);
export type VoteChoice = keyof typeof VOTE_OPTIONS;

export class StakingInputError extends Error {}
function delegator(value: unknown): string {
  if (!isZigAccount(value)) throw new StakingInputError('Connect a ZIGChain wallet first; its address did not pass its checks.');
  return value;
}
function validator(value: unknown): string {
  if (!isValoper(value)) throw new StakingInputError('Choose a ZIGChain validator; that address is not a validator address.');
  return value;
}
/** A positive whole number of azig (the person types ZIG; the form converts with parseUnits at 18 decimals). */
export function zigAmount(amount: unknown): Coin {
  if (typeof amount !== 'string' || !/^[1-9]\d{0,77}$/.test(amount)) throw new StakingInputError('Enter an amount of ZIG above zero.');
  return Object.freeze({denom: ZIG_DENOM, amount});
}
const freeze = <T extends StakingMessage>(message: T): T => { Object.freeze(message.value); return Object.freeze(message); };
export function delegate(input: {delegator: string; validator: string; amount: string}): DelegateMessage {
  return freeze({typeUrl: STAKING_TYPE_URLS.delegate, value: {delegatorAddress: delegator(input.delegator), validatorAddress: validator(input.validator), amount: zigAmount(input.amount)}});
}
export function undelegate(input: {delegator: string; validator: string; amount: string}): UndelegateMessage {
  return freeze({typeUrl: STAKING_TYPE_URLS.undelegate, value: {delegatorAddress: delegator(input.delegator), validatorAddress: validator(input.validator), amount: zigAmount(input.amount)}});
}
export function redelegate(input: {delegator: string; source: string; destination: string; amount: string}): RedelegateMessage {
  const src = validator(input.source), dst = validator(input.destination);
  if (src === dst) throw new StakingInputError('Choose a different validator to move your stake to.');
  return freeze({typeUrl: STAKING_TYPE_URLS.redelegate, value: {delegatorAddress: delegator(input.delegator), validatorSrcAddress: src, validatorDstAddress: dst, amount: zigAmount(input.amount)}});
}
/** Claim one (one validator) or claim all (one message per validator, in the order given, each once). */
export function claim(input: {delegator: string; validators: readonly string[]}): ClaimMessage[] {
  const who = delegator(input.delegator);
  const list = [...input.validators];
  if (!list.length) throw new StakingInputError('There are no rewards to claim yet.');
  if (list.length > MAX_CLAIM_VALIDATORS) throw new StakingInputError(`Claim from at most ${MAX_CLAIM_VALIDATORS} validators at once.`);
  if (new Set(list).size !== list.length) throw new StakingInputError('Each validator can be claimed from once per signature.');
  return list.map(v => freeze({typeUrl: STAKING_TYPE_URLS.claim, value: {delegatorAddress: who, validatorAddress: validator(v)}}));
}
export function vote(input: {voter: string; proposalId: string; option: VoteChoice}): VoteMessage {
  if (typeof input.proposalId !== 'string' || !/^[1-9]\d{0,18}$/.test(input.proposalId)) throw new StakingInputError('That proposal number is not valid.');
  const option = VOTE_OPTIONS[input.option];
  if (!Object.hasOwn(VOTE_OPTIONS, input.option) || !option) throw new StakingInputError('Choose Yes, No, Abstain or No with veto.');
  return freeze({typeUrl: STAKING_TYPE_URLS.vote, value: {proposalId: BigInt(input.proposalId), voter: delegator(input.voter), option}});
}
/** `sweep` (Session AF chunk 3, H60): one MsgDelegate of the rewards waiting with a validator, to that validator (the
 *  chain pays the rewards out first, so they are staked straight back). */
export type StakingActionKind = 'delegate' | 'undelegate' | 'redelegate' | 'claim' | 'vote' | 'sweep';
/** The ZIG this signature moves out of the liquid balance (delegate only; the rest move nothing liquid). */
export function liquidSpend(messages: readonly StakingMessage[]): bigint {
  return messages.reduce((total, m) => m.typeUrl === STAKING_TYPE_URLS.delegate ? total + BigInt(m.value.amount.amount) : total, 0n);
}
/** The validators a set of messages names, in order, each once (for the review screen and the journal). */
export function validatorsOf(messages: readonly StakingMessage[]): string[] {
  const seen = new Set<string>();
  for (const m of messages) {
    const v = m.value as {validatorAddress?: string; validatorSrcAddress?: string; validatorDstAddress?: string};
    for (const a of [v.validatorAddress, v.validatorSrcAddress, v.validatorDstAddress]) if (a) seen.add(a);
  }
  return [...seen];
}
/** Every message must be one of the five, signed by the one delegator given, in ZIG only. */
export function assertStakingMessages(messages: readonly StakingMessage[], signer: string): void {
  if (!messages.length || messages.length > MAX_CLAIM_VALIDATORS) throw new StakingInputError('Nothing to sign.');
  for (const m of messages) {
    const v = m.value as Record<string, unknown>;
    const who = m.typeUrl === STAKING_TYPE_URLS.vote ? v.voter : v.delegatorAddress;
    if (!(Object.values(STAKING_TYPE_URLS) as string[]).includes(m.typeUrl) || who !== signer) throw new StakingInputError('Only your own staking actions can be signed here.');
    const amount = v.amount as {denom?: unknown; amount?: unknown} | undefined;
    if (amount !== undefined && (amount.denom !== ZIG_DENOM || typeof amount.amount !== 'string' || !/^[1-9]\d{0,77}$/.test(amount.amount))) throw new StakingInputError('Only ZIG can be staked here.');
  }
}
