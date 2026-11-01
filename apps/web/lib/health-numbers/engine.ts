import {readFormNumber} from '../decimal-input';
import {BP_LIMITS, LAB_VALUE_MAX, MAX_NUMBERS, NAME_MAX, NOTE_MAX, UNIT_MAX, healthNumbersSchema, type HealthNumber, type HealthNumbers} from './store';

/**
 * Session AK (BUILD list 2 #4): the pure steps of "Your numbers". Adding refuses past the cap (nothing is dropped
 * silently); a lab marker is its name (letter case aside) together with its unit exactly as typed, so "Glucose mmol/L"
 * and "Glucose mg/dL" are two lines and never one; the only verdict is against the range the person copied, and a value
 * with no range copied has none. Nothing here interprets a number, and nothing is stored here.
 */
export const LIMIT_MESSAGE = `You have ${MAX_NUMBERS} readings, the most kept. Remove an older one first.`;
export const BP_LINE = 'Your readings. Not a diagnosis.';
export const LAB_LINE = 'ZIGoals sets no ranges and gives no interpretation. The only check is against the range you copied from your own lab sheet.';

export type BpInput = {date: string; systolic: string; diastolic: string; pulse?: string; note?: string};
export type LabInput = {date: string; name: string; value: string; unit?: string; refLow?: string; refHigh?: string; note?: string};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const clean = (s: string | undefined, max: number) => (s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const named = (label: string, fn: () => number) => { try { return fn(); } catch (e) { throw new Error(`${label}: ${e instanceof Error ? e.message : 'check the number'}`); } };

/** A blood pressure entry from the form's text (whole numbers, mmHg), or an Error with a reason to show. */
export function bpEntry(input: BpInput, id: string, today: string): HealthNumber {
  if (!DAY.test(input.date) || input.date > today) throw new Error('Choose the day of the reading (today or earlier).');
  const systolic = named('Upper number', () => readFormNumber(input.systolic, {min: BP_LIMITS.systolic[0], max: BP_LIMITS.systolic[1], whole: true}));
  const diastolic = named('Lower number', () => readFormNumber(input.diastolic, {min: BP_LIMITS.diastolic[0], max: BP_LIMITS.diastolic[1], whole: true}));
  if (diastolic >= systolic) throw new Error('The upper number (systolic) is the larger one. Check the order.');
  const pulse = input.pulse?.trim() ? named('Pulse', () => readFormNumber(input.pulse!, {min: BP_LIMITS.pulse[0], max: BP_LIMITS.pulse[1], whole: true})) : undefined;
  const note = clean(input.note, NOTE_MAX);
  return {id, date: input.date, kind: 'bp', systolic, diastolic, ...(pulse !== undefined ? {pulse} : {}), ...(note ? {note} : {})};
}
/** A lab value from the form's text: the unit as typed, a range end only when the person copied one. */
export function labEntry(input: LabInput, id: string, today: string): HealthNumber {
  if (!DAY.test(input.date) || input.date > today) throw new Error('Choose the day on the lab sheet (today or earlier).');
  const name = clean(input.name, NAME_MAX);
  if (!name || !/[\p{L}\p{N}]/u.test(name)) throw new Error('Give the value its name as on the sheet (for example “Glucose”).');
  const value = named('Value', () => readFormNumber(input.value, {max: LAB_VALUE_MAX}));
  const refLow = input.refLow?.trim() ? named('Range, low end', () => readFormNumber(input.refLow!, {max: LAB_VALUE_MAX})) : undefined;
  const refHigh = input.refHigh?.trim() ? named('Range, high end', () => readFormNumber(input.refHigh!, {max: LAB_VALUE_MAX})) : undefined;
  if (refLow !== undefined && refHigh !== undefined && refLow > refHigh) throw new Error('The low end of the range is above the high end. Check the order.');
  const unit = clean(input.unit, UNIT_MAX), note = clean(input.note, NOTE_MAX);
  return {id, date: input.date, kind: 'lab', name, value, ...(unit ? {unit} : {}), ...(refLow !== undefined ? {refLow} : {}), ...(refHigh !== undefined ? {refHigh} : {}), ...(note ? {note} : {})};
}

export function addNumbers(rec: HealthNumbers, entries: readonly HealthNumber[]): HealthNumbers {
  if (rec.entries.length + entries.length > MAX_NUMBERS) throw new Error(LIMIT_MESSAGE);
  return healthNumbersSchema.parse({...rec, entries: [...rec.entries, ...entries]});
}
export const removeNumber = (rec: HealthNumbers, id: string): HealthNumbers => healthNumbersSchema.parse({...rec, entries: rec.entries.filter(e => e.id !== id)});
/** Puts a removed entry back (Undo), once. */
export const restoreNumber = (rec: HealthNumbers, entry: HealthNumber): HealthNumbers => rec.entries.some(e => e.id === entry.id) ? rec : addNumbers(rec, [entry]);

export type Verdict = 'inside' | 'below' | 'above';
/** Inside or outside the range the person copied; null when no range was copied (no verdict, never "normal"). */
export function verdictOf(e: Pick<HealthNumber, 'kind' | 'value' | 'refLow' | 'refHigh'>): Verdict | null {
  if (e.kind !== 'lab' || e.value === undefined || (e.refLow === undefined && e.refHigh === undefined)) return null;
  if (e.refLow !== undefined && e.value < e.refLow) return 'below';
  if (e.refHigh !== undefined && e.value > e.refHigh) return 'above';
  return 'inside';
}
export const VERDICT_WORDS: Readonly<Record<Verdict, string>> = {
  inside: 'Inside the range you copied',
  below: 'Outside the range you copied (below it)',
  above: 'Outside the range you copied (above it)',
};
/** The range as the person copied it ("3.9–5.5", "below 5.2", "above 40"), or null. */
export function rangeText(e: Pick<HealthNumber, 'refLow' | 'refHigh'>, fmt: (n: number) => string = String): string | null {
  if (e.refLow !== undefined && e.refHigh !== undefined) return `${fmt(e.refLow)}–${fmt(e.refHigh)}`;
  if (e.refHigh !== undefined) return `up to ${fmt(e.refHigh)}`;
  if (e.refLow !== undefined) return `from ${fmt(e.refLow)}`;
  return null;
}

const byDate = (a: HealthNumber, b: HealthNumber) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
export const bpReadings = (rec: HealthNumbers): HealthNumber[] => rec.entries.filter(e => e.kind === 'bp').sort(byDate);
export type Marker = {key: string; name: string; unit: string; points: HealthNumber[]; latest: HealthNumber};
/** The lab markers, one line each: same name (letter case aside) and the same unit as typed. Newest first. */
export function markers(rec: HealthNumbers): Marker[] {
  const groups = new Map<string, HealthNumber[]>();
  for (const e of rec.entries) {
    if (e.kind !== 'lab' || !e.name || e.value === undefined) continue;
    const key = `${e.name.toLocaleLowerCase('en')}|${e.unit ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups].map(([key, list]) => { const points = [...list].sort(byDate), latest = points.at(-1)!; return {key, name: latest.name!, unit: latest.unit ?? '', points, latest}; })
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date) || a.name.localeCompare(b.name));
}
/** Names typed before, for the form's suggestions (each once, newest first). */
export const knownNames = (rec: HealthNumbers): {name: string; unit: string}[] => markers(rec).map(m => ({name: m.name, unit: m.unit}));
