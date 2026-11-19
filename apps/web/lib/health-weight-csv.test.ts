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

// Session AT (ADR-043 D6; AO D17 / AP D22): the value and its unit are two fields; a header maps the columns by name.
test('D6: a header maps Date, Unit and Weight in any order; a header\'s unit applies to its column', () => {
  const plan = readWeightCsv('Unit;Weight;Date\nlb;160;2026-10-30\nkg;72,5;2026-10-31\n', opts);
  expect(plan.columns).toMatchObject({date: 2, value: 1, unit: 0, fromHeader: true});
  expect(plan.rows.map(r => [r.date, r.value, r.unit, r.unitFrom, r.grams])).toEqual([['2026-10-30', '160', 'lb', 'column', 72_575], ['2026-10-31', '72.5', 'kg', 'column', 72_500]]);
  const lbs = readWeightCsv('Time,Weight (lb)\n2026-10-30,160\n2026-10-31,161 kg\n', opts);
  expect(lbs.rows.map(r => [r.unit, r.unitFrom])).toEqual([['lb', 'header'], ['kg', 'value']]);
});
test('D6: without a unit anywhere the person\'s chosen unit is used, and said so', () => {
  const plan = readWeightCsv('2026-10-30,160\n', {...opts, unit: 'lb'});
  expect(plan.columns.fromHeader).toBe(false);
  expect(plan.rows.map(r => [r.value, r.unit, r.unitFrom, r.grams])).toEqual([['160', 'lb', 'chosen', 72_575]]);
});
