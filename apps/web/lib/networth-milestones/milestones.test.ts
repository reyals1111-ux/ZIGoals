import {describe, expect, test} from 'vitest';
import {DEFAULT_MILESTONES, addAmount, checkCrossings, emptyNetworthMilestones, markShown, milestoneAmounts, networthMilestonesSchema, nextMilestone, parseMilestone, pendingCelebration, removeAmount, setDefaults, turnOff, turnOn, type NetRow} from './milestones';
import {showcaseNetworthMilestones} from './showcase';

const DAY = '2026-10-31', AT = '2026-10-31T10:00:00.000Z';
const rows = (usd: number, eur?: number): NetRow[] => [{currency: 'USD', net: {value: BigInt(Math.round(usd * 100)), decimals: 2}}, ...(eur === undefined ? [] : [{currency: 'EUR', net: {value: BigInt(eur), decimals: 0}}])];
describe('net-worth milestones (Session AK F5a, item 3)', () => {
  test('off by default; an empty record is valid and bounded', () => {
    expect(emptyNetworthMilestones()).toEqual({version: 1, enabled: false});
    expect(networthMilestonesSchema.parse({version: 1})).toEqual({version: 1, enabled: false});
    expect(networthMilestonesSchema.safeParse({version: 1, amounts: Array(21).fill('1')}).success).toBe(false);
    expect(networthMilestonesSchema.safeParse({version: 1, amounts: ['-5']}).success).toBe(false);
    expect(networthMilestonesSchema.safeParse({version: 1, later: 1, reached: [{currency: 'USD', amount: '5', on: DAY, extra: true}]}).success).toBe(true);
    expect(checkCrossings(emptyNetworthMilestones(), rows(50_000), DAY)).toEqual(emptyNetworthMilestones());
  });
  test('typed amounts are whole and bounded; the list is sorted and has no repeats', () => {
    expect(parseMilestone('25,000')).toBe('25000');
    expect(parseMilestone(' 1 000 000 ')).toBe('1000000');
    expect(parseMilestone('12.5')).toBeNull();
    expect(parseMilestone('abc')).toBeNull();
    expect(parseMilestone('99999999999999')).toBeNull();
    expect(milestoneAmounts({version: 1, enabled: true, amounts: ['50000', '1000'], useDefaults: true})).toEqual(DEFAULT_MILESTONES);
  });
  test('turning on remembers what is already passed, quietly; no celebration for the past', () => {
    let r = addAmount(emptyNetworthMilestones(), '10000', [], DAY);
    r = addAmount(r, '25000', [], DAY);
    expect(() => turnOn(r, 'GBP', rows(12_000), DAY)).toThrow(/no net worth in GBP/);
    r = turnOn(r, 'USD', rows(12_000), DAY);
    expect(r.reached).toEqual([{currency: 'USD', amount: '10000', on: DAY, quiet: true}]);
    expect(pendingCelebration(r)).toBeNull();
    expect(nextMilestone(r, rows(12_000))).toBe('25000');
  });
  test('the first crossing celebrates once; a dip and a second crossing do not celebrate again', () => {
    let r = turnOn(addAmount(emptyNetworthMilestones(), '25000', [], DAY), 'USD', rows(24_999.99), DAY);
    expect(checkCrossings(r, rows(24_999.99), DAY)).toBe(r);
    r = checkCrossings(r, rows(25_000), '2026-11-02');
    expect(pendingCelebration(r)).toEqual({currency: 'USD', amount: '25000', on: '2026-11-02'});
    r = markShown(r, {currency: 'USD', amount: '25000'}, AT);
    expect(pendingCelebration(r)).toBeNull();
    const dipped = checkCrossings(r, rows(20_000), '2026-11-03');
    expect(checkCrossings(dipped, rows(30_000), '2026-11-04')).toBe(dipped);
  });
  test('several passed at once: only the highest celebrates; lower ones are remembered quietly', () => {
    let r = turnOn(setDefaults(emptyNetworthMilestones(), true, [], DAY), 'USD', rows(800), DAY);
    expect(r.reached!.map(x => x.amount)).toEqual(['0']);
    r = checkCrossings(r, rows(60_000), DAY);
    expect(pendingCelebration(r)!.amount).toBe('50000');
    expect(r.reached!.filter(x => !x.quiet).map(x => x.amount)).toEqual(['50000']);
  });
  test('per currency, never converted; an added amount already passed is quiet; off means nothing new', () => {
    let r = turnOn(emptyNetworthMilestones(), 'EUR', rows(1_000_000, 3_000), DAY);
    r = addAmount(r, '2000', rows(1_000_000, 3_000), DAY);
    expect(r.reached).toEqual([{currency: 'EUR', amount: '2000', on: DAY, quiet: true}]);
    r = addAmount(r, '5000', rows(1_000_000, 3_000), DAY);
    expect(checkCrossings(r, rows(1_000_000, 4_999), DAY)).toBe(r);
    const off = turnOff(r);
    expect(checkCrossings(off, rows(0, 9_000), DAY)).toBe(off);
    expect(removeAmount(r, '5000').amounts).toEqual(['2000']);
    expect(() => addAmount(r, 'lots', [], DAY)).toThrow(/whole amount/);
  });
  test('a negative net worth passes nothing; zero is a milestone of its own', () => {
    let r = turnOn(addAmount(emptyNetworthMilestones(), '0', [], DAY), 'USD', rows(-500), DAY);
    expect(r.reached ?? []).toEqual([]);
    r = checkCrossings(r, rows(0.01), DAY);
    expect(pendingCelebration(r)!.amount).toBe('0');
  });
  test('the Showcase record is on, labelled and valid', () => {
    const s = showcaseNetworthMilestones(DAY);
    expect(s.enabled).toBe(true);
    expect(s.note).toMatch(/SHOWCASE DATA/);
    expect(pendingCelebration(s)).toBeNull();
    expect(pendingCelebration(checkCrossings(s, rows(30_000), DAY))!.amount).toBe('25000');
  });
});
