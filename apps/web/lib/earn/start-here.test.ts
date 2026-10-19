import {describe, expect, it} from 'vitest';
import {pathProblems, pathProgress} from '../path/model';
import {positionSchema, type Position} from '../positions';
import {markStep} from './records';
import {DETECTORS, START_STEPS, detectAddMoney, detectExplore, detectFirstStake, detectGetZig, detectPractice, detectWallet, hasRealPosition, holdings, minHeightFor, startHereModel, startStates, type StartFacts, type WalletRead} from './start-here';

/**
 * Session AF chunk 2 (P1.11): every Start-here detector, on positions shaped exactly as ZIGoals' relay answers them
 * (lib/native-positions.ts) and on staking-journal entries shaped as lib/staking/journal.ts keeps them. Practice stake
 * ticks only "Practice first" (H11); what cannot be seen can be marked, and a step seen done never needs the mark.
 */
const REAL = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx', PRACTICE = 'zig1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrrdrgwr';
function position(chainId: string, account: string, kind: 'liquid' | 'stake' | 'stzig' | 'reward', quantity: string): Position {
  const base = {providerId: 'native-zig', network: chainId, account, asset: 'ZIG', denom: 'azig', decimals: 18, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-19T00:00:00.000Z', provenance: 'https://api.zigchain.com · block 13048320', executionAuthority: 'NONE'};
  const fields = kind === 'liquid' ? {sourceType: 'WALLET_LIQUID', liquidity: 'LIQUID'} : kind === 'stake' ? {sourceType: 'NATIVE_STAKING', principal: quantity, liquidity: 'BONDED'} : kind === 'reward' ? {sourceType: 'NATIVE_REWARDS', unclaimedRewards: quantity, liquidity: 'LOCKED'}
    : {sourceType: 'LIQUID_STAKING', asset: 'stZIG', denom: 'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig', decimals: 6, liquidity: 'LIQUID'};
  return positionSchema.parse({...base, id: `${chainId}:${account}:${kind}`, quantity, ...fields});
}
const read = (chainId: string, address: string, positions: Position[]): WalletRead => ({address, chainId, state: 'ok', positions});
const none: StartFacts = {linked: 0, connected: 0, journal: [], reads: []};
const ONE_ZIG = '1000000000000000000';

describe('the Start-here detectors', () => {
  it('a wallet: linked on this device, or connected on the Staking page', () => {
    expect(detectWallet(none)).toMatchObject({seen: false});
    expect(detectWallet({...none, linked: 1})).toEqual({seen: true, why: 'Seen: a ZIGChain wallet is linked on this device.'});
    expect(detectWallet({...none, linked: 2}).why).toContain('2 ZIGChain wallets are linked');
    expect(detectWallet({...none, connected: 1})).toEqual({seen: true, why: 'Seen: a wallet is connected on the Staking page.'});
  });
  it('practice: a confirmed practice delegation in the journal, or practice stake read; never a real one', () => {
    expect(detectPractice(none).seen).toBe(false);
    expect(detectPractice({...none, journal: [{chainId: 'zig-test-2', action: 'delegate', state: 'CONFIRMED', wallet: PRACTICE}]}).seen).toBe(true);
    // Pending, failed and real ones do not count.
    for (const state of ['AWAITING_SIGNATURE', 'BROADCASTING', 'FAILED', 'REJECTED', 'UNKNOWN_AFTER_BROADCAST']) expect(detectPractice({...none, journal: [{chainId: 'zig-test-2', action: 'delegate', state, wallet: PRACTICE}]}).seen, state).toBe(false);
    expect(detectPractice({...none, journal: [{chainId: 'zigchain-1', action: 'delegate', state: 'CONFIRMED', wallet: REAL}]}).seen).toBe(false);
    expect(detectPractice({...none, reads: [read('zig-test-2', PRACTICE, [position('zig-test-2', PRACTICE, 'stake', ONE_ZIG)])]}).seen).toBe(true);
    expect(detectPractice({...none, reads: [read('zigchain-1', REAL, [position('zigchain-1', REAL, 'stake', ONE_ZIG)])]}).seen).toBe(false);
    expect(detectPractice({...none, reads: [read('zig-test-2', PRACTICE, [position('zig-test-2', PRACTICE, 'stake', '0')])]}).seen).toBe(false);
  });
  it('add money and get ZIG: a real balance above zero; zero is not seen; practice ZIG never counts', () => {
    const zig = (q: string) => [read('zigchain-1', REAL, [position('zigchain-1', REAL, 'liquid', q)])];
    expect(detectAddMoney({...none, reads: zig(ONE_ZIG)}).seen).toBe(true);
    expect(detectGetZig({...none, reads: zig(ONE_ZIG)}).seen).toBe(true);
    expect(detectAddMoney({...none, reads: zig('0')}).seen).toBe(false);
    expect(detectGetZig({...none, reads: zig('0')}).seen).toBe(false);
    const practice = [read('zig-test-2', PRACTICE, [position('zig-test-2', PRACTICE, 'liquid', ONE_ZIG)])];
    expect(detectAddMoney({...none, reads: practice}).seen).toBe(false);
    expect(detectGetZig({...none, reads: practice}).seen).toBe(false);
    // Stake or stZIG on the real network: the money and the ZIG are there.
    const staked = [read('zigchain-1', REAL, [position('zigchain-1', REAL, 'liquid', '0'), position('zigchain-1', REAL, 'stake', ONE_ZIG)])];
    expect(detectGetZig({...none, reads: staked})).toEqual({seen: true, why: 'Seen: your ZIG is already staked.'});
    expect(detectAddMoney({...none, reads: [read('zigchain-1', REAL, [position('zigchain-1', REAL, 'stzig', '1000000')])]}).seen).toBe(true);
  });
  it('first real stake: a confirmed real delegation, or real stake read; practice stake never ticks it (H11)', () => {
    expect(detectFirstStake({...none, journal: [{chainId: 'zigchain-1', action: 'delegate', state: 'CONFIRMED', wallet: REAL}]}).seen).toBe(true);
    expect(detectFirstStake({...none, journal: [{chainId: 'zigchain-1', action: 'claim', state: 'CONFIRMED', wallet: REAL}]}).seen).toBe(false);
    expect(detectFirstStake({...none, reads: [read('zigchain-1', REAL, [position('zigchain-1', REAL, 'stake', ONE_ZIG)])]}).seen).toBe(true);
    expect(detectFirstStake({...none, reads: [read('zig-test-2', PRACTICE, [position('zig-test-2', PRACTICE, 'stake', ONE_ZIG)])]}).seen).toBe(false);
    expect(detectFirstStake({...none, reads: [read('zigchain-1', REAL, [position('zigchain-1', REAL, 'reward', ONE_ZIG)])]}).seen).toBe(false);
  });
  it('explore: stZIG on the real network or a confirmed vote; else it cannot be seen', () => {
    expect(detectExplore({...none, reads: [read('zigchain-1', REAL, [position('zigchain-1', REAL, 'stzig', '5')])]}).seen).toBe(true);
    expect(detectExplore({...none, journal: [{chainId: 'zigchain-1', action: 'vote', state: 'CONFIRMED', wallet: REAL}]}).seen).toBe(true);
    expect(detectExplore(none)).toEqual({seen: false, why: 'ZIGoals cannot see this from here.'});
  });
  it('an unread or still-loading wallet says so, and is never read as empty', () => {
    expect(detectGetZig({...none, reads: [{address: REAL, chainId: 'zigchain-1', state: 'unavailable'}]}).why).toBe('ZIGoals could not read your wallet just now.');
    expect(detectGetZig({...none, reads: [{address: REAL, chainId: 'zigchain-1', state: 'loading'}]}).why).toBe('Reading your wallet…');
    expect(detectGetZig(none).why).toBe('ZIGoals sees no ZIGChain wallet to read on this device.');
    expect(holdings([{address: REAL, chainId: 'zigchain-1', state: 'unavailable'}], 'zigchain-1')).toMatchObject({read: 0, wanted: 1, zig: 0n});
  });
  it('every step has a detector, in the path\'s order', () => {
    expect(START_STEPS).toEqual(['get-wallet', 'practice', 'add-money', 'get-zig', 'first-stake', 'explore']);
    expect(Object.keys(DETECTORS)).toEqual([...START_STEPS]);
  });
});

describe('the Start-here path: seen, marked, or not yet', () => {
  it('seen wins; a mark stands for what cannot be seen; an unmarked step waits', () => {
    const record = markStep(markStep({version: 1}, 'add-money', true, '2026-10-19T08:00:00.000Z'), 'get-wallet', true, '2026-10-19T08:00:00.000Z');
    const states = startStates({...none, linked: 1}, record);
    expect(states.map(s => [s.id, s.done, s.how])).toEqual([['get-wallet', true, 'seen'], ['practice', false, null], ['add-money', true, 'marked'], ['get-zig', false, null], ['first-stake', false, null], ['explore', false, null]]);
    // Taking a mark back makes the step wait again.
    expect(startStates(none, markStep(record, 'add-money', false)).find(s => s.id === 'add-money')!.done).toBe(false);
  });
  it('the model: six dots in three orbits, two chests, nothing locked, every dot opens its guide', () => {
    const model = startHereModel(startStates(none, {version: 1}));
    expect(pathProblems(model)).toEqual([]);
    expect(model.sections.map(s => s.steps.map(x => x.id))).toEqual([['get-wallet', 'practice'], ['add-money', 'get-zig'], ['first-stake', 'explore']]);
    expect(model.sections.flatMap(s => s.steps).every(x => x.state === 'undone' && x.intent === 'value')).toBe(true);
    expect(model.milestones.map(m => m.id)).toEqual(['start-practised', 'start-complete']);
    expect(pathProgress(model)).toEqual({done: 0, total: 6, fraction: 0});
    const done = startHereModel(startStates({...none, linked: 1, reads: [read('zigchain-1', REAL, [position('zigchain-1', REAL, 'stake', ONE_ZIG)])]}, {version: 1}));
    expect(pathProgress(done).done).toBe(4);
    expect(done.sections[0]!.steps[0]!.note).toBe('Seen done');
  });
  it('minHeight: the highest confirmed block of that wallet on that network, for the relay right after signing', () => {
    const journal = [{chainId: 'zigchain-1', action: 'delegate', state: 'CONFIRMED', wallet: REAL, height: '13048000'}, {chainId: 'zigchain-1', action: 'claim', state: 'CONFIRMED', wallet: REAL, height: '13048320'}, {chainId: 'zigchain-1', action: 'delegate', state: 'BROADCASTING', wallet: REAL, height: '13049999'}, {chainId: 'zig-test-2', action: 'delegate', state: 'CONFIRMED', wallet: REAL, height: '9000000'}];
    expect(minHeightFor(journal, REAL, 'zigchain-1')).toBe('13048320');
    expect(minHeightFor(journal, PRACTICE, 'zigchain-1')).toBeUndefined();
    expect(minHeightFor([{chainId: 'zigchain-1', action: 'delegate', state: 'CONFIRMED', wallet: REAL, height: 'x'}], REAL, 'zigchain-1')).toBeUndefined();
  });
  it('a real position (stake, stZIG or a confirmed real delegation) is what makes the Today card step aside', () => {
    expect(hasRealPosition([])).toBe(false);
    expect(hasRealPosition([read('zigchain-1', REAL, [position('zigchain-1', REAL, 'liquid', ONE_ZIG)])])).toBe(false);
    expect(hasRealPosition([read('zigchain-1', REAL, [position('zigchain-1', REAL, 'stake', ONE_ZIG)])])).toBe(true);
    expect(hasRealPosition([read('zig-test-2', PRACTICE, [position('zig-test-2', PRACTICE, 'stake', ONE_ZIG)])])).toBe(false);
    expect(hasRealPosition([], [{chainId: 'zigchain-1', action: 'delegate', state: 'CONFIRMED', wallet: REAL}])).toBe(true);
  });
});
