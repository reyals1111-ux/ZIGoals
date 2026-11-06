import {validateValue} from './limits/plausibility';
import {JOURNAL_MIN_DAY} from './health-day';
import type {WeightUnit} from './health-units';

/**
 * Session AL (P-MO-62, MO-029): the simplest weight import there is: a CSV (or pasted lines) of "date, weight" with an
 * optional unit column, as any scale app or spreadsheet can write. Read on this device; nothing is saved until the person
 * confirms the preview. Dates are ISO (2026-11-04) only, since 04/11 reads two ways. A day that already has a reading
 * keeps it. Every number goes through the one limits table, in the row's unit.
 */
export type WeightCsvRow = {line: number; date: string; grams: number; typed: string};
export type WeightCsvIssue = {line: number; reason: string};
export type WeightCsvPlan = {rows: WeightCsvRow[]; issues: WeightCsvIssue[]; kept: number};

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
  lines.forEach((raw, index) => {
    const line = index + 1, trimmed = raw.trim();
    if (!trimmed) return;
    const cells = splitLine(trimmed);
    if (index === 0 && /date/i.test(cells[0] ?? '') ) return; // a header row
    const [date = '', value = '', unitCell = ''] = cells;
    const typedUnit = (unitCell || (/(kg|lb)\s*$/i.exec(value)?.[1] ?? '')).toLowerCase() || unit;
    const number = value.replace(/\s*(kg|lb)\s*$/i, '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00Z`))) { issues.push({line, reason: `Line ${line}: the date should read like 2026-11-04.`}); return; }
    if (date > today) { issues.push({line, reason: `Line ${line}: ${date} is after today.`}); return; }
    if (date < JOURNAL_MIN_DAY) { issues.push({line, reason: `Line ${line}: dates start in 1990.`}); return; }
    if (typedUnit !== 'kg' && typedUnit !== 'lb') { issues.push({line, reason: `Line ${line}: the unit should be kg or lb.`}); return; }
    const checked = validateValue('weight', number, typedUnit);
    if (!checked.ok) { issues.push({line, reason: `Line ${line}: ${checked.error}`}); return; }
    if (seen.has(date)) { kept += 1; return; }
    seen.add(date);
    rows.push({line, date, grams: Math.round(checked.value * 1000), typed: `${checked.text} ${typedUnit}`});
  });
  return {rows, issues, kept};
}
