import {describe, expect, it} from 'vitest';
import {readNativePositions} from '../native-positions';
import type {Position} from '../positions';
import type {StakingJournalEntry} from '../staking/journal';
import {DELEGATOR, NETWORK, VAL_A, VAL_B, lcdFetch, type Shape} from './fixtures/lcd';
import {availabilityWords, claimableOf, MAX_UNBONDING_EVENTS, REWARDS_CSV_HEADER, rewardsCsv, rewardsCsvName, rewardsHistory, unbondingCalendar, unbondingEvents} from './staking-clarity';
import {stakedPurposeRows, stakedPurposeSummary} from './purpose-staking';

const NOW = Date.parse('2026-10-31T21:00:00Z');
const read = (shape: Shape) => readNativePositions(NETWORK[shape].mode, DELEGATOR, lcdFetch(shape));

describe.each(['v5.1', 'v6.0'] as const)('staking clarity from a %s LCD reading', shape => {
  it('builds the unbonding calendar from the chain’s own completion times, soonest first', async () => {
    const positions = await read(shape);
    const events = unbondingEvents(positions, {now: NOW, timeZone: 'UTC'});
    expect(events.map(e => [e.date, e.amount, e.validator, e.daysLeft])).toEqual([
      ['2026-11-11', '30000000000000000000', VAL_A, 11],
      ['2026-11-11', '5000000000000000000', VAL_A, 11],
      ['2026-11-20', '7000000000000000000', VAL_B, 20],
    ]);
    expect(events[0]).toMatchObject({kind: 'unbonding', network: NETWORK[shape].chainId, practice: shape === 'v6.0', validatorName: 'Fictional Alpha', amountText: '30 ZIG', availability: 'available in 11 days', at: '2026-11-11T09:26:34.722Z', href: '/app/earn#staking-clarity'});
    expect(events[0]!.title).toBe(shape === 'v6.0' ? '30 ZIG of test ZIG unstaked from Fictional Alpha' : '30 ZIG unstaked from Fictional Alpha');
    const days = unbondingCalendar(events);
    expect(days.map(d => [d.date, d.total, d.events.length])).toEqual([['2026-11-11', '35000000000000000000', 2], ['2026-11-20', '7000000000000000000', 1]]);
  });
  it('reads the claimable rewards per validator, fractions floored, largest first', async () => {
    const [claim] = claimableOf(await read(shape));
    expect(claim).toMatchObject({network: NETWORK[shape].chainId, account: DELEGATOR, total: '1750000000000000000'});
    expect(claim!.byValidator.map(v => [v.name, v.amount])).toEqual([['Fictional Alpha', '1500000000000000000'], ['Fictional Beta', '250000000000000000']]);
  });
  it('shows staked ZIG in the purpose picture with when it can be used', async () => {
    const positions = await read(shape);
    const staked = positions.find(p => p.sourceType === 'NATIVE_STAKING')!;
    const rows = stakedPurposeRows({positions, now: NOW, unbondingSeconds: 1814400, goals: [{id: '1', name: 'House', status: 'active'}], allocations: [{goalId: '1', positionId: staked.id, quantity: '40000000000000000000'}]});
    expect(rows.map(r => [r.kind, r.when])).toEqual([
      ['rewards', 'claimable any time'], ['rewards', 'claimable any time'],
      ['unbonding', 'available in 11 days'], ['unbonding', 'available in 11 days'], ['unbonding', 'available in 20 days'],
      ['staked', 'staked: usable 21 days after you unstake'],
    ]);
    const stakedRow = rows.find(r => r.kind === 'staked')!;
    expect(stakedRow.goals).toEqual([{goalId: '1', name: 'House', amount: '40000000000000000000', amountText: '40 ZIG'}]);
    expect(stakedRow.free).toBe('60000000000000000000');
    expect(stakedPurposeSummary(rows)).toBe(shape === 'v5.1' ? '40 ZIG of your 143.75 ZIG in staking is set aside for Goals.' : null);
  });
});

const pos = (over: Partial<Position>): Position => ({id: 'x', providerId: 'native-zig', sourceType: 'NATIVE_UNBONDING', network: 'zigchain-1', account: DELEGATOR, asset: 'ZIG', denom: 'azig', quantity: '1000000000000000000', decimals: 18, liquidity: 'UNBONDING', verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-31T00:00:00.000Z', provenance: 'test', notes: '', risk: '', executionAuthority: 'NONE', exitDate: '2026-11-02T08:00:00.000Z', ...over} as Position);
describe('unbondingEvents edges', () => {
  it('skips past, archived, zero, other assets and entries without a date; counts days up and says today/tomorrow', () => {
    const list = [
      pos({id: 'past', exitDate: '2026-10-30T00:00:00.000Z'}), pos({id: 'arch', archivedAt: '2026-10-01T00:00:00.000Z'}), pos({id: 'zero', quantity: '0'}),
      pos({id: 'nodate', exitDate: undefined}), pos({id: 'other', asset: 'stZIG'}), pos({id: 'stake', sourceType: 'NATIVE_STAKING'}),
      pos({id: 'soon', exitDate: '2026-10-31T23:00:00.000Z'}), pos({id: 'tomorrow', exitDate: '2026-11-01T20:00:00.000Z'}),
    ];
    const events = unbondingEvents(list, {now: NOW, timeZone: 'UTC'});
    expect(events.map(e => [e.id, e.availability])).toEqual([['unbonding:soon', 'available tomorrow'], ['unbonding:tomorrow', 'available tomorrow']]);
    expect(unbondingEvents(list, {now: NOW, includePast: true}).map(e => e.id)).toContain('unbonding:past');
    expect(availabilityWords(0)).toBe('available today');
    expect(availabilityWords(Number.NaN)).toBe('available today');
  });
  it('gives the calendar day in the person’s zone', () => {
    const [event] = unbondingEvents([pos({exitDate: '2026-11-02T23:30:00.000Z'})], {now: NOW, timeZone: 'Asia/Tokyo'});
    expect(event!.date).toBe('2026-11-03');
  });
  it('is bounded and empty without unbonding', () => {
    expect(unbondingEvents([], {now: NOW})).toEqual([]);
    const many = Array.from({length: 150}, (_, i) => pos({id: `u${i}`, exitDate: new Date(NOW + (i + 1) * 3_600_000).toISOString()}));
    expect(unbondingEvents(many, {now: NOW})).toHaveLength(MAX_UNBONDING_EVENTS);
  });
});

const entry = (over: Partial<StakingJournalEntry>): StakingJournalEntry => ({operationId: '00000000-0000-4000-8000-000000000001', chainId: 'zigchain-1', wallet: DELEGATOR, action: 'claim', amount: '0', state: 'CONFIRMED', at: '2026-10-20T10:00:00.000Z', ...over});
describe('rewards history and CSV', () => {
  const journal = [
    entry({validators: [VAL_A, VAL_B], hash: 'A'.repeat(64)}),
    entry({operationId: '00000000-0000-4000-8000-000000000002', action: 'sweep', amount: '2500000000000000000', at: '2026-10-25T10:00:00.000Z', validator: VAL_A}),
    entry({operationId: '00000000-0000-4000-8000-000000000003', state: 'FAILED'}),
    entry({operationId: '00000000-0000-4000-8000-000000000004', action: 'delegate', amount: '5'}),
    entry({operationId: '00000000-0000-4000-8000-000000000005', chainId: 'zig-test-2', at: '2026-10-22T10:00:00.000Z'}),
  ];
  it('keeps confirmed claims and sweeps, newest first, with an unknown amount as null (never 0)', () => {
    const history = rewardsHistory(journal);
    expect(history.map(h => [h.action, h.network, h.amount, h.practice])).toEqual([['sweep', 'zigchain-1', '2500000000000000000', false], ['claim', 'zig-test-2', null, true], ['claim', 'zigchain-1', null, false]]);
    expect(history[2]!.validators).toEqual([VAL_A, VAL_B]);
  });
  it('writes an info-only CSV with every cell defused and exact amounts', async () => {
    const claimable = claimableOf(await readNativePositions('MAINNET_READ_ONLY', DELEGATOR, lcdFetch('v5.1')));
    const csv = rewardsCsv(rewardsHistory(journal), claimable, NOW);
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe(REWARDS_CSV_HEADER.map(h => `"${h}"`).join(','));
    expect(lines[1]).toContain('"Waiting to be claimed"');
    expect(lines[1]).toContain('"1.75"');
    expect(lines.some(l => l.includes('"2.5"') && l.includes('sweep'))).toBe(true);
    expect(lines.some(l => l.includes('"in the transaction"') && l.includes(`"${'A'.repeat(64)}"`))).toBe(true);
    expect(rewardsCsvName(NOW)).toBe('zigoals-staking-rewards-2026-10-31.csv');
  });
  it('defuses a formula in any cell', () => {
    const csv = rewardsCsv([{at: '2026-10-20T10:00:00.000Z', network: 'zigchain-1', practice: false, wallet: '=HYPERLINK("x")', action: 'claim', validators: ['+1'], amount: null}], [], NOW);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv).toContain(`"'+1"`);
  });
  it('is just the header with nothing to export', () => {
    expect(rewardsCsv([], [], NOW).trimEnd().split('\r\n')).toHaveLength(1);
  });
});
