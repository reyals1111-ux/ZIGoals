import {localClock} from './due';
import {localDate} from '../local-date';
import {clockSchema} from '../sleep/schema';
import {wRemindersSchema, type WReminders} from './w-schema';

/**
 * The wind-down reminder (Session W Part 4): a time on this device's clock (`zigoals:w-reminders:v1` `windDown`). Once it
 * has passed today, Today shows a card and ZIGi may knock (its own rules and quiet hours apply), until the person goes to
 * bed with "I'm going to bed" or dismisses it for tonight. Nothing is sent anywhere.
 */
export const WIND_DOWN = 'wind-down';
export type WindDownDue = {id: typeof WIND_DOWN; kind: 'wind-down'; title: string; time: string; day: string; href: string};
export function windDownDue({w, running, now}: {w: WReminders; running: boolean; now: Date}): WindDownDue | null {
  if (!w.windDown || running) return null;
  const day = localDate(now);
  if (w.windDown.time > localClock(now) || w.dismissed[WIND_DOWN] === day) return null;
  return {id: WIND_DOWN, kind: 'wind-down', title: 'Wind-down time', time: w.windDown.time, day, href: '/app/health?view=sleep'};
}
/** "Not tonight": the card and the knock stay away for the rest of this day; older dismissals of it are dropped. */
export const dismissWindDown = (w: WReminders, day: string): WReminders => wRemindersSchema.parse({...w, dismissed: {...w.dismissed, [WIND_DOWN]: day}});
/** Sets the time (null turns the reminder off). */
export function setWindDown(w: WReminders, time: string | null): WReminders {
  if (time === null) { const {windDown: _old, ...rest} = w; void _old; return wRemindersSchema.parse(rest); }
  return wRemindersSchema.parse({...w, windDown: {time: clockSchema.parse(time)}});
}
