'use client';
import type {ReactNode} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOTIFY_PREFS} from '../../lib/notify/prefs';
import {ownSnoozeUntil, ownSnoozes, snoozeKey, snoozeLabel, snoozeWords, type OwnSnooze} from '../../lib/tasks/snooze-choices';
import {checklistZone} from '../../lib/checklist/zone';
import {formatClock, formatWeekdayLong} from '../../lib/visual-format';
import {wallClock} from '../../lib/zone-time';

/** Session AW (X1, LEDGER #439): when an own snooze chosen now ends, and those words ("at 7:00 PM", "tomorrow at 8:00 AM"). */
function ownSnoozeNow(choice: OwnSnooze): {until: number; when: string} {
  const zone = checklistZone(), now = Date.now(), until = ownSnoozeUntil(choice, now, zone), then = wallClock(until, zone), day = wallClock(now, zone).date;
  const tomorrow = wallClock(now + 86_400_000, zone).date, clock = formatClock(then.clock);
  return {until, when: then.date === day ? `at ${clock}` : then.date === tomorrow ? `tomorrow at ${clock}` : `on ${formatWeekdayLong(until, {timeZone: zone})} at ${clock}`};
}
/**
 * Session AW (X1, LEDGER #439): a reminder row's own snooze buttons (Tasks → This week → Reminders), moved out of
 * components/tasks/reminder-rows.tsx unchanged (Session AW Part 2, speed): the kept choices this build can read, or the
 * usual three (`usual`) when none can be. The row asks for this part only when the record may hold some
 * (lib/notify/snoozes-hint.ts); the record itself is read here through its own schema.
 */
export default function OwnSnoozeButtons({title, usual, onSnooze}: {title: string; usual: ReactNode; onSnooze: (until: number, when: string) => void}) {
  const own = ownSnoozes(useDeviceRecord(NOTIFY_PREFS).data.snoozes);
  if (!own) return <>{usual}</>;
  return <>{own.map(c => <button key={snoozeKey(c)} type="button" className="text-link" aria-label={`Snooze “${title}” ${snoozeWords(c)}`} onClick={() => { const {until, when} = ownSnoozeNow(c); onSnooze(until, when); }}>{snoozeLabel(c)}</button>)}</>;
}
