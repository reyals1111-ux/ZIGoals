import {expect,test} from 'vitest';
import {CSV_FORMULA_START,csvSafeCell} from './csv-safe';
import {csvCell} from './everything';
import {createEmptyHealth,logHealthItem,saveFood} from '../health';
import {exportHealthCsv} from '../health-daily';
import {exportMeasurementsCsv,saveMeasurement} from '../body-measurements';

// Session U Part 6 (FIX_PLAN D3, FINDINGS Q-WEB-06): one formula guard for the three CSV writers, with the full-width
// triggers and the line feed the old rule missed.
test('a cell a spreadsheet could run as a formula gets an apostrophe, including full-width triggers and a line feed', () => {
  for (const value of ['=SUM(A1)', '+1', '-5', '@SUM(A1)', '\t=1', '\r=1', '\n=1', '\n', '  =HYPERLINK("https://example.invalid")', '＝HYPERLINK("https://example.invalid")', '＋1', '－1', '＠SUM(A1)', ' \n＝1'])
    expect(csvSafeCell(value), JSON.stringify(value)).toBe(`"'${value.replaceAll('"', '""')}"`);
  for (const value of ['plain', 'a=b', 'a\r\nb', 'café', '1-2', '0', 'say "hi"'])
    expect(csvSafeCell(value), JSON.stringify(value)).toBe(`"${value.replaceAll('"', '""')}"`);
  expect(csvSafeCell(null)).toBe('""');expect(csvSafeCell(undefined)).toBe('""');expect(csvSafeCell(0)).toBe('"0"');expect(csvSafeCell(-3)).toBe('"\'-3"');expect(csvSafeCell(true)).toBe('"true"');
  expect(CSV_FORMULA_START.test('x＝1')).toBe(false);
});
test('the everything export, the Health diary and body measurements all use it', () => {
  const name = '＝HYPERLINK("https://example.invalid")', guarded = `"'＝HYPERLINK(""https://example.invalid"")"`;
  expect(csvCell(name)).toBe(guarded);
  const at = '2026-09-23T12:00:00.000Z', id = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const food = {id: id(1), name, brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: 5000, carbsMg: 27000, fatMg: 3000}, createdAt: at, updatedAt: at};
  const data = logHealthItem(saveFood(createEmptyHealth(), food), {id: id(2), sourceId: food.id, sourceKind: 'food', date: '2026-09-23', meal: 'Lunch', quantityMilli: 1000}, at);
  expect(exportHealthCsv(data, '2026-09-23', '2026-09-23')).toContain(guarded);
  const measured = saveMeasurement(createEmptyHealth(), {id: 'health_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', kind: 'weight', quantityMilli: 70000, unit: 'kg', observedAt: '2026-09-20T10:00:00Z', timezone: 'UTC', sourceLabel: '＝1+1'}, '2026-09-20T10:00:00Z');
  // Saving trims a label, so the full-width trigger (which the old rule let through) is what reaches this writer.
  expect(exportMeasurementsCsv(measured)).toContain(`"'＝1+1"`);
});
