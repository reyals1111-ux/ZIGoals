import {HEALTH_NUMBERS, HEALTH_NUMBERS_KEY, healthNumberSchema, type HealthNumbers} from '../../health-numbers/store';
import {addNumbers, removeNumber} from '../../health-numbers/engine';
import {SCALE_ID, SCALES, SCALES_KEY, type Scales} from '../../scales/store';
import {rateScale} from '../../scales/engine';
import {registerDeviceWrite, type Entry} from './device-writes';

/**
 * Owner follow-up 2 (G8): the two BUILD list 2 records ZIGi's and NOVA's new cards change, each through its owner's own
 * functions with one fixed patch shape, checked again here (a card's patch can never widen what it does), and each with
 * its Undo:
 * - `zigoals:health-numbers:v1`: `{add: {entry}}`, one blood pressure reading (kind 'bp' only; a lab value is never
 *   written by a card) through `addNumbers` (its cap and schema); Undo `{remove: {id, date}}` takes exactly that reading
 *   off while it is still there unchanged.
 * - `zigoals:scales:v1`: `{rate: {day, id, value, before}}` through `rateScale`, only while the day's rating is still
 *   `before` (null: none) and the scale is one of the active ones; Undo `{restore: {day, id, value, before}}` puts `before`
 *   back while the rating is still `value`.
 * The task moves (`zigoals:tasks:v1`, lib/wrap-up-tasks) ride on NOVA's registered tasks writer (nova-writes.ts).
 * An Undo that finds the record changed since throws G1_UNDO_REFUSED and changes nothing.
 */
export const G1_UNDO_REFUSED = 'Something changed since, so this undo was not applied. Your records are as they are now.';
const NOT_A_CARD = 'That change is not one a card can make.';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const only = (patch: Record<string, unknown>, keys: readonly string[]) => Object.keys(patch).length > 0 && Object.keys(patch).every(k => keys.includes(k));
const DAY = /^\d{4}-\d{2}-\d{2}$/, ID = /^[A-Za-z0-9_-]{1,80}$/;
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const healthNumbersEntry: Entry<HealthNumbers> = {spec: HEALTH_NUMBERS, apply: (record, patch) => {
  if (!object(patch) || (!only(patch, ['add']) && !only(patch, ['remove']))) throw new Error(NOT_A_CARD);
  if (object(patch.remove)) {
    const {id, date} = patch.remove;
    if (typeof id !== 'string' || !ID.test(id) || typeof date !== 'string' || !DAY.test(date) || !only(patch.remove, ['id', 'date'])) throw new Error(NOT_A_CARD);
    const entry = record.entries.find(e => e.id === id);
    if (!entry || entry.kind !== 'bp' || entry.date !== date) throw new Error(G1_UNDO_REFUSED);
    return removeNumber(record, id);
  }
  const a = patch.add;
  if (!object(a) || !only(a, ['entry']) || !object(a.entry)) throw new Error(NOT_A_CARD);
  const parsed = healthNumberSchema.safeParse(a.entry);
  if (!parsed.success || parsed.data.kind !== 'bp' || !only(a.entry, ['id', 'date', 'kind', 'systolic', 'diastolic', 'pulse', 'note'])) throw new Error(NOT_A_CARD);
  if (record.entries.some(e => e.id === parsed.data.id)) throw new Error('This reading is already kept.');
  return addNumbers(record, [parsed.data]);
}};

function rating(v: unknown): {day: string; id: string; value: number; before: number | null} {
  const r = object(v) ? v : null, score = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
  if (!r || !only(r, ['day', 'id', 'value', 'before']) || typeof r.day !== 'string' || !DAY.test(r.day) || typeof r.id !== 'string' || !SCALE_ID.test(r.id) || !score(r.value) || !(r.before === null || score(r.before))) throw new Error(NOT_A_CARD);
  return {day: r.day, id: r.id, value: r.value as number, before: r.before as number | null};
}
export const scalesEntry: Entry<Scales> = {spec: SCALES, apply: (record, patch) => {
  if (!object(patch) || (!only(patch, ['rate']) && !only(patch, ['restore']))) throw new Error(NOT_A_CARD);
  if (patch.restore !== undefined) {
    const r = rating(patch.restore);
    if ((record.days[r.day]?.[r.id] ?? null) !== r.value) throw new Error(G1_UNDO_REFUSED);
    return rateScale(record, r.day, r.id, r.before);
  }
  const r = rating(patch.rate);
  if (!record.scales.some(s => s.id === r.id)) throw new Error('That scale is no longer in your check-in.');
  if (!same(record.days[r.day]?.[r.id] ?? null, r.before)) throw new Error('This day\'s rating changed since the card was made; ask again.');
  return rateScale(record, r.day, r.id, r.value);
}};

registerDeviceWrite(HEALTH_NUMBERS_KEY, healthNumbersEntry);
registerDeviceWrite(SCALES_KEY, scalesEntry);
