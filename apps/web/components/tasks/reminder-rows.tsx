'use client';
import {useRef, useState, type ReactNode} from 'react';
import {SNOOZE_CHOICES, snoozeReminder, snoozeUntil, type SnoozeChoice} from '../../lib/tasks/reminders';
import {checklistZone} from '../../lib/checklist/zone';
import {formatClock} from '../../lib/visual-format';
import {wallClock} from '../../lib/zone-time';
import type {Task, Tasks} from '../../lib/tasks/schema';

/**
 * Session AV (1c, q1 #1, fresh-agent review; Todoist and TickTick let you pick the snooze length): the reminders that have
 * gone off, each with Done, Snooze (15 min, 1 h or tomorrow morning) and Dismiss — the same rows on Tasks, Today's tasks
 * line and Today's Tasks card. A snooze is kept on the task (`task.snooze`), so it holds across a reload and another tab,
 * and the device's notification plan wakes at its end too. When a row goes, focus moves to the next row's first button
 * (or the one before, or `fallback`), never to the page itself.
 */
export type DueTaskReminder = {task: Task; at: number; key: string; of: number; before: number};
export function ReminderRows({reminders, className, label, line, onDone, onDismiss, change, fallback}: {
  reminders: readonly DueTaskReminder[]; className: string; label: string;
  /** The row's words; the default reads "⏰ Reminder · Call mum at 6:00 PM". */
  line?: (r: DueTaskReminder) => ReactNode;
  onDone: (task: Task) => void; onDismiss: (key: string) => void;
  /** The list's change (lib/tasks via useTaskList), so a snooze is one ordinary write with its Undo. */
  change: (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean;
  /** Where focus goes when the last row goes. */
  fallback?: () => HTMLElement | null;
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
  const snooze = (r: DueTaskReminder, choice: SnoozeChoice) => {
    const zone = checklistZone(), until = snoozeUntil(choice, undefined, zone), when = choice === 'tomorrow' ? `tomorrow at ${formatClock('09:00')}` : `at ${formatClock(wallClock(until, zone).clock)}`;
    moveFocusFrom(r.key);
    if (change(rec => snoozeReminder(rec, r.task.id, r.of, until, r.before), `Snoozed: “${r.task.title}” reminds you again ${when}.`, 'The snooze is taken back.')) setSaid(`Snoozed: “${r.task.title}” reminds you again ${when}.`);
  };
  return <>
    {reminders.length > 0 && <ul ref={ref} className={className} aria-label={label}>{reminders.map(r => <li key={r.key} data-key={r.key}>
      {line ? line(r) : <span><span aria-hidden="true">⏰ </span>Reminder · <span dir="auto">{r.task.title}</span>{r.task.time ? ` at ${formatClock(r.task.time)}` : ''}</span>}
      <span className="task-reminder-actions">
        <button type="button" className="text-link" onClick={() => { moveFocusFrom(r.key); onDone(r.task); }}>Done</button>
        <span className="task-reminder-snooze" role="group" aria-label={`Snooze “${r.task.title}”`}><span aria-hidden="true">Snooze:</span>
          {SNOOZE_CHOICES.map(c => <button key={c.id} type="button" className="text-link" aria-label={`Snooze “${r.task.title}” ${c.words}`} onClick={() => snooze(r, c.id)}>{c.label}</button>)}</span>
        <button type="button" className="text-link" onClick={() => { moveFocusFrom(r.key); onDismiss(r.key); }}>Dismiss</button>
      </span></li>)}</ul>}
    <p className="sr-only" role="status">{said}</p>
  </>;
}
export default ReminderRows;
