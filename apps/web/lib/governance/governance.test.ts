import {toBech32} from '@cosmjs/encoding';
import {describe, expect, test} from 'vitest';
import {deadlineWords, durationWords, partsOf, percentOf, ratio, scaled, tallyView, whatChanges} from './plain-words';
import {confirmedVote, eligibilityOf, votesOf} from './votes';
import type {Position} from '../positions';

// Session AF chunk 3 (lane L2a; P6.5, P6.6): governance in plain words, the tally rule, eligibility and the vote journal.
const ME = toBech32('zig', new Uint8Array(20).fill(9)), V = toBech32('zigvaloper', new Uint8Array(20).fill(2));
const PARAMS = {quorum: '0.334', threshold: '0.51', vetoThreshold: '0.334', expeditedThreshold: '0.667'};
const E18 = 10n ** 18n;

describe('what a proposal changes', () => {
  test('from the messages it carries, never from the proposer\'s text; each kind once; unknown said honestly', () => {
    expect(partsOf('/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade')).toEqual({module: 'cosmos.upgrade', name: 'MsgSoftwareUpgrade'});
    expect(partsOf('/ibc.core.client.v1.MsgRecoverClient')).toEqual({module: 'ibc.core.client', name: 'MsgRecoverClient'});
    expect(partsOf('/zigchain.factory.MsgSetDenomMetadata')).toEqual({module: 'zigchain.factory', name: 'MsgSetDenomMetadata'});
    expect(whatChanges(['/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade'])).toEqual(['Upgrades ZIGChain\'s software: every validator switches to a new version at a set block.']);
    expect(whatChanges(['/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddresses', '/cosmwasm.wasm.v1.MsgAddCodeUploadParamsAddresses'])).toHaveLength(1);
    expect(whatChanges(['/cosmos.distribution.v1beta1.MsgCommunityPoolSpend'])[0]).toBe('Spends ZIG from the community pool.');
    expect(whatChanges([])[0]).toMatch(/^A text proposal/);
    expect(whatChanges(['/cosmos.evidence.v1.MsgUpdateParams'])[0]).toBe('Changes the settings of the evidence module.');
    expect(whatChanges(['/zigchain.factory.MsgSetDenomMetadata'])[0]).toBe('A change ZIGoals has no plain words for yet (MsgSetDenomMetadata, zigchain.factory); read the proposer\'s words below.');
  });
});
describe('the tally, exactly (BigInt), by the SDK\'s rule', () => {
  test('shares of one proposal\'s votes; a final tally gives no verdict of its own', () => {
    expect(percentOf(ratio(1n, 3n))).toBe('33.33%');
    expect(scaled('0.334')).toBe(334n * 10n ** 15n);
    expect(() => scaled('-1')).toThrow();
    const view = tallyView({yes: '3', no: '1', abstain: '0', noWithVeto: '0'}, PARAMS, false);
    expect(view.shares).toEqual({yes: '75%', no: '25%', abstain: '0%', noWithVeto: '0%'});
    expect(view.verdict).toBeUndefined();
    expect(tallyView({yes: '0', no: '0', abstain: '0', noWithVeto: '0'}, PARAMS, false).shares.yes).toBe('0%');
  });
  test('a live tally: quorum against all staked ZIG, then veto, then the threshold of non-abstain votes', () => {
    const bonded = (1_000_000n * E18).toString();
    const pass = tallyView({yes: (300_000n * E18).toString(), no: (50_000n * E18).toString(), abstain: (10_000n * E18).toString(), noWithVeto: '0'}, PARAMS, false, bonded, true);
    expect(pass).toMatchObject({turnout: '36%', quorumMet: true, vetoed: false, passing: true});
    expect(pass.verdict).toBe('If voting ended now it would pass: Yes is above 51% of the votes that are not Abstain.');
    const noQuorum = tallyView({yes: (300_000n * E18).toString(), no: '0', abstain: '0', noWithVeto: '0'}, PARAMS, false, bonded, true);
    expect(noQuorum).toMatchObject({quorumMet: false, passing: false});
    expect(noQuorum.verdict).toBe('If voting ended now it would fail: only 30% of staked ZIG has voted, below the 33.4% quorum.');
    const veto = tallyView({yes: (200_000n * E18).toString(), no: '0', abstain: '0', noWithVeto: (150_000n * E18).toString()}, PARAMS, false, bonded, true);
    expect(veto).toMatchObject({quorumMet: true, vetoed: true, passing: false});
    // Exactly at the threshold is not above it; expedited proposals use their own, higher threshold.
    const tie = tallyView({yes: (204_000n * E18).toString(), no: (196_000n * E18).toString(), abstain: '0', noWithVeto: '0'}, PARAMS, false, bonded, true);
    expect(tie.passing).toBe(false);
    const half = tallyView({yes: (200_000n * E18).toString(), no: (200_000n * E18).toString(), abstain: '0', noWithVeto: '0'}, {...PARAMS, threshold: '0.5'}, false, bonded, true);
    expect(half.passing).toBe(false);
    expect(tallyView({yes: (600_000n * E18).toString(), no: (400_000n * E18).toString(), abstain: '0', noWithVeto: '0'}, PARAMS, true, bonded, true).passing).toBe(false);
  });
  test('deadlines and durations in words', () => {
    expect(durationWords(345600)).toBe('4 days');
    expect(durationWords(600)).toBe('10 minutes');
    expect(durationWords(90061)).toBe('1 day 1 hour');
    const now = Date.parse('2026-10-19T00:15:00Z');
    expect(deadlineWords({state: 'voting', votingEndTime: '2026-10-19T00:25:00.000Z', depositEndTime: null}, now)).toBe('Voting ends in 10 minutes');
    expect(deadlineWords({state: 'voting', votingEndTime: '2026-10-19T00:10:00.000Z', depositEndTime: null}, now)).toBe('Voting has just ended; the result is being counted');
    expect(deadlineWords({state: 'passed', votingEndTime: '2026-10-06T13:52:34.396Z', depositEndTime: null}, now)).toBe('Voting ended');
    expect(deadlineWords({state: 'deposit', votingEndTime: null, depositEndTime: '2026-10-20T00:15:00.000Z'}, now)).toBe('Needs its deposit within 1 day');
  });
});
describe('eligibility and the vote journal', () => {
  const position = (over: Partial<Position>): Position => ({id: 'p', providerId: 'native-zig', sourceType: 'NATIVE_STAKING', network: 'zig-test-2', account: ME, asset: 'ZIG', denom: 'azig', decimals: 18, quantity: (5n * E18).toString(), liquidity: 'BONDED', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-19T00:00:00.000Z', provenance: 'fixture', notes: '', risk: '', executionAuthority: 'NONE', validator: {address: V, name: 'Fictional', status: 'BOND_STATUS_BONDED', commission: '0.05', votingTokens: '1'}, ...over} as Position);
  test('a bonded delegation on that network, to a bonded validator, makes a vote count', () => {
    expect(eligibilityOf([position({})], 'zig-test-2', ME)).toEqual({eligible: true, bonded: (5n * E18).toString(), validators: 1});
    expect(eligibilityOf([position({network: 'zigchain-1'})], 'zig-test-2', ME).eligible).toBe(false);
    expect(eligibilityOf([position({quantity: '0'})], 'zig-test-2', ME).eligible).toBe(false);
    expect(eligibilityOf([position({sourceType: 'NATIVE_REWARDS'})], 'zig-test-2', ME).eligible).toBe(false);
    expect(eligibilityOf([position({validator: {address: V, name: 'x', status: 'BOND_STATUS_UNBONDED', commission: '0.05', votingTokens: '1'}})], 'zig-test-2', ME).eligible).toBe(false);
    expect(eligibilityOf([position({account: toBech32('zig', new Uint8Array(20).fill(8))})], 'zig-test-2', ME).eligible).toBe(false);
  });
  test('the vote entries of the staking journal, per network and address, newest first; unreadable ones skipped', () => {
    const entry = (n: number, over: Record<string, unknown> = {}) => ({operationId: `00000000-0000-4000-8000-00000000000${n}`, chainId: 'zig-test-2', wallet: ME, action: 'vote', proposalId: '122', option: '1', amount: '0', state: 'CONFIRMED', hash: String(n).repeat(64).slice(0, 64), at: `2026-10-19T00:0${n}:00.000Z`, ...over});
    const journal = {version: 1 as const, entries: [entry(1, {option: '3'}), entry(2), entry(3, {option: '9'}), entry(4, {action: 'delegate'}), entry(5, {chainId: 'zigchain-1'}), entry(6, {state: 'FAILED', proposalId: '121'})]};
    const votes = votesOf(journal, 'zig-test-2', ME);
    expect(votes.map(v => [v.proposalId, v.choice, v.state])).toEqual([['121', 'yes', 'FAILED'], ['122', 'yes', 'CONFIRMED'], ['122', 'no', 'CONFIRMED']]);
    expect(confirmedVote(votes, '122')?.choice).toBe('yes');
    expect(confirmedVote(votes, '121')).toBeUndefined();
  });
});
