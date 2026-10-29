import {explorerLinksFor} from '@zigoals/ecosystem-registry/links';

/**
 * Session AF (ADR-028 H61, L2 design §3; `TIER 3 (wallet/signing)`): every way a staking action can stop, in plain words.
 * Nothing is retried silently: each sentence says whether anything moved and what to do next, and carries the verified
 * explorer links whenever a transaction hash exists.
 */
export type StakingErrorKind = 'rejected' | 'insufficient-fee' | 'out-of-gas' | 'sequence' | 'timeout' | 'insufficient-funds' | 'delegation' | 'unbonding-limit' | 'no-account' | 'network' | 'upgraded' | 'fee-changed' | 'fee-unreadable' | 'no-voting-power' | 'unavailable' | 'other';
export const PLAIN_WORDS: Readonly<Record<StakingErrorKind, string>> = Object.freeze({
  'rejected': 'You stopped this in your wallet. Nothing was sent.',
  'insufficient-fee': 'The network fee was too low for the chain right now. Nothing moved. Review again: the fee is estimated fresh each time.',
  'out-of-gas': 'This needed more gas than estimated. Nothing moved, but the network fee was charged. Review again (ZIGoals adds 30 % on top of the simulation).',
  'sequence': 'Your wallet sent another transaction a moment ago. Wait for it to confirm, then review again.',
  'timeout': 'Still confirming. Check the transaction on the explorer before trying again.',
  'insufficient-funds': 'Not enough ZIG for this amount and its network fee.',
  'delegation': 'That is more than you have staked with this validator.',
  'unbonding-limit': 'This validator already has 7 unstakings from you in progress. Wait for one to finish (21 days each), then try again.',
  'no-account': 'This wallet has no ZIG on this network yet, so there is nothing to stake or claim.',
  'network': 'The network or its denomination changed, so signing is off until ZIGoals checks it again. Nothing was signed.',
  // Session AJ (ADR-035 D1, A1, P3, P4).
  'upgraded': 'The network was upgraded; checks are pending. Signing stays off until ZIGoals has reviewed the new version. Nothing was signed.',
  'fee-changed': 'Your wallet changed the network fee. Nothing was sent. Review again and keep the fee as shown: ZIGoals signs exactly the fee you reviewed.',
  'fee-unreadable': 'The network fee could not be read just now, or is unusually high. Nothing was signed. Try again in a minute.',
  'no-voting-power': 'Voting needs at least 1 ZIG staked with active validators. Nothing was sent.',
  'unavailable': 'The network did not answer just now. Nothing was signed. Try again in a minute.',
  'other': 'This did not go through. If a transaction hash is shown, check it on the explorer before trying again.',
});
export type PlainError = {kind: StakingErrorKind; message: string; hash?: string; links: {name: string; url: string}[]};
const text = (error: unknown) => error instanceof Error ? error.message : typeof error === 'string' ? error : '';
/** The chain's ABCI code in a CosmJS error ("…failed with code 13 (codespace: sdk)…") or a receipt. */
export function abciCode(error: unknown): number | undefined {
  const own = (error as {code?: unknown} | null)?.code;
  if (typeof own === 'number' && Number.isInteger(own) && own > 0) return own;
  const match = /\bcode (\d{1,5})\b/.exec(text(error));
  return match ? Number(match[1]) : undefined;
}
export function classifyStakingError(error: unknown, code = abciCode(error)): StakingErrorKind {
  const message = text(error);
  // A refusal in the wallet (Keplr: "Request rejected"; Ledger: "denied"; a closed prompt: "cancel").
  if (/request rejected|rejected by (the )?user|denied|cancel/i.test(message)) return 'rejected';
  if (code === 13 || /insufficient fee/i.test(message)) return 'insufficient-fee';
  if (code === 11 || /out of gas/i.test(message)) return 'out-of-gas';
  if (code === 32 || /account sequence mismatch|incorrect account sequence/i.test(message)) return 'sequence';
  if (code === 5 || /insufficient funds|smaller than/i.test(message)) return 'insufficient-funds';
  if (/invalid shares amount|insufficient delegation|not enough delegation|no delegation for/i.test(message)) return 'delegation';
  if (/too many unbonding|max entries|maximum number of unbonding/i.test(message)) return 'unbonding-limit';
  if (/does not exist on chain|account .*not found/i.test(message)) return 'no-account';
  if (/network or denomination changed|wrong rpc network/i.test(message)) return 'network';
  if (/the network was upgraded/i.test(message)) return 'upgraded';
  if (/wallet changed the network fee/i.test(message)) return 'fee-changed';
  if (/network fee could not be read|network fee is unusually high/i.test(message)) return 'fee-unreadable';
  if (/no voting power/i.test(message)) return 'no-voting-power';
  if (/still confirming|taking longer than expected|timed out|timeout/i.test(message)) return 'timeout';
  if (/failed to fetch|network ?error|unavailable|load failed|503|502/i.test(message)) return 'unavailable';
  return 'other';
}
const HASH = /^[0-9A-Fa-f]{64}$/;
/** The sentence to show, and the explorer links for the hash when there is one. */
export function plainWords(error: unknown, context: {chainId: string; hash?: string; code?: number}): PlainError {
  const kind = classifyStakingError(error, context.code ?? abciCode(error));
  const hash = context.hash && HASH.test(context.hash) ? context.hash.toUpperCase() : undefined;
  return {kind, message: PLAIN_WORDS[kind], ...(hash ? {hash} : {}), links: hash ? explorerLinksFor(context.chainId, 'transaction', hash) : []};
}
