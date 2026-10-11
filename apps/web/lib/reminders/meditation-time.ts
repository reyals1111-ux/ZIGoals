import {localClock} from './due';
import {localDate} from '../local-date';
import {clockSchema} from '../sleep/schema';
import {wRemindersSchema, type WReminders} from './w-schema';

/**
 * The meditation reminder (Session W Part 5): a time on this device's clock (`zigoals:w-reminders:v1` `meditation`). Once
 * it has passed today, Today shows a card and ZIGi may knock (its own rules and quiet hours apply), until a session is
 * logged for the day, one is running, or the person dismisses it for today. Nothing is sent anywhere.
 */
export const MEDITATION_TIME = 'meditation-time';
export type MeditationDue = {id: typeof MEDITATION_TIME; kind: 'meditation-time'; title: string; time: string; day: string; href: string};
export function meditationDue({w, doneToday, running, now}: {w: WReminders; doneToday: boolean; running: boolean; now: Date}): MeditationDue | null {
  if (!w.meditation || doneToday || running) return null;
  const day = localDate(now);
  if (w.meditation.time > localClock(now) || w.dismissed[MEDITATION_TIME] === day) return null;
  return {id: MEDITATION_TIME, kind: 'meditation-time', title: 'Time to meditate', time: w.meditation.time, day, href: '/app/health?view=meditation'};
}
export const dismissMeditationTime = (w: WReminders, day: string): WReminders => wRemindersSchema.parse({...w, dismissed: {...w.dismissed, [MEDITATION_TIME]: day}});
/** Sets the time (null turns the reminder off). */
export function setMeditationTime(w: WReminders, time: string | null): WReminders {
  if (time === null) { const {meditation: _old, ...rest} = w; void _old; return wRemindersSchema.parse(rest); }
  return wRemindersSchema.parse({...w, meditation: {time: clockSchema.parse(time)}});
}
