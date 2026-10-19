import type {GovParams, ProposalState, ProposalWire, Tally, VoteChoiceWire} from './wire';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H46; P6.5, P6.6): governance in plain words, as pure functions. What a proposal
 * changes is said from the messages it would execute (chain data), never from the proposer's own text, which is shown
 * apart and labelled as theirs. Tally shares are exact (BigInt), compared against the chain's own quorum, threshold and veto
 * numbers; a live tally is described as "if voting ended now", because votes keep arriving until the end.
 */
export const STATE_WORDS: Readonly<Record<ProposalState, string>> = Object.freeze({
  deposit: 'Collecting its deposit (no voting yet)',
  voting: 'Voting now',
  passed: 'Passed',
  rejected: 'Rejected',
  failed: 'Passed, but its change failed to run',
  unknown: 'Status not known to this build',
});
export const CHOICE_WORDS: Readonly<Record<VoteChoiceWire, {label: string; means: string}>> = Object.freeze({
  yes: {label: 'Yes', means: 'You support this change.'},
  no: {label: 'No', means: 'You do not support this change.'},
  abstain: {label: 'Abstain', means: 'You count toward the quorum without taking a side.'},
  no_with_veto: {label: 'No with veto', means: 'You oppose it strongly: if more than the veto share of votes say this, the proposal fails.'},
});
/** gov v1beta1 option numbers (the vote journal stores the signed number) back to a choice. */
export const CHOICE_OF_OPTION: Readonly<Record<string, VoteChoiceWire>> = Object.freeze({'1': 'yes', '2': 'abstain', '3': 'no', '4': 'no_with_veto'});
export const WHY_VOTING_MATTERS = 'ZIGChain changes by vote: software upgrades, the rules for staking and rewards, who may upload smart contracts, and spending from the community pool are all decided by the people who stake. Each vote counts with the ZIG staked behind it. If you do not vote, your validator\'s vote counts for your stake; voting yourself replaces it for your share.';
export const VOTE_IS_PUBLIC = 'Your vote is public and tied to your address forever: anyone can see how this address voted on this proposal.';

type Words = {module: string; name: string; words: string};
/** A type URL (slash, module path, version, message name, e.g. cosmos.upgrade.v1beta1.MsgSoftwareUpgrade) → its module ("cosmos.upgrade") and name. */
export function partsOf(typeUrl: string): {module: string; name: string} {
  const segments = typeUrl.replace(/^\//, '').split('.').filter(Boolean);
  const name = segments.pop() ?? '';
  const version = segments.findIndex(s => /^v\d+((alpha|beta)\d*)?$/.test(s));
  return {module: (version >= 0 ? segments.slice(0, version) : segments).join('.'), name};
}
const KNOWN: readonly Words[] = Object.freeze([
  {module: 'cosmos.upgrade', name: 'MsgSoftwareUpgrade', words: 'Upgrades ZIGChain\'s software: every validator switches to a new version at a set block.'},
  {module: 'cosmos.upgrade', name: 'MsgCancelUpgrade', words: 'Cancels a planned software upgrade.'},
  {module: 'cosmwasm.wasm', name: 'MsgAddCodeUploadParamsAddresses', words: 'Adds addresses to the list allowed to upload smart contracts.'},
  {module: 'cosmwasm.wasm', name: 'MsgRemoveCodeUploadParamsAddresses', words: 'Removes addresses from the list allowed to upload smart contracts.'},
  {module: 'cosmwasm.wasm', name: 'MsgUpdateParams', words: 'Changes the smart-contract module\'s settings, such as who may upload contracts.'},
  {module: 'cosmwasm.wasm', name: 'MsgStoreCode', words: 'Uploads smart-contract code.'},
  {module: 'cosmwasm.wasm', name: 'MsgStoreAndInstantiateContract', words: 'Uploads and starts a smart contract.'},
  {module: 'cosmwasm.wasm', name: 'MsgMigrateContract', words: 'Replaces the code of an existing smart contract.'},
  {module: 'cosmwasm.wasm', name: 'MsgPinCodes', words: 'Keeps smart-contract code loaded for faster use.'},
  {module: 'cosmos.distribution', name: 'MsgCommunityPoolSpend', words: 'Spends ZIG from the community pool.'},
  {module: 'cosmos.distribution', name: 'MsgUpdateParams', words: 'Changes how rewards are shared out, such as the community tax.'},
  {module: 'cosmos.staking', name: 'MsgUpdateParams', words: 'Changes the staking rules, such as how many validators are active or how long unstaking takes.'},
  {module: 'cosmos.gov', name: 'MsgUpdateParams', words: 'Changes the voting rules: deposits, voting time, quorum or thresholds.'},
  {module: 'cosmos.gov', name: 'MsgExecLegacyContent', words: 'An older kind of proposal; read the proposer\'s words below.'},
  {module: 'cosmos.mint', name: 'MsgUpdateParams', words: 'Changes how new ZIG is issued (inflation).'},
  {module: 'cosmos.slashing', name: 'MsgUpdateParams', words: 'Changes the penalties for validators that go offline or misbehave.'},
  {module: 'cosmos.bank', name: 'MsgUpdateParams', words: 'Changes the rules for sending tokens.'},
  {module: 'cosmos.bank', name: 'MsgSetSendEnabled', words: 'Turns sending of a token on or off.'},
  {module: 'cosmos.auth', name: 'MsgUpdateParams', words: 'Changes account rules, such as memo length and signature limits.'},
  {module: 'cosmos.consensus', name: 'MsgUpdateParams', words: 'Changes block and consensus limits.'},
  {module: 'ibc.core.client', name: 'MsgRecoverClient', words: 'Repairs an expired connection to another chain (IBC).'},
  {module: 'ibc.core.client', name: 'MsgIBCSoftwareUpgrade', words: 'Upgrades the software of a connection to another chain (IBC).'},
]);
/** What the proposal would change, one plain sentence per kind of message it carries (each kind once). */
export function whatChanges(messageTypes: readonly string[]): string[] {
  if (!messageTypes.length) return ['A text proposal: it asks a question or signals an intent. Nothing on the chain changes by itself if it passes.'];
  const out: string[] = [];
  for (const type of messageTypes) {
    const {module, name} = partsOf(type);
    const known = KNOWN.find(k => k.module === module && k.name === name);
    const words = known ? known.words : name === 'MsgUpdateParams' && module ? `Changes the settings of the ${module.split('.').pop()} module.` : `A change ZIGoals has no plain words for yet (${name || 'unknown'}${module ? `, ${module}` : ''}); read the proposer's words below.`;
    if (!out.includes(words)) out.push(words);
  }
  return out;
}
/** A decimal string as an exact fraction over 10^18. */
const SCALE = 10n ** 18n;
export function scaled(decimal: string): bigint {
  if (!/^\d{1,3}(\.\d{1,18})?$/.test(decimal)) throw Error('Not a chain decimal.');
  const [whole = '0', fraction = ''] = decimal.split('.');
  return BigInt(whole) * SCALE + BigInt((fraction + '0'.repeat(18)).slice(0, 18));
}
/** part ÷ whole, as a fraction over 10^18 (floored); 0 when the whole is 0. */
export const ratio = (part: bigint, whole: bigint) => whole > 0n ? (part * SCALE) / whole : 0n;
/** A fraction over 10^18 as a percentage with at most two places, floored ("33.4 %" style without the space: "33.4%"). */
export function percentOf(fraction: bigint): string {
  const basis = (fraction * 10000n) / SCALE;
  const whole = basis / 100n, rest = basis % 100n;
  return `${whole}${rest ? `.${rest.toString().padStart(2, '0').replace(/0$/, '')}` : ''}%`;
}
export type TallyView = {
  total: bigint;
  shares: Record<'yes' | 'no' | 'abstain' | 'noWithVeto', string>;
  /** Live tallies only: the share of all staked ZIG that has voted, and the verdict if voting ended now. */
  turnout?: string;
  quorumMet?: boolean;
  vetoed?: boolean;
  passing?: boolean;
  verdict?: string;
};
/**
 * The SDK's own rule (x/gov tally): without the quorum's share of all bonded ZIG voting, it fails; with more than the veto
 * share of all votes saying No with veto, it fails; otherwise it passes when Yes is more than the threshold of the votes
 * that are not Abstain.
 */
export function tallyView(tally: Tally, params: Pick<GovParams, 'quorum' | 'threshold' | 'vetoThreshold' | 'expeditedThreshold'>, expedited: boolean, bonded?: string, live = false): TallyView {
  const yes = BigInt(tally.yes), no = BigInt(tally.no), abstain = BigInt(tally.abstain), veto = BigInt(tally.noWithVeto);
  const total = yes + no + abstain + veto;
  const shares = {yes: percentOf(ratio(yes, total)), no: percentOf(ratio(no, total)), abstain: percentOf(ratio(abstain, total)), noWithVeto: percentOf(ratio(veto, total))};
  if (!live || bonded === undefined) return {total, shares};
  const turnout = ratio(total, BigInt(bonded));
  const quorumMet = BigInt(bonded) > 0n && turnout >= scaled(params.quorum);
  const vetoed = total > 0n && ratio(veto, total) > scaled(params.vetoThreshold);
  const passing = quorumMet && !vetoed && total - abstain > 0n && ratio(yes, total - abstain) > scaled(expedited ? params.expeditedThreshold : params.threshold);
  const verdict = !quorumMet ? `If voting ended now it would fail: only ${percentOf(turnout)} of staked ZIG has voted, below the ${percentOf(scaled(params.quorum))} quorum.`
    : vetoed ? `If voting ended now it would fail by veto: No with veto is above ${percentOf(scaled(params.vetoThreshold))} of the votes.`
    : passing ? `If voting ended now it would pass: Yes is above ${percentOf(scaled(expedited ? params.expeditedThreshold : params.threshold))} of the votes that are not Abstain.`
    : `If voting ended now it would be rejected: Yes is not above ${percentOf(scaled(expedited ? params.expeditedThreshold : params.threshold))} of the votes that are not Abstain.`;
  return {total, shares, turnout: percentOf(turnout), quorumMet, vetoed, passing, verdict};
}
/** "4 days" / "10 minutes" / "1 day 6 hours": a duration in seconds for the voting period and the deadline. */
export function durationWords(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return 'unknown';
  const days = Math.floor(seconds / 86400), hours = Math.floor((seconds % 86400) / 3600), minutes = Math.floor((seconds % 3600) / 60);
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  if (days) return hours ? `${part(days, 'day')} ${part(hours, 'hour')}` : part(days, 'day');
  if (hours) return minutes ? `${part(hours, 'hour')} ${part(minutes, 'minute')}` : part(hours, 'hour');
  return part(Math.max(minutes, seconds > 0 ? 1 : 0), 'minute');
}
/** The deadline of a proposal in words, relative to `now`. */
export function deadlineWords(proposal: Pick<ProposalWire, 'state' | 'votingEndTime' | 'depositEndTime'>, now: number): string {
  if (proposal.state === 'voting' && proposal.votingEndTime) {
    const left = (Date.parse(proposal.votingEndTime) - now) / 1000;
    return left > 0 ? `Voting ends in ${durationWords(left)}` : 'Voting has just ended; the result is being counted';
  }
  if (proposal.state === 'deposit' && proposal.depositEndTime) {
    const left = (Date.parse(proposal.depositEndTime) - now) / 1000;
    return left > 0 ? `Needs its deposit within ${durationWords(left)}` : 'Its deposit time has ended';
  }
  return proposal.votingEndTime ? 'Voting ended' : 'No voting took place';
}
