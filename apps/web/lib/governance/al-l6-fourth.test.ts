import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {failedReasonWords, turnoutOf} from './plain-words';
import {ProposalCard} from '../../components/governance/proposal-card';
import type {GovParams, ProposalWire} from './wire';

/** Session AL (lane L6, fourth pass): Governance's ended proposals in plain words, with turnout as a bar. */
const PARAMS = {quorum: '0.334', threshold: '0.51', vetoThreshold: '0.334', expeditedThreshold: '0.667', burnVoteVeto: true, minDeposit: '100000000000000000000', expeditedMinDeposit: '200000000000000000000', votingPeriodSeconds: 600, expeditedVotingPeriodSeconds: 300} as unknown as GovParams;
const P119 = {id: '119', state: 'rejected', title: 'Test Proposal', summary: '', messageTypes: [], submitTime: '2026-09-01T10:00:00.000Z', depositEndTime: '2026-09-15T10:00:00.000Z', votingStartTime: '2026-09-01T10:00:00.000Z', votingEndTime: '2026-09-01T10:10:00.000Z', totalDeposit: '100000000000000000000', expedited: false, failedReason: 'proposal did not get enough votes to pass', tally: {yes: '1000', no: '0', abstain: '0', noWithVeto: '0'}, tallyKind: 'final'} as unknown as ProposalWire;

describe('L-043 / D-154: the chain’s reason as a sentence', () => {
  test('the known lowercase reason is said in plain words, never shown raw', () => {
    expect(failedReasonWords('proposal did not get enough votes to pass')).toBe('It did not get enough votes to pass: too few of all staked ZIG voted (the quorum), or Yes did not reach the share it needed.');
    expect(failedReasonWords('failed to execute message; message index: 0: insufficient funds')).toBe('It passed, but the chain could not carry out its change.');
    expect(failedReasonWords('some new reason')).toBe('The chain’s record says: “Some new reason.”');
    expect(failedReasonWords('  ')).toBe('');
  });
  test('the card prints no raw reason and gives an ended proposal an estimated turnout bar', () => {
    const html = renderToStaticMarkup(createElement(ProposalCard, {proposal: P119, params: PARAMS, bondedTotal: '10000', now: Date.parse('2026-11-05T08:00:00Z'), chainId: 'zig-test-2'}));
    expect(html).not.toContain('proposal did not get enough votes to pass');
    expect(html).toContain('Why it ended this way');
    expect(html).toContain('Turnout about <strong>10%</strong> of the ZIG staked today');
    expect(html).toContain('an estimate');
    expect(html).toContain('aria-label="Estimated turnout 10% of staked ZIG; the quorum is 33.4%, not reached"');
    expect(html).toContain('ZIGoals cannot show this proposal’s turnout exactly');
  });
});

describe('C-BN-13: turnout against the quorum', () => {
  test('shares and the quorum mark; unknown staked total gives no bar (never zero)', () => {
    expect(turnoutOf({yes: '400', no: '0', abstain: '0', noWithVeto: '0'}, '1000', PARAMS)).toEqual({share: '40%', fraction: 0.4, quorum: '33.4%', quorumFraction: 0.334, met: true});
    expect(turnoutOf({yes: '1', no: '0', abstain: '0', noWithVeto: '0'}, undefined, PARAMS)).toBeNull();
    expect(turnoutOf({yes: '1', no: '0', abstain: '0', noWithVeto: '0'}, '0', PARAMS)).toBeNull();
  });
});

import {toBech32} from '@cosmjs/encoding';
import {voterAccountOf} from './voter';
describe('C-BN-12: whose vote to read', () => {
  const bytes = new Uint8Array(20).fill(7);
  test('a validator reads as its own account; a ZIG address as itself; anything else says why', () => {
    expect(voterAccountOf(toBech32('zigvaloper', bytes))).toEqual({account: toBech32('zig', bytes), validator: true});
    expect(voterAccountOf(` ${toBech32('zig', bytes)} `)).toEqual({account: toBech32('zig', bytes), validator: false});
    expect(voterAccountOf(toBech32('cosmos', bytes))).toEqual({problem: 'That is not a ZIGChain address: it should start with zigvaloper1 or zig1.'});
    expect(voterAccountOf('zig1nope')).toHaveProperty('problem');
    expect(voterAccountOf('')).toHaveProperty('problem');
  });
});
