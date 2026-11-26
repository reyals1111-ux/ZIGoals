import type {HealthWeight} from '../health';
import {csvSafeCell} from '../export/csv-safe';
import {GRAMS_PER_LB} from '../health-units';
import {bodyExtrasSchema, WEIGH_NOTE_MAX, WEIGH_NOTES_MAX, type BodyExtras} from './schema';
import {daysBetween} from './predict';

/**
 * Session AW (X6; LEDGER #457, Happy Scale's notes and new lows):
 * - A short note on a weigh-in ("after the holiday", "new scale"), kept by the weight's id in the loose body-extras record
 *   beside Health's strict weights. A note whose weigh-in has been removed is not shown, and is dropped at the next write.
 * - "Lowest since 3 Mar": a weigh-in lower than every reading after an earlier one at or below it, at least
 *   `LOW_GAP_DAYS` days back with a reading between; with none at or below it, the lowest of all the readings. A fact in
 *   the list, never a celebration (the milestones celebrate once already), and never said of the very first reading.
 * - The CSV of weigh-ins with their notes and marks, made on this device.
 */
export const LOW_GAP_DAYS = 14;
export type LowMark = {since: string | null};
export type WeighIn = {id: string; date: string; grams: number; note: string | null; low: LowMark | null};
/** The note of each weigh-in that still exists, by id. */
export function notesById(r: BodyExtras, weights: readonly Pick<HealthWeight, 'id'>[]): Map<string, string> {
  const ids = new Set(weights.map(w => w.id));
  return new Map((r.weighNotes ?? []).filter(n => ids.has(n.id)).map(n => [n.id, n.note] as const));
}
/** Every weigh-in, newest first, with its note and its "lowest since" mark. */
export function weighIns(weights: readonly HealthWeight[], r: BodyExtras): WeighIn[] {
  const notes = notesById(r, weights), asc = [...weights].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const out = asc.map((w, i): WeighIn => {
    let low: LowMark | null = null;
    if (i > 0) {
      let j = i - 1;
      while (j >= 0 && asc[j]!.grams > w.grams) j--;
      if (j < 0) low = {since: null};
      else if (i - j >= 2 && daysBetween(asc[j]!.date, w.date) >= LOW_GAP_DAYS) low = {since: asc[j]!.date};
    }
    return {id: w.id, date: w.date, grams: w.grams, note: notes.get(w.id) ?? null, low};
  });
  return out.reverse();
}
/** Sets (or, with an empty text, removes) the note of a weigh-in; notes of removed weigh-ins are dropped on the way. */
export function setWeighNote(r: BodyExtras, weights: readonly Pick<HealthWeight, 'id'>[], id: string, text: string): BodyExtras {
  const ids = new Set(weights.map(w => w.id));
  if (!ids.has(id)) throw Error('This weigh-in is no longer here.');
  const note = text.trim().replace(/\s+/g, ' ');
  if (note.length > WEIGH_NOTE_MAX) throw Error(`Keep a note to ${WEIGH_NOTE_MAX} characters.`);
  const kept = (r.weighNotes ?? []).filter(n => ids.has(n.id) && n.id !== id);
  if (note && kept.length >= WEIGH_NOTES_MAX) throw Error(`Up to ${WEIGH_NOTES_MAX} notes can be kept. Clear an older one first.`);
  const next = note ? [...kept, {id, note}] : kept;
  const {weighNotes: _old, ...base} = r; void _old;
  return bodyExtrasSchema.parse(next.length ? {...base, weighNotes: next} : base);
}
const lbOf = (grams: number) => String(Math.round(grams / GRAMS_PER_LB * 100) / 100);
/** "weigh-ins.csv": date, kg, lb (converted), note, lowest since; oldest first, each cell safe for a spreadsheet. */
export function weighInsCsv(rows: readonly WeighIn[]): string {
  const header = ['date', 'kg', 'lb_converted', 'note', 'lowest_since'];
  const body = [...rows].reverse().map(w => [w.date, String(w.grams / 1000), lbOf(w.grams), w.note ?? '', w.low ? w.low.since ?? 'all readings' : '']);
  return [header, ...body].map(row => row.map(csvSafeCell).join(',')).join('\r\n');
}
/**
 * For Export everything's weights.csv (wired by the integrator, lib/export/everything.ts): the note of a weight id from the
 * exported body-extras record (`json.device.bodyExtras`), or '' — read tolerantly, as the export reads every device record.
 */
export function weighNoteForExport(bodyExtras: unknown, id: string): string {
  const parsed = bodyExtrasSchema.safeParse(bodyExtras);
  return parsed.success ? parsed.data.weighNotes?.find(n => n.id === id)?.note ?? '' : '';
}
