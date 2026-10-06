import {localDate} from '../../local-date';
import type {Platform} from '../../positions';
import {localClock} from '../../reminders/due';
import type {ZigiReminders} from '../store/records';

/**
 * ZIGi's own reminders that are due now (Session V Part 13): the weekly goal check-ins, the weekly look at Wealth and
 * the weekly context-pack refresh, kept on this device in `zigoals:zigi-reminders:v1` (T's `zigoals:reminders:v1` keeps
 * the habit and water ones). Like T's reminders they follow this device's clock: due once the weekday's time has
 * passed, until the person dismisses it for the day. Nothing here is synced or sent.
 */
export type ZigiDue = {id: string; kind: 'goal' | 'wealth' | 'pack'; title: string; time: string; day: string; href: string};
export type GoalRef = {title: string; href: string};
export const WEALTH_LOOK = 'wealth-look', PACK_REFRESH = 'pack-refresh';
export const goalReminderId = (key: string) => `goal:${key}`;
const KEEP_DAYS = 14;
type Weekly = {weekday: number; time: string} | null | undefined;
export function zigiDue({reminders, goal, now}: {reminders: ZigiReminders; goal: (key: string) => GoalRef | null; now: Date}): ZigiDue[] {
  const day = localDate(now), weekday = now.getDay(), clock = localClock(now), dismissed = new Set(reminders.dismissed?.[day] ?? []), due: ZigiDue[] = [];
  const on = (when: Weekly): when is {weekday: number; time: string} => !!when && when.weekday === weekday && when.time <= clock;
  for (const [key, when] of Object.entries(reminders.goalCheckIns ?? {})) {
    const id = goalReminderId(key), found = goal(key);
    if (found && on(when) && !dismissed.has(id)) due.push({id, kind: 'goal', title: found.title, time: when.time, day, href: found.href});
  }
  const wealth = reminders.wealthLook, pack = reminders.packRefresh;
  if (on(wealth) && !dismissed.has(WEALTH_LOOK)) due.push({id: WEALTH_LOOK, kind: 'wealth', title: 'A look at Wealth', time: wealth.time, day, href: '/app/wealth'});
  if (on(pack) && !dismissed.has(PACK_REFRESH)) due.push({id: PACK_REFRESH, kind: 'pack', title: 'A new context pack', time: pack.time, day, href: '/app/settings#zigi-pack'});
  return due.sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
}
/** "Not today" for one of ZIGi's reminders: its id under today's date; only the last two weeks of dates are kept. */
export function dismissZigiReminder(reminders: ZigiReminders, id: string, day: string): ZigiReminders {
  const today = [...new Set([...(reminders.dismissed?.[day] ?? []), id])];
  const kept = Object.entries(reminders.dismissed ?? {}).filter(([d]) => d !== day).sort(([a], [b]) => b.localeCompare(a)).slice(0, KEEP_DAYS - 1);
  return {...reminders, dismissed: Object.fromEntries([[day, today], ...kept])};
}
/**
 * The goal a check-in reminder names, by the key the Goals summaries give it (`private:<id>` for a tracked goal,
 * `legacy:<id>` for a local simulation goal); a closed or deleted goal has no reminder any more.
 */
export function goalRefs(platform: Pick<Platform, 'goals'> | null, legacyNames: Readonly<Record<string, string>> = {}): (key: string) => GoalRef | null {
  return key => {
    if (key.startsWith('private:')) {
      const id = key.slice('private:'.length), found = platform?.goals.find(g => g.id === id);
      return found && found.status !== 'closed' ? {title: found.name, href: `/app/goals/tracked/${id}`} : null;
    }
    if (key.startsWith('legacy:')) { const id = key.slice('legacy:'.length), name = legacyNames[id]; return name ? {title: name, href: `/app/goals/${id}`} : null; }
    return null;
  };
}
