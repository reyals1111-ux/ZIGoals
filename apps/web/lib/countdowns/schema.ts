import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AP (owner-approved feature list, "Days until"; TIER 3 (stored format), additive key only): the person's own
 * countdowns — a title, a date and an optional note — shown as a Today card ("Cards kept on this device") and on the
 * Agenda's day of the event. Its own device record `zigoals:countdowns:v1`: device only, versioned, strict, at most 50;
 * exported, restored and erased with the account; never synced. Written only on the person's choice.
 *
 * A countdown never says a negative "days left": on its day it reads "Today", after it "N days ago", and it moves to
 * the "Passed" list. Days are counted between calendar dates (the device's local day), so a daylight-saving night
 * changes nothing.
 */
export const COUNTDOWNS_KEY = 'zigoals:countdowns:v1';
export const MAX_COUNTDOWNS = 50, COUNTDOWN_TITLE_MAX = 80, COUNTDOWN_NOTE_MAX = 200;
export const countdownSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
  title: z.string().trim().min(1).max(COUNTDOWN_TITLE_MAX),
  date: z.iso.date(),
  note: z.string().trim().min(1).max(COUNTDOWN_NOTE_MAX).optional(),
  createdAt: z.iso.datetime({offset: true}),
}).strict();
export type Countdown = z.infer<typeof countdownSchema>;
export const countdownsSchema = z.object({
  version: z.literal(1),
  items: z.array(countdownSchema).max(MAX_COUNTDOWNS).refine(items => new Set(items.map(i => i.id)).size === items.length, 'Each countdown once.'),
}).strict();
export type Countdowns = z.infer<typeof countdownsSchema>;
export const emptyCountdowns = (): Countdowns => ({version: 1, items: []});
export const COUNTDOWNS: DeviceRecordSpec<Countdowns> = {key: COUNTDOWNS_KEY, schema: countdownsSchema, empty: emptyCountdowns};
export const COUNTDOWN_LIMIT_MESSAGE = `You have ${MAX_COUNTDOWNS} countdowns, the most this device keeps. Remove a passed one first.`;

export type CountdownInput = {title: string; date: string; note?: string};
export function addCountdown(record: Countdowns, input: CountdownInput, {id, at}: {id: string; at: Date}): Countdowns {
  const title = input.title.trim(), note = input.note?.trim();
  if (!title) throw new Error('Give the countdown a name.');
  if (title.length > COUNTDOWN_TITLE_MAX) throw new Error(`A countdown’s name can be at most ${COUNTDOWN_TITLE_MAX} characters (this one has ${title.length}).`);
  if (!z.iso.date().safeParse(input.date).success) throw new Error('Choose a real calendar date.');
  if (note && note.length > COUNTDOWN_NOTE_MAX) throw new Error(`A note can be at most ${COUNTDOWN_NOTE_MAX} characters.`);
  if (record.items.length >= MAX_COUNTDOWNS) throw new Error(COUNTDOWN_LIMIT_MESSAGE);
  return countdownsSchema.parse({...record, items: [...record.items, {id, title, date: input.date, ...(note ? {note} : {}), createdAt: at.toISOString()}]});
}
export const removeCountdown = (record: Countdowns, id: string): Countdowns => ({...record, items: record.items.filter(i => i.id !== id)});
/** Undo of a removal, on the latest record: back in its place (once), never past the cap. */
export function restoreCountdown(record: Countdowns, item: Countdown, index: number): Countdowns {
  if (record.items.some(i => i.id === item.id) || record.items.length >= MAX_COUNTDOWNS) return record;
  const items = [...record.items];
  items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
  return countdownsSchema.parse({...record, items});
}

const dayNumber = (date: string) => Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))) / 86_400_000;
/** Whole calendar days from `today` to `date`: positive ahead, 0 on the day, negative after it. */
export const daysUntil = (date: string, today: string): number => Math.round(dayNumber(date) - dayNumber(today));
/** "Today", "Tomorrow", "In 12 days", "Yesterday", "3 days ago": never a negative count. */
export function countdownWords(date: string, today: string, format: (n: number) => string = String): string {
  const n = daysUntil(date, today);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n === -1) return 'Yesterday';
  return n > 1 ? `In ${format(n)} days` : `${format(-n)} days ago`;
}
/** Today's and the coming countdowns, soonest first; the passed ones, most recent first. */
export function splitCountdowns(record: Countdowns, today: string): {upcoming: Countdown[]; passed: Countdown[]} {
  const upcoming = record.items.filter(i => i.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const passed = record.items.filter(i => i.date < today).sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  return {upcoming, passed};
}
/** The countdowns whose day is `date` (the Agenda's day of the event). */
export const countdownsOn = (record: Countdowns, date: string): Countdown[] => record.items.filter(i => i.date === date).sort((a, b) => a.title.localeCompare(b.title));
