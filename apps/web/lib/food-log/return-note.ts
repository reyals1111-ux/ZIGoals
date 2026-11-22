import type {HealthData} from '../health';
import {healthExtrasSchema, RETURN_NOTE_MAX, type HealthExtras} from '../health-extras';
import {isInvisibleName} from '../visible-text';

/**
 * Session AV lane 2, round 4 (health; LEDGER #329, Noom's Motivation SOS Plan): "A note for a harder week" — a few lines
 * the person writes to themselves (why it matters, one small thing to do), kept on this device (the health extras'
 * `returnNote`), shown on Health's food day when they come back after three or more days without a food log, until they
 * close it or log food that day. It never says how many days were missed (the calm-design rule). Texts and emails (Noom's
 * way) are a server service and not offered. Pure.
 */
export const AWAY_DAYS = 3;
const dayNumber = (d: string) => Math.round(Date.parse(`${d}T12:00:00Z`) / 86_400_000);
/** The latest day before `today` with a food logged, or null. */
export function lastFoodDay(health: Pick<HealthData, 'diary'>, today: string): string | null {
  let last: string | null = null;
  for (const e of health.diary) if (e.date < today && (last === null || e.date > last)) last = e.date;
  return last;
}
/** The note to show today, or null: written, nothing logged today, the last food log three or more days back, not closed for this return. */
export function returnNoteDue(health: Pick<HealthData, 'diary'>, extras: HealthExtras | null | undefined, today: string): {text: string; lastLogged: string} | null {
  const note = extras?.returnNote;
  if (!note?.text || health.diary.some(e => e.date === today)) return null;
  const last = lastFoodDay(health, today);
  if (!last || dayNumber(today) - dayNumber(last) - 1 < AWAY_DAYS || note.closedFor === last) return null;
  return {text: note.text, lastLogged: last};
}
/** Saves the note's words (blank removes it), or says what to fix. */
export function setReturnNote(r: HealthExtras, text: string): {ok: true; value: HealthExtras} | {ok: false; message: string} {
  const t = text.replace(/\r\n?/g, '\n').trim();
  if (t.length > RETURN_NOTE_MAX) return {ok: false, message: `Keep the note to ${RETURN_NOTE_MAX} characters or fewer.`};
  if (t && isInvisibleName(t)) return {ok: false, message: 'Write a few words with letters or numbers, or leave it blank.'};
  return {ok: true, value: healthExtrasSchema.parse({...r, returnNote: t ? {text: t} : undefined})};
}
/** Closes the note for this return: it shows again only after the next three days without a food log. */
export const closeReturnNote = (r: HealthExtras, lastLogged: string): HealthExtras => r.returnNote ? healthExtrasSchema.parse({...r, returnNote: {...r.returnNote, closedFor: lastLogged}}) : r;
