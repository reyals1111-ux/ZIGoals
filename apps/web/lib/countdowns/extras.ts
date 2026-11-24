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
  /**
   * Session AV lane 2 (tasks, LEDGER #15; TickTick's "days since"; TIER 3 (stored format), additive and optional): the
   * countdown counts up from its date ("412 days since · 1 year, 1 month") instead of moving to Passed. Older builds
   * ignore it and show the date as passed.
   */
  since: z.literal(true).optional().catch(undefined),
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
export function withExtra(record: CountdownExtras, id: string, extra: {yearly?: boolean; remindDays?: number | null; since?: boolean}): CountdownExtras {
  // Session AV lane 2 (LEDGER #15): `since` is kept unless the caller says otherwise (callers before it never name it).
  const since = extra.since ?? !!record.items[id]?.since;
  const items = {...record.items}, next: CountdownExtra = {...(extra.yearly ? {yearly: true as const} : {}), ...(extra.remindDays ? {remindDays: extra.remindDays} : {}), ...(since ? {since: true as const} : {})};
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
export function splitWithExtras(record: Countdowns, extras: CountdownExtras, today: string): {upcoming: (Countdown & {shown: string})[]; passed: (Countdown & {shown: string})[]; since: (Countdown & {shown: string})[]} {
  const all = record.items.map(c => ({...c, shown: shownDate(c, extras, today)}));
  // Session AV lane 2 (LEDGER #15): a "since" countdown whose day has come counts up in its own list, longest first.
  const counting = (c: Countdown) => !!extras.items[c.id]?.since && c.date <= today && !extras.items[c.id]?.yearly;
  return {upcoming: all.filter(c => c.shown >= today && !counting(c)).sort((a, b) => a.shown.localeCompare(b.shown) || a.title.localeCompare(b.title)),
    passed: all.filter(c => c.shown < today && !counting(c)).sort((a, b) => b.shown.localeCompare(a.shown) || a.title.localeCompare(b.title)),
    since: all.filter(counting).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))};
}
/** Whole years and the months after them from `date` to `today` (a birthday counts a year on its day; 29 Feb on 28 Feb). */
export function yearsMonthsSince(date: string, today: string): {years: number; months: number} {
  if (today < date) return {years: 0, months: 0};
  const [y1, m1, d1] = date.split('-').map(Number) as [number, number, number], [y2, m2, d2] = today.split('-').map(Number) as [number, number, number];
  const last = new Date(Date.UTC(y2, m2, 0)).getUTCDate();
  let months = (y2 - y1) * 12 + (m2 - m1);
  if (d2 < Math.min(d1, last)) months -= 1;
  return {years: Math.floor(months / 12), months: months % 12};
}
/**
 * Session AV lane 2 (tasks, LEDGER #15; TickTick's "years since"): a counting-up line — "412 days since · 1 year, 1 month",
 * "Today: day 1", "3 days since". Never negative (a day ahead reads as its countdown instead).
 */
export function sinceWords(date: string, today: string, format: (n: number) => string = String): string {
  const n = daysUntil(today, date);
  if (n <= 0) return n === 0 ? 'Today: day 1' : countdownWordsAhead(-n, format);
  const {years, months} = yearsMonthsSince(date, today), span = years || months ? ` · ${[years ? `${format(years)} ${years === 1 ? 'year' : 'years'}` : '', months ? `${format(months)} ${months === 1 ? 'month' : 'months'}` : ''].filter(Boolean).join(', ')}` : '';
  return `${format(n)} ${n === 1 ? 'day' : 'days'} since${span}`;
}
const countdownWordsAhead = (n: number, format: (n: number) => string) => n === 1 ? 'Tomorrow' : `In ${format(n)} days`;
/** How many years a yearly countdown marks on its next day ("turns 37", "5 years"): 0 when its first day is that one. */
export const yearsOnNext = (c: Pick<Countdown, 'date'>, shown: string): number => Math.max(0, Number(shown.slice(0, 4)) - Number(c.date.slice(0, 4)));
/**
 * Session AV (1c, q1 #44, fresh-agent review; TickTick notifies): the mornings a countdown's reminder should reach the
 * device's notifications — the first day of its reminder (N days before) and the day itself — within the next `ahead`
 * days, today included. A yearly one counts from its next day. Pure; the plan adds the morning time.
 */
export function countdownWakes(record: Countdowns, extras: CountdownExtras, today: string, ahead = 30): {id: string; title: string; date: string; days: number}[] {
  const out: {id: string; title: string; date: string; days: number}[] = [];
  for (const c of record.items) {
    const r = extras.items[c.id]?.remindDays; if (!r) continue;
    const shown = shownDate(c, extras, today), left = daysUntil(shown, today);
    if (left < 0) continue;
    for (const days of [...new Set([r, 0])]) { const until = left - days; if (until >= 0 && until <= ahead && (days === 0 || days <= left)) out.push({id: c.id, title: c.title, date: shiftDay(today, until), days}); }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}
const shiftDay = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** The countdowns within their reminder: from N days before their (next) day up to the day itself. */
export function dueReminders(record: Countdowns, extras: CountdownExtras, today: string): {item: Countdown; shown: string; days: number}[] {
  return record.items.flatMap(c => { const r = extras.items[c.id]?.remindDays, shown = shownDate(c, extras, today), days = daysUntil(shown, today); return r && days >= 0 && days <= r ? [{item: c, shown, days}] : []; })
    .sort((a, b) => a.days - b.days || a.item.title.localeCompare(b.item.title));
}
