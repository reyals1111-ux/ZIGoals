import {validateValue} from './limits/plausibility';
import {JOURNAL_MIN_DAY} from './health-day';
import type {WeightUnit} from './health-units';

/**
 * Session AL (P-MO-62, MO-029): the simplest weight import there is: a CSV (or pasted lines) of "date, weight" with an
 * optional unit column, as any scale app or spreadsheet can write. Read on this device; nothing is saved until the person
 * confirms the preview. Dates are ISO (2026-11-04) only, since 04/11 reads two ways. A day that already has a reading
 * keeps it. Every number goes through the one limits table, in the row's unit.
 */
export type WeightCsvRow = {line: number; date: string; grams: number; typed: string; /** Session AT (D6): the value and its unit as two fields, as read. */ value: string; unit: WeightUnit; /** Where the unit came from: its own column, the value's words, the column's header, or the person's choice. */ unitFrom: 'column' | 'value' | 'header' | 'chosen'};
export type WeightCsvIssue = {line: number; reason: string};
export type WeightCsvPlan = {rows: WeightCsvRow[]; issues: WeightCsvIssue[]; kept: number; /** Session AT (D6): the columns as read from a header row, or by position. */ columns: {date: number; value: number; unit: number | null; headerUnit: WeightUnit | null; fromHeader: boolean}};

/**
 * Session AT (ADR-043 D6; AO D17 / AP D22 "CSV Value/Unit as their own fields"): a header row maps the columns by name, in
 * any order, so a scale app's "Date,Unit,Weight" or "Time;Weight (kg)" reads right; a header's unit ("Weight (lb)") is that
 * column's unit. Without a header the columns are date, value, unit, as before.
 */
function headerColumns(cells: readonly string[]): WeightCsvPlan['columns'] | null {
  const find = (re: RegExp) => cells.findIndex(c => re.test(c));
  const date = find(/^(?:date|day|datum|time|timestamp|tijd)\b/i);
  if (date < 0) return null;
  const value = find(/^(?:weight|value|mass|gewicht|waarde|kg|lb|lbs)\b/i);
  const unit = find(/^(?:unit|units|eenheid)$/i);
  const headerUnit = value >= 0 ? (/\b(kg|lbs?)\b/i.exec(cells[value]!)?.[1]?.toLowerCase().replace('lbs', 'lb') as WeightUnit | undefined) ?? null : null;
  return {date, value: value >= 0 ? value : date === 0 ? 1 : 0, unit: unit >= 0 ? unit : null, headerUnit, fromHeader: true};
}

/** Cells of one line: ";" or a tab when present, else ","; "2026-11-04,72,5" is a decimal comma ("72,5"), not a third cell. */
function splitLine(line: string): string[] {
  const cells = (line.includes(';') ? line.split(';') : line.includes('\t') ? line.split('\t') : line.split(',')).map(c => c.trim().replace(/^"(.*)"$/, '$1').trim());
  if (!line.includes(';') && !line.includes('\t') && /^\d+$/.test(cells[1] ?? '') && /^\d+(?:\s*(?:kg|lb))?$/i.test(cells[2] ?? '')) return [cells[0]!, `${cells[1]},${cells[2]}`, ...cells.slice(3)];
  return cells;
}

export function readWeightCsv(text: string, {unit, today, existing}: {unit: WeightUnit; today: string; existing: readonly string[]}): WeightCsvPlan {
  const rows: WeightCsvRow[] = [], issues: WeightCsvIssue[] = [], seen = new Set(existing);
  let kept = 0;
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  let columns: WeightCsvPlan['columns'] = {date: 0, value: 1, unit: 2, headerUnit: null, fromHeader: false};
  let first = true;
  lines.forEach((raw, index) => {
    const line = index + 1, trimmed = raw.trim();
    if (!trimmed) return;
    const cells = splitLine(trimmed);
    if (first) { first = false; const header = headerColumns(cells); if (header) { columns = header; return; } }
    const date = cells[columns.date] ?? '', value = cells[columns.value] ?? '', unitCell = columns.unit === null ? '' : cells[columns.unit] ?? '';
    const inValue = /(kg|lbs?)\s*$/i.exec(value)?.[1]?.toLowerCase().replace('lbs', 'lb') ?? '';
    const cellUnit = unitCell.toLowerCase().replace(/^lbs$/, 'lb');
    const typedUnit = cellUnit || inValue || columns.headerUnit || unit;
    const unitFrom: WeightCsvRow['unitFrom'] = cellUnit ? 'column' : inValue ? 'value' : columns.headerUnit ? 'header' : 'chosen';
    const number = value.replace(/\s*(kg|lbs?)\s*$/i, '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`))) { issues.push({line, reason: `Line ${line}: the date should read like 2026-11-04.`}); return; }
    if (date > today) { issues.push({line, reason: `Line ${line}: ${date} is after today.`}); return; }
    if (date < JOURNAL_MIN_DAY) { issues.push({line, reason: `Line ${line}: dates start in 1990.`}); return; }
    if (typedUnit !== 'kg' && typedUnit !== 'lb') { issues.push({line, reason: `Line ${line}: the unit should be kg or lb.`}); return; }
    const checked = validateValue('weight', number, typedUnit);
    if (!checked.ok) { issues.push({line, reason: `Line ${line}: ${checked.error}`}); return; }
    if (seen.has(date)) { kept += 1; return; }
    seen.add(date);
    rows.push({line, date, grams: Math.round(checked.value * 1000), typed: `${checked.text} ${typedUnit}`, value: checked.text, unit: typedUnit, unitFrom});
  });
  return {rows, issues, kept, columns};
}
