import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {StakingClarity} from '../../components/zigchain-eco/staking-clarity';
import {StakedPurpose} from '../../components/zigchain-eco/staked-purpose';
import {TokenCheckFold} from '../../components/zigchain-eco/token-check-fold';
import {TokenCheckForm} from '../../components/zigchain-eco/token-check';
import {PracticeJourney} from '../../components/zigchain-eco/practice-journey';
import {ProposalExtras} from '../../components/zigchain-eco/proposal-extras';
import {ValidatorPicker} from '../../components/staking/validator-picker';
import {readNativePositions} from '../native-positions';
import {DELEGATOR, NETWORK, lcdFetch} from './fixtures/lcd';
import {toBech32} from '@cosmjs/encoding';

/**
 * Session AK (F4): the new panels render on the server (first paint) with honest empty states, never a zero for an
 * unknown, and the practice network always labelled.
 */
const NOW = Date.parse('2026-10-31T21:00:00Z');
const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);
describe('ZIGChain ecosystem panels', () => {
  it('staking clarity: figures from a reading, practice labelled, the CSV offered as information only', async () => {
    const positions = await readNativePositions(NETWORK['v6.0'].mode, DELEGATOR, lcdFetch('v6.0'));
    const out = html(createElement(StakingClarity, {reads: [{address: DELEGATOR, label: 'My wallet', positions}], now: NOW}));
    expect(out).toContain('1.75 ZIG');
    expect(out).toContain('Practice');
    expect(out).toContain('30 ZIG from Fictional Alpha, available in 11 days');
    expect(out).toContain('Download rewards as CSV');
    expect(out).toContain('not a tax statement');
    const empty = html(createElement(StakingClarity, {reads: [], now: NOW}));
    expect(empty).toContain('No rewards are waiting in the wallets read here.');
    expect(empty).toContain('Nothing is unstaking right now.');
  });
  it('staked purpose renders nothing without ZIG staking (the chain stays out of sight)', () => {
    expect(html(createElement(StakedPurpose, {positions: [], allocations: [], goals: []}))).toBe('');
  });
  it('the token check loads its form only on use, and the form explains the rule', () => {
    const fold = html(createElement(TokenCheckFold));
    expect(fold).toContain('Check a token');
    expect(fold).not.toContain('Token denom');
    const form = html(createElement(TokenCheckForm));
    expect(form).toContain('never by the name its maker chose');
    expect(form).toContain('Token denom');
  });
  it('the practice journey starts at the faucet with the official link', () => {
    const out = html(createElement(PracticeJourney));
    expect(out).toContain('0 of 5 steps done on the practice network.');
    expect(out).toContain('https://faucet.zigchain.com/');
  });
  it('proposal extras show the proposer’s words in short, labelled as theirs', () => {
    const proposal = {id: '45', state: 'voting' as const, title: 'Software Upgrade to v6', summary: '## Plan\n\nUpgrade to **v6** at height 13466800. See [the notes](https://example.org).', messageTypes: ['/cosmos.upgrade.v1beta1.MsgSoftwareUpgrade'], submitTime: '2026-10-29T10:48:30.000Z', depositEndTime: null, votingStartTime: '2026-10-29T10:48:30.000Z', votingEndTime: '2026-11-02T10:48:30.000Z', totalDeposit: '0', expedited: false, failedReason: '', tally: {yes: '0', no: '0', abstain: '0', noWithVeto: '0'}, tallyKind: 'live' as const};
    const out = html(createElement(ProposalExtras, {proposal, chainId: 'zigchain-1', now: NOW}));
    expect(out).toContain('In short, in the proposer’s words');
    expect(out).toContain('Plan Upgrade to v6 at height 13466800. See the notes.');
    expect(out).not.toContain('https://example.org');
  });
  it('the validator picker adds the spread line, ranks and the gentle hint, and still offers only active validators', () => {
    const op = (i: number) => toBech32('zigvaloper', Uint8Array.from({length: 20}, (_, j) => (i * 17 + j) & 0xff));
    const v = (i: number, over = {}) => ({operator: op(i), moniker: `Fictional ${String(i).padStart(2, '0')}`, website: '', status: 'bonded' as const, jailed: false, tombstoned: false, tokens: String((20 - i) * 1000), votingPowerShare: '0.05', commission: {rate: '0.05', maxRate: '0.2', maxChangeRate: '0.01', updatedAt: '2026-01-01T00:00:00.000Z'}, selfBond: null, uptime: {window: 35000, missed: 0, signedShare: '1'}, ...over});
    const validators = [...Array.from({length: 12}, (_, i) => v(i + 1)), v(13, {jailed: true}), v(14, {tombstoned: true, jailed: true})];
    const out = html(createElement(ValidatorPicker, {validators, value: '', onChange: () => {}, legend: 'Validator to stake with', name: 'x'}));
    expect(out).toContain('Show validators outside the 10 largest first');
    expect(out).toContain('number 1 by stake');
    expect(out).toContain('One of the 10 largest validators (number 1 by stake).');
    expect(out).toMatch(/\d validators together hold more than a third/);
    expect(out).not.toContain('Fictional 13');
    expect(out).toContain('1 of them was removed for good for signing twice.');
    expect(out.indexOf('Fictional 11')).toBeLessThan(out.indexOf('Fictional 01'));
  });
});
