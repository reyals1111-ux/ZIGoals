import {healthSchema} from '../health';
import {dailyData, healthZone} from '../health-daily';
import {napOrNight, saveNight} from '../sleep/engine';
import {emptySleep} from '../sleep/schema';
import {healthGroupIn, withHealthGroup} from '../vault/w-homes';
import {instantAt} from '../zone-time';
import {quickAddDays, QUICK_ADD_WAKE, type QuickAddStores, type QuickAddWrite} from './save';
import {addLocalDays} from '../local-date';
import type {QuickAddKnown} from './types';

/**
 * Quick add's "slept 7h30" as a night in Health → Sleep (Session W Part 9). Its own module, loaded only when such a
 * line is saved, so the Sleep code stays out of every page's shared scripts. The person says when they woke up; the
 * night ends then on the day the line names and starts that long before; time to fall asleep and time awake stay
 * unknown, so Sleep marks it estimated; a night that overlaps one already logged, or ends in the future, is refused.
 */
export function applyQuickAddSleep(result: Extract<QuickAddKnown, {kind: 'sleep'}>, stores: QuickAddStores, now: Date): QuickAddWrite {
  if (!result.wake || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(result.wake)) throw Error(QUICK_ADD_WAKE);
  const days = quickAddDays(stores, now), healthDate = result.day === 'yesterday' ? addLocalDays(days.health, -1) : days.health;
  const zone = healthZone(dailyData(stores.health).preferences.timezone), end = instantAt(healthDate, result.wake, zone), start = end - Math.round(result.minutes) * 60_000;
  const sleep = saveNight(healthGroupIn(stores.health, 'sleep') ?? emptySleep(), {kind: napOrNight(start, end, zone), start, end, timeZone: zone}, now);
  return {health: healthSchema.parse(withHealthGroup(stores.health, 'sleep', sleep, false))};
}
