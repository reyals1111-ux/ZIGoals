import {clockInQuiet} from '../reminders-plan/quiet';
import {addDays, instantAt, wallClock} from '../zone-time';

/**
 * Session AW (X1, LEDGER #438; Due's "remind again until done"): a task reminder that has gone off comes back every few
 * minutes, a set number of times, until the task is Done or the reminder is snoozed. Kept as an optional `again`
 * ({every, times}) on the task's reminder (lib/tasks/schema.ts) — `false` there means "not on this one" — with a default
 * for every task reminder in the loose notification preferences (lib/notify/prefs.ts `taskAgain`). Quiet hours hold the
 * repeats: one that would fall inside them waits until they end, and the ones after it follow from there. Pure: the zone
 * and the quiet hours come in.
 */
export const AGAIN_EVERY = [5, 10, 15, 30] as const;
export type AgainEvery = (typeof AGAIN_EVERY)[number];
export const AGAIN_TIMES_MIN = 2, AGAIN_TIMES_MAX = 10;
export type Again = {every: AgainEvery; times: number};
/** What the editor and the default choice offer first: every 10 minutes, up to 6 times. */
export const AGAIN_SUGGESTED: Again = {every: 10, times: 6};
export const isAgain = (v: unknown): v is Again => !!v && typeof v === 'object' && (AGAIN_EVERY as readonly number[]).includes((v as Again).every)
  && Number.isInteger((v as Again).times) && (v as Again).times >= AGAIN_TIMES_MIN && (v as Again).times <= AGAIN_TIMES_MAX;
/** The repeat a reminder follows: its own, none when it says `false`, else the device's default (or none). */
export function againFor(reminder: {again?: Again | false}, fallback: Again | null | undefined): Again | null {
  if (reminder.again === false) return null;
  if (isAgain(reminder.again)) return {every: reminder.again.every, times: reminder.again.times};
  return fallback && isAgain(fallback) ? fallback : null;
}
/** "every 10 minutes, up to 6 times". */
export const againWords = (a: Again) => `every ${a.every} minutes, up to ${a.times} times`;

/** The instant quiet hours end at or after `at` (their `to` on that day, else the next day's). */
function quietEnd(at: number, quiet: {from: string; to: string}, zone: string): number {
  const day = wallClock(at, zone).date, today = instantAt(day, quiet.to, zone);
  return today > at ? today : instantAt(addDays(day, 1), quiet.to, zone);
}
/**
 * The repeats after a reminder that went off at `start`: `times` instants `every` minutes apart, each one inside quiet hours
 * moved to their end (and the ones after it counted from there). Never the first ring itself.
 */
export function repeatInstants(start: number, again: Again, quiet: {from: string; to: string} | null, zone: string): number[] {
  const out: number[] = [];
  let at = start;
  for (let k = 0; k < again.times; k++) {
    at += again.every * 60_000;
    if (quiet && clockInQuiet(wallClock(at, zone).clock, quiet)) at = quietEnd(at, quiet, zone);
    out.push(at);
  }
  return out;
}
/**
 * Where a reminder that went off at `start` stands at `now`: the latest ring at or before now (the first, or repeat
 * `round` of `times`), and the next ring still ahead (null after the last). Before `start` it has not rung (null).
 */
export function againAt(start: number, again: Again | null, quiet: {from: string; to: string} | null, zone: string, now: number): {at: number; round: number; times: number; next: number | null} | null {
  if (start > now) return null;
  if (!again) return {at: start, round: 0, times: 0, next: null};
  const rings = repeatInstants(start, again, quiet, zone);
  let round = 0;
  while (round < rings.length && rings[round]! <= now) round++;
  return {at: round ? rings[round - 1]! : start, round, times: again.times, next: rings[round] ?? null};
}
/** The editor's choice for a task: its reminders' own repeat, "off", or the default (nothing written). */
export type AgainChoice = {kind: 'default'} | {kind: 'off'} | {kind: 'own'; again: Again};
export function againChoiceOf(task: {reminders?: readonly {before?: number; at?: string; again?: Again | false}[]}): AgainChoice {
  const r = task.reminders?.find(x => x.again !== undefined);
  if (!r) return {kind: 'default'};
  if (r.again === false) return {kind: 'off'};
  return isAgain(r.again) ? {kind: 'own', again: {every: r.again.every, times: r.again.times}} : {kind: 'default'};
}
/** The reminder fields the choice writes: nothing for the default (an older reminder stays as it was). */
export const againPatch = (c: AgainChoice): {again?: Again | false} => c.kind === 'off' ? {again: false} : c.kind === 'own' ? {again: c.again} : {};
