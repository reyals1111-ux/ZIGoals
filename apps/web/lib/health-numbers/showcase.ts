import {addLocalDays} from '../local-date';
import {healthNumbersSchema, type HealthNumbers} from './store';

/**
 * Session AK (BUILD list 2 #4): the Showcase's fictional "Your numbers" — eight weekly blood pressure readings and two lab
 * sheets three months apart, each with the reference range "copied" from a made-up sheet (one value outside it, so the
 * verdict shows both ways). Every note says it is Showcase data. The lead writes it to `zigoals:health-numbers:v1` in the
 * Showcase tab only.
 */
export function showcaseHealthNumbers(day: string): HealthNumbers {
  const bp: [number, number, number][] = [[128, 82, 68], [124, 80, 66], [131, 84, 71], [122, 79, 64], [126, 81, 67], [119, 77, 63], [123, 78, 65], [121, 76, 62]];
  const entries: HealthNumbers['entries'] = bp.map(([systolic, diastolic, pulse], i) => ({
    id: `showcase-bp-${i + 1}`, date: addLocalDays(day, -7 * (bp.length - 1 - i)), kind: 'bp' as const, systolic, diastolic, pulse,
    ...(i === 0 ? {note: 'Showcase example: a fictional morning reading.'} : {}),
  }));
  const sheets: [number, [string, number, string, number | undefined, number | undefined][]][] = [
    [-98, [['Total cholesterol', 5.6, 'mmol/L', undefined, 5.2], ['HDL cholesterol', 1.4, 'mmol/L', 1.0, undefined], ['Glucose (fasting)', 5.3, 'mmol/L', 3.9, 5.6], ['Ferritin', 48, 'µg/L', 30, 300]]],
    [-6, [['Total cholesterol', 5.1, 'mmol/L', undefined, 5.2], ['HDL cholesterol', 1.5, 'mmol/L', 1.0, undefined], ['Glucose (fasting)', 5.1, 'mmol/L', 3.9, 5.6], ['Ferritin', 62, 'µg/L', 30, 300], ['Vitamin D (25-OH)', 64, 'nmol/L', 50, 125]]],
  ];
  sheets.forEach(([offset, rows], s) => rows.forEach(([name, value, unit, refLow, refHigh], r) => entries.push({
    id: `showcase-lab-${s + 1}-${r + 1}`, date: addLocalDays(day, offset), kind: 'lab', name, value, unit,
    ...(refLow !== undefined ? {refLow} : {}), ...(refHigh !== undefined ? {refHigh} : {}),
    ...(r === 0 ? {note: 'Showcase example: a fictional lab sheet.'} : {}),
  })));
  return healthNumbersSchema.parse({version: 1, entries});
}
