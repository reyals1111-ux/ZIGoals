import {expect, test} from 'vitest';
import {readWeightCsv} from './health-weight-csv';

// Session AL (P-MO-62, MO-029): a plain "date, weight" file imports with a preview; every line it cannot read says why.
const opts = {unit: 'kg' as const, today: '2026-11-04', existing: ['2026-11-01']};
test('MO-029: date,weight lines (header, decimal comma, units, ; and tab) are read in the row unit', () => {
  const plan = readWeightCsv('date,weight\n2026-10-30,72.5\n2026-10-31,72,4\n2026-11-02;160 lb\n2026-11-03\t71,9\tkg\n2026-11-01,70\n', opts);
  expect(plan.rows.map(r => [r.date, r.grams])).toEqual([['2026-10-30', 72_500], ['2026-10-31', 72_400], ['2026-11-02', 72_575], ['2026-11-03', 71_900]]);
  expect(plan.kept).toBe(1);
  expect(plan.issues).toEqual([]);
});
test('a future day, an ambiguous date and a weight out of range are named by line', () => {
  const plan = readWeightCsv('2026-11-05,70\n04/11/2026,70\n2026-10-01,1000\n', opts);
  expect(plan.rows).toEqual([]);
  expect(plan.issues.map(i => i.reason)).toEqual(['Line 1: 2026-11-05 is after today.', 'Line 2: the date should read like 2026-11-04.', 'Line 3: Enter a weight from 20 to 400 kg.']);
});
