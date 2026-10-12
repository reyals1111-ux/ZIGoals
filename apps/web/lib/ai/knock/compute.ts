import type {KnockCandidate} from './rules';
import {dismissZigiReminder, goalRefs, zigiDue} from './due';
import {dueReminders, localClock} from '../../reminders/due';
import {dismissForToday} from '../../reminders/store';
import {dismissWindDown, windDownDue} from '../../reminders/wind-down';
import {dismissMeditationTime, meditationDue} from '../../reminders/meditation-time';
import {chainedDue, dismissChained} from '../../habits-v2/stacks';
import {contributionDue, dismissContribution} from '../../reminders/contribution-due';
import {habitCalendarDay, type HabitData} from '../../habits';
import {sessionDay} from '../../meditation/stats';
import {healthGroupIn} from '../../vault/w-homes';
import {localDate} from '../../local-date';
import type {HealthData} from '../../health';

/**
 * Session AA-Local Gate A (ADR-022 B41): what ZIGi may knock about, and how a knock is dismissed, in a chunk the knock
 * loads after the shell is on screen (`components/zigi/knock.tsx`). The rules are Sessions W's, moved verbatim: the
 * habit and water reminders, ZIGi's own reminders with goal names, the wind-down time until a night runs, the meditation
 * time until a session is logged or runs, a stack's chained reminder, a contribution plan's due day.
 */
type Due = Parameters<typeof dueReminders>[0];
export type KnockInputs = {
  reminders: Due['reminders']; habits: HabitData; health: HealthData;
  /** The W reminders record, or null while it is unreadable. */
  w: Parameters<typeof windDownDue>[0]['w'] | null;
  meditationRunning: boolean; platform: Parameters<typeof contributionDue>[1];
  zigiReminders: Parameters<typeof zigiDue>[0]['reminders']; legacyNames: Record<string, string>; now: Date;
};
export function knockCandidates({reminders, habits, health, w, meditationRunning, platform, zigiReminders, legacyNames, now}: KnockInputs): KnockCandidate[] {
  let base: KnockCandidate[] = [];
  try { base = dueReminders({reminders, habits, health, now}); } catch { base = []; }
  // Session W Part 4: the wind-down time, until a night is running.
  const running = (healthGroupIn(health, 'sleep')?.nights ?? []).some(n => n.end === null), windDown = w === null ? null : windDownDue({w, running, now});
  // Session W Part 5: the meditation time, until a session is logged today or one runs.
  const doneToday = (healthGroupIn(health, 'meditation')?.sessions ?? []).some(s => sessionDay(s) === localDate(now)), meditation = w === null ? null : meditationDue({w, doneToday, running: meditationRunning, now});
  // Session W Part 10: a stack's chained reminder, once the habit before it is done today.
  let chained: KnockCandidate[] = [];
  try { chained = w === null ? [] : chainedDue(w, habits, habitCalendarDay(habits, now), localClock(now)); } catch { chained = []; }
  // Session W Part 12: a contribution plan's reminder on a day an amount is due.
  try { if (w !== null) chained = [...chained, ...contributionDue(w, platform, now)]; } catch { /* the other reminders still knock */ }
  return [...base, ...zigiDue({reminders: zigiReminders, goal: goalRefs(platform, legacyNames), now}), ...(windDown ? [windDown] : []), ...(meditation ? [meditation] : []), ...chained].sort((a, b) => a.time.localeCompare(b.time));
}
type R = Parameters<typeof dismissForToday>[0];
type W = Parameters<typeof dismissWindDown>[0];
type Z = Parameters<typeof dismissZigiReminder>[0];
/** "Not today": the dismissal goes to the record the reminder came from (the same writers as before). */
export function dismissCandidate(current: KnockCandidate, stores: {reminders: {update: (day: string, change: (r: R) => R) => unknown}; w: {update: (change: (r: W) => W) => unknown}; zigi: {update: (change: (r: Z) => Z) => unknown}}): void {
  if (current.kind === 'habit' || current.kind === 'water') stores.reminders.update(current.day, r => dismissForToday(r, current.id, current.day));
  else if (current.kind === 'wind-down') stores.w.update(r => dismissWindDown(r, current.day));
  else if (current.kind === 'meditation-time') stores.w.update(r => dismissMeditationTime(r, current.day));
  else if (current.kind === 'stack-next') stores.w.update(r => dismissChained(r, current.id.replace(/^chained:/, ''), current.day));
  else if (current.kind === 'contribution-due') stores.w.update(r => dismissContribution(r, current.id.replace(/^contribution:/, ''), current.day));
  else stores.zigi.update(r => dismissZigiReminder(r, current.id, current.day));
}
