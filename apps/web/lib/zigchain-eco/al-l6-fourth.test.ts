import {describe, expect, test} from 'vitest';
import {priceOnDay, rewardsByMonth, rewardsCsv, REWARDS_CSV_HEADER, unbondingIcs, unbondingIcsName, valueOnDay, type RewardsHistoryRow, type UnbondingEvent} from './staking-clarity';
import {unfold} from '../ics/ics';

/** Session AL (lane L6, fourth pass): staking competitor rows C-DVG-68, C-DVG-69, C-BN-03. */
const NOW = Date.parse('2026-11-05T08:00:00Z');
const ev = (id: string, date: string, practice = false): UnbondingEvent => ({id, kind: 'unbonding', network: practice ? 'zig-test-2' : 'zigchain-1', practice, account: 'zig1x', validator: 'v', validatorName: 'V', amount: '1000000000000000000', amountText: '1 ZIG', at: `${date}T10:00:00.000Z`, date, daysLeft: 3, availability: 'available in 3 days', title: 't', href: '/app/earn#staking-clarity'});

describe('C-DVG-68: a reminder for the unbonding date', () => {
  test('one all-day event per day with a 09:00 reminder and no amount in the file', () => {
    const ics = unbondingIcs([{date: '2026-11-11', events: [ev('a', '2026-11-11'), ev('b', '2026-11-11')]}, {date: '2026-11-20', events: [ev('c', '2026-11-20', true)]}], new Date(NOW));
    const lines = unfold(ics);
    expect(lines.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(2);
    expect(lines).toContain('DTSTART;VALUE=DATE:20261111');
    expect(lines.filter(l => l === 'BEGIN:VALARM')).toHaveLength(2);
    expect(lines.filter(l => l === 'TRIGGER:PT9H')).toHaveLength(2);
    expect(lines).toContain('SUMMARY:Unstaked test ZIG is back (ZIGChain practice network)');
    expect(ics).not.toMatch(/1 ZIG|1000000000000000000/);
    expect(unbondingIcsName(NOW)).toBe('zigoals-unbonding-2026-11-05.ics');
  });
});

describe('C-DVG-69: ZIG’s price on the claim’s day', () => {
  const points = [{at: '2026-10-20T00:00:00.000Z', value: '75000', decimals: 6}, {at: '2026-10-21T00:00:00.000Z', value: '80000', decimals: 6}];
  test('the nearest daily point within a day; unknown otherwise (never 0)', () => {
    expect(priceOnDay(points, '2026-10-20T15:00:00.000Z')).toBeCloseTo(0.075);
    expect(priceOnDay(points, '2026-10-21T02:00:00.000Z')).toBeCloseTo(0.08);
    expect(priceOnDay(points, '2026-09-01T00:00:00.000Z')).toBeNull();
    expect(priceOnDay([], '2026-10-20T00:00:00.000Z')).toBeNull();
    expect(valueOnDay('2500000000000000000', 0.08)).toBeCloseTo(0.2);
    expect(valueOnDay(null, 0.08)).toBeNull();
  });
  test('the CSV adds the price and value columns; practice and unknown say so in words', () => {
    const rows: RewardsHistoryRow[] = [
      {at: '2026-10-20T10:00:00.000Z', network: 'zigchain-1', practice: false, wallet: 'zig1a', action: 'sweep', validators: ['v'], amount: '2500000000000000000'},
      {at: '2026-10-21T10:00:00.000Z', network: 'zigchain-1', practice: false, wallet: 'zig1a', action: 'claim', validators: ['v'], amount: null},
      {at: '2026-10-21T10:00:00.000Z', network: 'zig-test-2', practice: true, wallet: 'zig1a', action: 'claim', validators: ['v'], amount: null},
    ];
    const lines = rewardsCsv(rows, [], NOW, at => priceOnDay(points, at)).trimEnd().split('\r\n');
    expect(lines[0]).toBe(REWARDS_CSV_HEADER.map(h => `"${h}"`).join(','));
    expect(REWARDS_CSV_HEADER.slice(-2)).toEqual(['ZIG price that day (USD, CoinGecko)', 'Value that day (USD)']);
    expect(lines[1]).toMatch(/"0\.075000","0\.187500"$/);
    expect(lines[2]).toMatch(/"0\.080000","unknown"$/);
    expect(lines[3]).toMatch(/"test ZIG has no price","none"$/);
    expect(rewardsCsv(rows.slice(0, 1), [], NOW).trimEnd().split('\r\n')[1]).toMatch(/"unknown","unknown"$/);
  });
});

describe('C-BN-03: claimed rewards by month', () => {
  test('six months, real network only, unknown amounts counted beside, never as 0', () => {
    const rows: RewardsHistoryRow[] = [
      {at: '2026-10-20T10:00:00.000Z', network: 'zigchain-1', practice: false, wallet: 'w', action: 'sweep', validators: [], amount: '2500000000000000000'},
      {at: '2026-10-22T10:00:00.000Z', network: 'zigchain-1', practice: false, wallet: 'w', action: 'claim', validators: [], amount: null},
      {at: '2026-09-02T10:00:00.000Z', network: 'zig-test-2', practice: true, wallet: 'w', action: 'sweep', validators: [], amount: '9000000000000000000'},
    ];
    const months = rewardsByMonth(rows, NOW);
    expect(months.map(m => m.month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(months.find(m => m.month === '2026-10')).toEqual({month: '2026-10', zig: 2.5, known: 1, inTransaction: 1});
    expect(months.find(m => m.month === '2026-09')).toEqual({month: '2026-09', zig: 0, known: 0, inTransaction: 0});
  });
});

import {pickerOrder} from './validators';
describe('C-BN-01 / C-DVG-67: the stake dialog sorts and caps commission on facts only', () => {
  const v = (operator: string, moniker: string, rate: string, power: string, missed: number, tokens: string) => ({operator, moniker, status: 'bonded' as const, jailed: false, tombstoned: false, tokens, commission: {rate}, votingPowerShare: power, uptime: {window: 10000, missed, signedShare: String(1 - missed / 10000)}});
  const list = [v('a', 'Alpha', '0.1', '0.5', 10, '500'), v('b', 'Beta', '0.05', '0.3', 0, '300'), v('c', 'Gamma', '0.07', '0.2', 100, '200')];
  test('lowest commission, best uptime, most stake, name; a cap leaves the dearer ones out', () => {
    expect(pickerOrder(list, 'commission').map(x => x.moniker)).toEqual(['Beta', 'Gamma', 'Alpha']);
    expect(pickerOrder(list, 'uptime').map(x => x.moniker)).toEqual(['Beta', 'Alpha', 'Gamma']);
    expect(pickerOrder(list, 'power').map(x => x.moniker)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(pickerOrder(list, 'name').map(x => x.moniker)).toEqual(['Alpha', 'Beta', 'Gamma']);
    expect(pickerOrder(list, 'commission', 0.075).map(x => x.moniker)).toEqual(['Beta', 'Gamma']);
  });
});

// Session AL (C-DVG-69, replay L6 round 2): the claim-day ZIG price is asked for CoinGecko's "zignaly" (the app's one ZIG
// market ref); "zigchain" is no CoinGecko coin, so the price always read "unknown".
import {readFileSync as readFileSyncDvg69} from 'node:fs';
test('C-DVG-69: staking clarity reads ZIG history through nativeZigMarketRef, never the id "zigchain"', () => {
  const source = readFileSyncDvg69(new URL('../../components/zigchain-eco/staking-clarity.tsx', import.meta.url), 'utf8');
  expect(source).toContain('marketRef: nativeZigMarketRef');
  expect(source).not.toMatch(/id: 'zigchain'/);
});
