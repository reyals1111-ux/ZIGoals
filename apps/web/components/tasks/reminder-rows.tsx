'use client';
import Link from 'next/link';
import {useEffect, useRef, useState, type ReactNode} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus} from '../ui/undo-toast';
import {SNOOZE_CHOICES, snoozeReminder, snoozeUntil, type SnoozeChoice} from '../../lib/tasks/reminders';
import {ownSnoozeUntil, ownSnoozes, snoozeKey, snoozeLabel, snoozeWords, type OwnSnooze} from '../../lib/tasks/snooze-choices';
import {NOTIFY_PREFS} from '../../lib/notify/prefs';
import {checklistZone} from '../../lib/checklist/zone';
import {formatClock, formatWeekdayLong} from '../../lib/visual-format';
import {wallClock} from '../../lib/zone-time';
import type {Task, Tasks} from '../../lib/tasks/schema';

/**
 * Session AV (1c, q1 #1, fresh-agent review; Todoist and TickTick let you pick the snooze length): the reminders that have
 * gone off, each with Done, Snooze (15 min, 1 h or tomorrow morning) and Dismiss — the same rows on Tasks, Today's tasks
 * line and Today's Tasks card. A snooze is kept on the task (`task.snooze`), so it holds across a reload and another tab,
 * and the device's notification plan wakes at its end too. When a row goes, focus moves to the next row's first button
 * (or the one before, or `fallback`), never to the page itself.
 */
export type DueTaskReminder = {task: Task; at: number; key: string; of: number; before: number;
  /** Session AW (X1, LEDGER #438): a repeating reminder's latest ring (`round` of `times`) and the next one ahead. */
  round?: number; times?: number; next?: number | null};
/**
 * Session AW (X1, LEDGER #438): the repeats already said in this tab, so a repeat shown by two rows on one page (Today's
 * line and its Tasks card) is said once.
 */
const toldAgain = new Set<string>();
/** Session AW (X1, LEDGER #439): when an own snooze chosen now ends, and those words ("at 7:00 PM", "tomorrow at 8:00 AM"). */
function ownSnoozeNow(choice: OwnSnooze): {until: number; when: string} {
  const zone = checklistZone(), now = Date.now(), until = ownSnoozeUntil(choice, now, zone), then = wallClock(until, zone), day = wallClock(now, zone).date;
  const tomorrow = wallClock(now + 86_400_000, zone).date, clock = formatClock(then.clock);
  return {until, when: then.date === day ? `at ${clock}` : then.date === tomorrow ? `tomorrow at ${clock}` : `on ${formatWeekdayLong(until, {timeZone: zone})} at ${clock}`};
}
export function ReminderRows({reminders, className, label, line, onDone, onDismiss, change, fallback, onFocus}: {
  reminders: readonly DueTaskReminder[]; className: string; label: string;
  /** The row's words; the default reads "⏰ Reminder · Call mum at 6:00 PM". */
  line?: (r: DueTaskReminder) => ReactNode;
  onDone: (task: Task) => void; onDismiss: (key: string) => void;
  /** The list's change (lib/tasks via useTaskList), so a snooze is one ordinary write with its Undo. */
  change: (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean;
  /** Where focus goes when the last row goes. */
  fallback?: () => HTMLElement | null;
  /** Session AV lane 2 (LEDGER #11; TickTick's "Start focus" on a reminder): opens Focus Sessions for the task here; without it the row links to Tasks, which opens them. */
  onFocus?: (task: Task) => void;
}) {
  const ref = useRef<HTMLUListElement>(null), [said, setSaid] = useState('');
  /** Before a row goes: the button focus moves to once it has (the next row's, else the previous row's, else the fallback). */
  const moveFocusFrom = (key: string) => {
    const rows = [...(ref.current?.querySelectorAll<HTMLLIElement>(':scope > li') ?? [])], i = rows.findIndex(li => li.dataset.key === key);
    const next = rows[i + 1]?.dataset.key ?? rows[i - 1]?.dataset.key ?? null;
    requestAnimationFrame(() => {
      const target = next ? ref.current?.querySelector<HTMLButtonElement>(`:scope > li[data-key="${CSS.escape(next)}"] button`) : null;
      (target ?? fallback?.() ?? null)?.focus();
    });
  };
  // Session AW (X1, LEDGER #439): the person's own snooze choices (Tasks → This week → Reminders); the usual three without.
  const prefs = useDeviceRecord(NOTIFY_PREFS), own = ownSnoozes(prefs.data.snoozes);
  // Session AW (X1, LEDGER #438): a reminder that comes back is also said once, politely, wherever the row shows.
  useEffect(() => {
    for (const r of reminders) {
      if (!r.round || toldAgain.has(r.key)) continue;
      toldAgain.add(r.key);
      showStatus(`Reminder again (${r.round} of ${r.times}): “${r.task.title}”. Done or Snooze stops it.`);
    }
  }, [reminders]);
  const snoozeOwn = (r: DueTaskReminder, choice: OwnSnooze) => {
    const {until, when} = ownSnoozeNow(choice);
    moveFocusFrom(r.key);
    if (change(rec => snoozeReminder(rec, r.task.id, r.of, until, r.before), `Snoozed: “${r.task.title}” reminds you again ${when}.`, 'The snooze is taken back.')) setSaid(`Snoozed: “${r.task.title}” reminds you again ${when}.`);
  };
  const snooze = (r: DueTaskReminder, choice: SnoozeChoice) => {
    const zone = checklistZone(), until = snoozeUntil(choice, undefined, zone), when = choice === 'tomorrow' ? `tomorrow at ${formatClock('09:00')}` : `at ${formatClock(wallClock(until, zone).clock)}`;
    moveFocusFrom(r.key);
    if (change(rec => snoozeReminder(rec, r.task.id, r.of, until, r.before), `Snoozed: “${r.task.title}” reminds you again ${when}.`, 'The snooze is taken back.')) setSaid(`Snoozed: “${r.task.title}” reminds you again ${when}.`);
  };
  return <>
    {reminders.length > 0 && <ul ref={ref} className={className} aria-label={label}>{reminders.map(r => <li key={r.key} data-key={r.key}>
      {line ? line(r) : <span><span aria-hidden="true">⏰ </span>Reminder · <span dir="auto">{r.task.title}</span>{r.task.time ? ` at ${formatClock(r.task.time)}` : ''}{r.round ? ` · again, ${r.round} of ${r.times}` : ''}</span>}
      <span className="task-reminder-actions">
        <button type="button" className="text-link" onClick={() => { moveFocusFrom(r.key); onDone(r.task); }}>Done</button>
        {onFocus ? <button type="button" className="text-link" aria-label={`Start focus on “${r.task.title}”`} onClick={() => onFocus(r.task)}>Start focus</button>
          : <Link prefetch={false} className="text-link" aria-label={`Start focus on “${r.task.title}”`} href={`/app/tasks?focus=${encodeURIComponent(r.task.id)}`}>Start focus</Link>}
        <span className="task-reminder-snooze" role="group" aria-label={`Snooze “${r.task.title}”`}><span aria-hidden="true">Snooze:</span>
          {own ? own.map(c => <button key={snoozeKey(c)} type="button" className="text-link" aria-label={`Snooze “${r.task.title}” ${snoozeWords(c)}`} onClick={() => snoozeOwn(r, c)}>{snoozeLabel(c)}</button>)
            : SNOOZE_CHOICES.map(c => <button key={c.id} type="button" className="text-link" aria-label={`Snooze “${r.task.title}” ${c.words}`} onClick={() => snooze(r, c.id)}>{c.label}</button>)}</span>
        <button type="button" className="text-link" onClick={() => { moveFocusFrom(r.key); onDismiss(r.key); }}>Dismiss</button>
      </span></li>)}</ul>}
    {/* Only while there is a reminder or something just said: an empty status beside a card's own one is a second, silent one. */}
    {(reminders.length > 0 || said) && <p className="sr-only" role="status">{said}</p>}
  </>;
}
export default ReminderRows;
