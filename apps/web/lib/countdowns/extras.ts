import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {COUNTDOWN_EXTRAS_KEY_LITERAL} from '../av-device-keys';
import {daysUntil, type Countdown, type Countdowns} from './schema';

/**
 * Session AV (owner follow-up 1, F-COUNTDOWN-YEARLY; TickTick's yearly countdowns with a reminder; TIER 3 (stored format),
 * additive key): which countdowns come back every year (a birthday, an anniversary) and how many days before to remind —
 * kept in its own device record keyed by the countdown's id, so the strict `zigoals:countdowns:v1` is untouched and an
 * older build simply shows the date as before. Loose, versioned, at most 50; a value this build cannot read is dropped
 * on read, never a reason to refuse the record. Pure.
 */
export const COUNTDOWN_EXTRAS_KEY = COUNTDOWN_EXTRAS_KEY_LITERAL;
export const REMIND_CHOICES = [1, 3, 7, 14, 30] as const;
const extraSchema = z.looseObject({
  yearly: z.literal(true).optional().catch(undefined),
  remindDays: z.number().int().min(1).max(30).optional().catch(undefined),
});
export type CountdownExtra = z.infer<typeof extraSchema>;
export const countdownExtrasSchema = z.looseObject({
  version: z.literal(1),
  items: z.record(z.string().regex(/^[A-Za-z0-9_-]{1,80}$/), extraSchema).refine(items => Object.keys(items).length <= 50, 'At most 50.'),
});
export type CountdownExtras = z.infer<typeof countdownExtrasSchema>;
export const emptyCountdownExtras = (): CountdownExtras => ({version: 1, items: {}});
export const COUNTDOWN_EXTRAS: DeviceRecordSpec<CountdownExtras> = {key: COUNTDOWN_EXTRAS_KEY, schema: countdownExtrasSchema, empty: emptyCountdownExtras};
/** Sets (or clears, when nothing is left) a countdown's extras. */
export function withExtra(record: CountdownExtras, id: string, extra: {yearly?: boolean; remindDays?: number | null}): CountdownExtras {
  const items = {...record.items}, next: CountdownExtra = {...(extra.yearly ? {yearly: true as const} : {}), ...(extra.remindDays ? {remindDays: extra.remindDays} : {})};
  if (Object.keys(next).length) items[id] = next; else delete items[id];
  return countdownExtrasSchema.parse({...record, items});
}
/** Drops the extras of countdowns that are gone (kept small; called on removal). */
export const withoutExtra = (record: CountdownExtras, id: string): CountdownExtras => { const items = {...record.items}; delete items[id]; return {...record, items}; };
/** The day a yearly countdown next falls on, today or later (29 February is the 28th in other years). */
export function nextYearly(date: string, today: string): string {
  const md = date.slice(5);
  const on = (y: number) => { const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; return `${y}-${md === '02-29' && !leap ? '02-28' : md}`; };
  const y = Number(today.slice(0, 4)), here = on(y);
  return here >= today ? here : on(y + 1);
}
/** A countdown as shown: a yearly one moved to its next day once its own date has passed. */
export const shownDate = (c: Pick<Countdown, 'id' | 'date'>, extras: CountdownExtras, today: string) => extras.items[c.id]?.yearly && c.date < today ? nextYearly(c.date, today) : c.date;
/** Today's and the coming countdowns (yearly ones on their next day), soonest first; the passed ones, latest first. */
export function splitWithExtras(record: Countdowns, extras: CountdownExtras, today: string): {upcoming: (Countdown & {shown: string})[]; passed: (Countdown & {shown: string})[]} {
  const all = record.items.map(c => ({...c, shown: shownDate(c, extras, today)}));
  return {upcoming: all.filter(c => c.shown >= today).sort((a, b) => a.shown.localeCompare(b.shown) || a.title.localeCompare(b.title)),
    passed: all.filter(c => c.shown < today).sort((a, b) => b.shown.localeCompare(a.shown) || a.title.localeCompare(b.title))};
}
/** The countdowns within their reminder: from N days before their (next) day up to the day itself. */
export function dueReminders(record: Countdowns, extras: CountdownExtras, today: string): {item: Countdown; shown: string; days: number}[] {
  return record.items.flatMap(c => { const r = extras.items[c.id]?.remindDays, shown = shownDate(c, extras, today), days = daysUntil(shown, today); return r && days >= 0 && days <= r ? [{item: c, shown, days}] : []; })
    .sort((a, b) => a.days - b.days || a.item.title.localeCompare(b.item.title));
}
