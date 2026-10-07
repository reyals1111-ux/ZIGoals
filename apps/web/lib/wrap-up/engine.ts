import {DEFAULT_WRAP_UP_TIME, MAX_WRAP_UP_DAYS, wrapUpSchema, type WrapUp} from './schema';
import {emptyMoods, MAX_MOOD_DAYS, moodsSchema, type MoodDay} from '../moods/schema';
import {healthGroupIn, settingsGroupIn, withHealthGroup, withSettingsGroup} from '../vault/w-homes';
import {clockSchema} from '../sleep/schema';
import type {DashboardSettings} from '../dashboard-settings';
import type {HealthData} from '../health';

/**
 * The evening wrap-up (Session W Part 13). Off until the person turns it on (Settings → Today); then, from its time
 * (18:00 unless changed) on this device's clock, one card in Today's "For you" until the day is wrapped up or put off.
 * The card shows the day from the person's own records, asks how the day felt (Health v4 `moods`, a Health record like
 * any other: the same consent, the same ZIGi gate) and for one intention for tomorrow (settings v3 `wrapUp`), which
 * Today shows the next day. No score, no streak, nothing about what was not done.
 */
export const wrapUpOf = (settings: DashboardSettings): WrapUp | undefined => settingsGroupIn(settings, 'wrapUp');
export const wrapUpEnabled = (settings: DashboardSettings): boolean => wrapUpOf(settings)?.enabled.v === true;
export const wrapUpTime = (settings: DashboardSettings): string => wrapUpOf(settings)?.time?.v ?? DEFAULT_WRAP_UP_TIME;
const start = (settings: DashboardSettings, at: string): WrapUp => wrapUpOf(settings) ?? {version: 1, enabled: {v: false, at}, days: {}};
const newest = <T>(days: Record<string, T>, max: number): Record<string, T> => Object.fromEntries(Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).slice(0, max));
/** Turns it on or off and sets its time; only what changed gets a new stamp; off where it was never on writes nothing. */
export function setWrapUp(settings: DashboardSettings, enabled: boolean, time: string, at: string): DashboardSettings {
  const current = start(settings, at), clock = clockSchema.parse(time);
  const next = wrapUpSchema.parse({...current, enabled: current.enabled.v === enabled ? current.enabled : {v: enabled, at}, ...((current.time?.v ?? DEFAULT_WRAP_UP_TIME) === clock ? {} : {time: {v: clock, at}})});
  return withSettingsGroup(settings, 'wrapUp', next, !enabled && !wrapUpOf(settings));
}
/** Wraps up a day: an intention for tomorrow (optional) and when; "Not today" is the same with no intention. */
export function wrapUpDay(settings: DashboardSettings, day: string, intention: string | null, at: string): DashboardSettings {
  const current = start(settings, at), text = intention?.trim();
  const days = newest({...current.days, [day]: {...(text ? {intention: text} : {}), doneAt: at, at}}, MAX_WRAP_UP_DAYS);
  return withSettingsGroup(settings, 'wrapUp', wrapUpSchema.parse({...current, days}), false);
}
export const wrappedUp = (settings: DashboardSettings, day: string): boolean => !!wrapUpOf(settings)?.days[day]?.doneAt;
/** The intention the person wrote the evening before (`dayBefore`), shown on Today while the wrap-up is on. */
export const intentionFrom = (settings: DashboardSettings, dayBefore: string): string | null => wrapUpEnabled(settings) ? wrapUpOf(settings)?.days[dayBefore]?.intention ?? null : null;
/** The card shows while it is on, from its time on this device's clock, until the day is wrapped up. */
export const wrapUpDue = (settings: DashboardSettings, day: string, clock: string): boolean => wrapUpEnabled(settings) && clock >= wrapUpTime(settings) && !wrappedUp(settings, day);

/** How the day felt, in the person's word, 1 to 5; never a score or a judgement. */
export const MOOD_WORDS = ['Hard', 'Low', 'Okay', 'Good', 'Great'] as const;
export const moodOn = (health: HealthData, day: string): MoodDay | undefined => healthGroupIn(health, 'moods')?.days[day];
/** The day's mood (the newer answer replaces the earlier one; a note the person wrote stays). */
export function setMood(health: HealthData, day: string, mood: number, at: string): HealthData {
  const current = healthGroupIn(health, 'moods') ?? emptyMoods();
  const days = newest({...current.days, [day]: {...current.days[day], mood, at}}, MAX_MOOD_DAYS);
  return withHealthGroup(health, 'moods', moodsSchema.parse({...current, days}), false);
}
