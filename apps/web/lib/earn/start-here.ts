import type {PathModel, PathStep} from '../path/model';
import type {Position} from '../positions';
import {stepsOf, type EarnPath} from './records';

/**
 * Session AF chunk 2 (P1.7–P1.11, ADR-028 H11, H43): the Start-here path, six steps from no wallet to a first real stake,
 * drawn by the shared path engine (lib/path/model.ts). Each step's state comes from the person's real records, read-only:
 *
 * 1 Get a wallet      — a ZIGChain wallet linked on this device, or connected on the Staking page (this tab).
 * 2 Practice first    — a confirmed practice delegation in the staking journal, or practice stake read from the network.
 * 3 Add money         — ZIG, stake or stZIG on the real network (money has reached ZIGChain).
 * 4 Get ZIG           — ZIG on the real network (spendable, staked or as stZIG).
 * 5 First real stake  — a confirmed real delegation in the journal, or real stake read from the network.
 * 6 Explore more      — stZIG on the real network, or a confirmed vote in the journal.
 *
 * What ZIGoals cannot see (a wallet it was never shown, money still on another network) the person may mark as done; the
 * mark is kept in `zigoals:earn-path:v1` and a step seen done never needs one. Practice stake never counts as real money
 * (H11): it only ticks step 2. Copy trading is not a step (H43). Nothing here reads the network: the caller passes the
 * positions it read through ZIGoals' relay.
 */
export const START_STEPS = Object.freeze(['get-wallet', 'practice', 'add-money', 'get-zig', 'first-stake', 'explore'] as const);
export type StartStepId = (typeof START_STEPS)[number];
export const PRACTICE_CHAIN = 'zig-test-2', REAL_CHAIN = 'zigchain-1';
/** One journal entry as the detectors need it (lib/staking/journal.ts StakingJournalEntry). */
export type JournalFact = {chainId: string; action: string; state: string; wallet: string; height?: string};
/** One wallet's read through /api/positions, or why it could not be read. */
export type WalletRead = {address: string; chainId: string; state: 'ok' | 'loading' | 'unavailable'; positions?: readonly Position[]};
export type StartFacts = {
  /** ZIGChain wallets linked on this device (read-only), and wallets connected on the Staking page in this tab. */
  linked: number; connected: number;
  journal: readonly JournalFact[];
  reads: readonly WalletRead[];
};
export type Detection = {seen: boolean; why: string};
const sum = (positions: readonly Position[], type: Position['sourceType'], asset?: string) => positions.filter(p => p.sourceType === type && (!asset || p.asset === asset)).reduce((n, p) => n + BigInt(p.quantity), 0n);
/** The totals the detectors use, per network, over every wallet read on it (base units: azig, stZIG units). */
export function holdings(reads: readonly WalletRead[], chainId: string) {
  const ok = reads.filter(r => r.chainId === chainId && r.state === 'ok' && r.positions);
  const all = ok.flatMap(r => r.positions!);
  return {read: ok.length, wanted: reads.filter(r => r.chainId === chainId).length, loading: reads.some(r => r.chainId === chainId && r.state === 'loading'),
    zig: sum(all, 'WALLET_LIQUID', 'ZIG'), staked: sum(all, 'NATIVE_STAKING', 'ZIG'), stzig: sum(all, 'LIQUID_STAKING', 'stZIG')};
}
const confirmed = (journal: readonly JournalFact[], chainId: string, action: string) => journal.some(e => e.chainId === chainId && e.action === action && e.state === 'CONFIRMED');
const unread = (h: ReturnType<typeof holdings>, what: string): Detection => ({seen: false,
  why: h.wanted === 0 ? `ZIGoals sees no ${what} wallet to read on this device.` : h.loading && h.read === 0 ? 'Reading your wallet…' : h.read === 0 ? 'ZIGoals could not read your wallet just now.' : 'Not seen in the wallets ZIGoals reads.'});

export function detectWallet(f: StartFacts): Detection {
  if (f.linked > 0) return {seen: true, why: `Seen: ${f.linked === 1 ? 'a ZIGChain wallet is' : `${f.linked} ZIGChain wallets are`} linked on this device.`};
  if (f.connected > 0) return {seen: true, why: 'Seen: a wallet is connected on the Staking page.'};
  return {seen: false, why: 'ZIGoals sees no ZIGChain wallet linked or connected here.'};
}
export function detectPractice(f: StartFacts): Detection {
  if (confirmed(f.journal, PRACTICE_CHAIN, 'delegate')) return {seen: true, why: 'Seen: a practice stake you signed on this device was confirmed.'};
  const h = holdings(f.reads, PRACTICE_CHAIN);
  if (h.staked > 0n) return {seen: true, why: 'Seen: practice stake on the practice network.'};
  return unread(h, 'practice');
}
export function detectAddMoney(f: StartFacts): Detection {
  const h = holdings(f.reads, REAL_CHAIN);
  if (h.zig > 0n || h.staked > 0n || h.stzig > 0n) return {seen: true, why: 'Seen: your wallet holds ZIG on ZIGChain.'};
  return unread(h, 'ZIGChain');
}
export function detectGetZig(f: StartFacts): Detection {
  const h = holdings(f.reads, REAL_CHAIN);
  if (h.zig > 0n) return {seen: true, why: 'Seen: ZIG in your wallet on ZIGChain.'};
  if (h.staked > 0n || h.stzig > 0n) return {seen: true, why: 'Seen: your ZIG is already staked.'};
  return unread(h, 'ZIGChain');
}
export function detectFirstStake(f: StartFacts): Detection {
  if (confirmed(f.journal, REAL_CHAIN, 'delegate')) return {seen: true, why: 'Seen: a real stake you signed on this device was confirmed.'};
  const h = holdings(f.reads, REAL_CHAIN);
  if (h.staked > 0n) return {seen: true, why: 'Seen: stake with a validator on ZIGChain.'};
  return unread(h, 'ZIGChain');
}
export function detectExplore(f: StartFacts): Detection {
  if (confirmed(f.journal, REAL_CHAIN, 'vote')) return {seen: true, why: 'Seen: a vote you signed was confirmed.'};
  const h = holdings(f.reads, REAL_CHAIN);
  if (h.stzig > 0n) return {seen: true, why: 'Seen: stZIG in your wallet (liquid staking).'};
  return {seen: false, why: h.read ? 'Not seen yet: no stZIG and no vote in what ZIGoals reads.' : 'ZIGoals cannot see this from here.'};
}
export const DETECTORS: Readonly<Record<StartStepId, (f: StartFacts) => Detection>> = Object.freeze({
  'get-wallet': detectWallet, practice: detectPractice, 'add-money': detectAddMoney, 'get-zig': detectGetZig, 'first-stake': detectFirstStake, explore: detectExplore,
});

export type StartStepState = {id: StartStepId; done: boolean; how: 'seen' | 'marked' | null; why: string; markedAt?: string};
/** Each step: seen done (wins), marked done by the person, or not done yet. A read still loading leaves a mark standing. */
export function startStates(facts: StartFacts, record: EarnPath): StartStepState[] {
  const marks = new Map(stepsOf(record, START_STEPS).map(s => [s.id, s]));
  return START_STEPS.map(id => {
    const seen = DETECTORS[id](facts), mark = marks.get(id);
    if (seen.seen) return {id, done: true, how: 'seen', why: seen.why};
    if (mark?.done) return {id, done: true, how: 'marked', why: 'You marked this as done.', ...(mark.at ? {markedAt: mark.at} : {})};
    return {id, done: false, how: null, why: seen.why};
  });
}

/** The words of each step on the path (the panel adds the steps of doing it). */
export const STEP_WORDS: Readonly<Record<StartStepId, {label: string; short: string; glyph: string}>> = Object.freeze({
  'get-wallet': {label: 'Get a wallet', short: 'Your own keys', glyph: 'sparkle'},
  practice: {label: 'Practice first', short: 'Free test ZIG', glyph: 'leaf'},
  // Session AF Gate C (design critique, money pages 8): marks that fit their step (a plus to add money, the ecosystem's
  // network to explore more), never a heart or a clock borrowed from elsewhere.
  'add-money': {label: 'Add money', short: 'Card or bank', glyph: 'plus'},
  'get-zig': {label: 'Get ZIG', short: 'Onto ZIGChain', glyph: 'drop'},
  'first-stake': {label: 'Your first real stake', short: 'Real network', glyph: 'flag'},
  explore: {label: 'Explore more', short: 'Liquid staking, pools, votes', glyph: 'ecosystem'},
});
/** The path model the shared renderer draws: three orbits of two dots, a chest after practice and one at the end. */
export function startHereModel(states: readonly StartStepState[]): PathModel {
  const step = (id: StartStepId, colour: PathStep['colour']): PathStep => {
    const s = states.find(x => x.id === id)!;
    return {id, label: STEP_WORDS[id].label, note: s.done ? s.how === 'seen' ? 'Seen done' : 'Marked done' : STEP_WORDS[id].short, colour, state: s.done ? 'done' : 'undone', glyph: STEP_WORDS[id].glyph, intent: 'value', ...(s.markedAt ? {doneAt: s.markedAt} : {})};
  };
  return {
    id: 'earn-start-here', label: 'Start here',
    sections: [
      {id: 'start-ready', label: 'Get ready', eyebrow: 'Orbit 1', colour: 'gold', steps: [step('get-wallet', 'gold'), step('practice', 'gold')]},
      {id: 'start-money', label: 'Bring money in', eyebrow: 'Orbit 2', colour: 'cyan', steps: [step('add-money', 'cyan'), step('get-zig', 'cyan')]},
      {id: 'start-earn', label: 'Start earning', eyebrow: 'Orbit 3', colour: 'magenta', steps: [step('first-stake', 'magenta'), step('explore', 'magenta')]},
    ],
    milestones: [
      {id: 'start-practised', at: {afterStep: 'practice'}, label: 'Practice round', reachedLabel: 'Practice round done'},
      {id: 'start-complete', at: 'end', label: 'Start here, complete', reachedLabel: 'You know your way around'},
    ],
  };
}
/** The highest confirmed block of a wallet's actions on a network, for the relay's `minHeight` right after signing. */
export function minHeightFor(journal: readonly JournalFact[], wallet: string, chainId: string): string | undefined {
  let best: bigint | undefined;
  for (const e of journal) if (e.wallet === wallet && e.chainId === chainId && e.state === 'CONFIRMED' && e.height && /^[1-9]\d{0,19}$/.test(e.height)) { const h = BigInt(e.height); if (best === undefined || h > best) best = h; }
  return best?.toString();
}
/** Whether the person holds a real position (stake or stZIG) on ZIGChain: the Today EARN card steps aside then. */
export function hasRealPosition(reads: readonly WalletRead[], journal: readonly JournalFact[] = []): boolean {
  const h = holdings(reads, REAL_CHAIN);
  return h.staked > 0n || h.stzig > 0n || confirmed(journal, REAL_CHAIN, 'delegate');
}
