import {describe, expect, it, test} from 'vitest';
import Decimal from 'decimal.js';
import {DEFAULT_INPUT, compound, milestoneWhen, periodRate, whatIfs, type CompoundInput} from './engine';

const base: CompoundInput = {...DEFAULT_INPUT, start: '0', contribution: '0', increasePercent: 0, inflationPercent: 0};
const cents = (n: Decimal.Value) => new Decimal(n).toFixed(2);

describe('compound interest (Session AA-Cloud Part 3), against closed-form values', () => {
  it('a lump sum, compounded yearly: 10,000 at 5 % for 10 years = 10,000 × 1.05^10', () => {
    const r = compound({...base, start: '10000', ratePercent: 5, years: 10, compounding: 'yearly', frequency: 'yearly'});
    expect(r.final).toBe(cents(new Decimal(10000).times(new Decimal(1.05).pow(10))));
    expect(r.final).toBe('16288.95');
    expect(r.contributed).toBe('10000.00');
    expect(r.growth).toBe('6288.95');
  });
  it('a lump sum, compounded monthly: 1,000 at 12 % for 1 year = 1,000 × 1.01^12', () => {
    expect(compound({...base, start: '1000', ratePercent: 12, years: 1, compounding: 'monthly'}).final).toBe('1126.83');
  });
  it('daily compounding: 1,000 at 10 % for 1 year = 1,000 × (1 + 0.1/365)^365', () => {
    const r = compound({...base, start: '1000', ratePercent: 10, years: 1, compounding: 'daily', frequency: 'monthly'});
    expect(r.final).toBe(cents(new Decimal(1000).times(new Decimal(1).plus(new Decimal(0.1).div(365)).pow(365))));
    expect(r.final).toBe('1105.16');
  });
  it('an ordinary annuity (end of each month): 100 a month at 12 %/12 for 10 years = 100 × (1.01^120 − 1) / 0.01', () => {
    const r = compound({...base, contribution: '100', ratePercent: 12, years: 10, compounding: 'monthly', frequency: 'monthly', timing: 'end'});
    const expected = new Decimal(100).times(new Decimal(1.01).pow(120).minus(1)).div(0.01);
    expect(r.final).toBe(cents(expected));
    expect(r.final).toBe('23003.87');
    expect(r.contributed).toBe('12000.00');
  });
  it('an annuity due (start of each month) is the ordinary one × (1 + r)', () => {
    const r = compound({...base, contribution: '100', ratePercent: 12, years: 10, compounding: 'monthly', frequency: 'monthly', timing: 'start'});
    expect(r.final).toBe(cents(new Decimal(100).times(new Decimal(1.01).pow(120).minus(1)).div(0.01).times(1.01)));
    expect(r.final).toBe('23233.91');
  });
  it('0 %: the money is exactly what was put in', () => {
    const r = compound({...base, start: '1000', contribution: '100', ratePercent: 0, years: 10});
    expect(r.final).toBe('13000.00');
    expect(r.growth).toBe('0.00');
    expect(r.milestones.map(m => m.threshold)).toEqual([10_000]);
  });
  it('no contribution: a lump sum alone', () => {
    const r = compound({...base, start: '5000', contribution: '0', ratePercent: 4, years: 3, compounding: 'yearly'});
    expect(r.final).toBe(cents(new Decimal(5000).times(new Decimal(1.04).pow(3))));
  });
  it('weekly contributions into monthly compounding use the effective weekly rate', () => {
    expect(periodRate(12, 'monthly', 'weekly').toFixed(12)).toBe(new Decimal(1.01).pow(new Decimal(12).div(52)).minus(1).toFixed(12));
    const r = compound({...base, contribution: '10', frequency: 'weekly', ratePercent: 0, years: 2});
    expect(r.final).toBe('1040.00');
  });
  it('contributions that rise each year: 1,000, then 1,100, then 1,210 at 0 %', () => {
    const r = compound({...base, contribution: '1000', frequency: 'yearly', ratePercent: 0, years: 3, increasePercent: 10});
    expect(r.rows.map(row => row.contributedThisYear)).toEqual(['1000.00', '1100.00', '1210.00']);
    expect(r.final).toBe('3310.00');
  });
  it('inflation shows today’s money: 10,000 at 0 % after 2 years at 2 % inflation = 10,000 / 1.02²', () => {
    const r = compound({...base, start: '10000', ratePercent: 0, years: 2, inflationPercent: 2});
    expect(r.realFinal).toBe(cents(new Decimal(10000).div(new Decimal(1.02).pow(2))));
    expect(compound({...base, start: '1', years: 1}).realFinal).toBeNull();
  });
  it('year rows add up, and milestones say when they are first reached', () => {
    const r = compound({...DEFAULT_INPUT, start: '9000', contribution: '500', ratePercent: 6, years: 30});
    expect(r.rows).toHaveLength(30);
    for (const row of r.rows) expect(new Decimal(row.contributed).plus(row.growth).toFixed(2)).toBe(row.balance);
    expect(r.milestones.map(m => m.threshold)).toEqual([10_000, 100_000]);
    expect(milestoneWhen(r.milestones[0]!)).toBe('Year 1, month 2');
  });
  it('a negative return can lose money, never below the arithmetic', () => {
    const r = compound({...base, start: '1000', ratePercent: -10, years: 1, compounding: 'yearly', frequency: 'yearly'});
    expect(r.final).toBe('900.00');
    expect(r.growth).toBe('-100.00');
  });
  it('what-ifs: two points higher and lower, and five more years', () => {
    expect(whatIfs({...DEFAULT_INPUT, ratePercent: 5, years: 20}).map(w => [w.id, w.input.ratePercent, w.input.years])).toEqual([['higher', 7, 20], ['lower', 3, 20], ['earlier', 5, 25]]);
    expect(whatIfs({...DEFAULT_INPUT, years: 58}).map(w => w.id)).toEqual(['higher', 'lower']);
  });
  it('refuses what it cannot compute honestly', () => {
    expect(() => compound({...base, years: 0})).toThrow();
    expect(() => compound({...base, years: 61})).toThrow();
    expect(() => compound({...base, start: '-5'})).toThrow();
    expect(() => compound({...base, start: '1.234'})).toThrow();
    expect(() => compound({...base, ratePercent: 101})).toThrow();
  });
});

// Session AH (TR14, B-099): months after the whole years, additive and optional.
test('1 year and 6 months at 0 %: eighteen monthly contributions, one extra row marked with its months', () => {
  const r = compound({...DEFAULT_INPUT, start: '1000', contribution: '100', ratePercent: 0, years: 1, months: 6});
  expect(r.contributed).toBe('2800.00'); expect(r.final).toBe('2800.00');
  expect(r.rows.map(x => [x.year, x.months])).toEqual([[1, undefined], [2, 6]]);
  const yearly = compound({...DEFAULT_INPUT, start: '1000', contribution: '100', frequency: 'yearly', compounding: 'yearly', ratePercent: 10, years: 1, months: 6});
  // A yearly contribution falls in no part year; the half year still grows: 1,000 × 1.1 + 100 = 1,200, then × 1.1^0.5.
  expect(Number(yearly.final)).toBeCloseTo(1200 * Math.sqrt(1.1), 2);
  expect(compound({...DEFAULT_INPUT, months: 0}).rows).toHaveLength(DEFAULT_INPUT.years);
});
