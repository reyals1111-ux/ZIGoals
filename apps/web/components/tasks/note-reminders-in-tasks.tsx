'use client';
import Link from 'next/link';
import {useEffect, useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {checklistZone} from '../../lib/checklist/zone';
import {addLocalDays} from '../../lib/local-date';
import {NOTES, noteName} from '../../lib/notes/schema';
import {noteHref, noteRemindersBetween, noteRemindersByDay, type ListedNoteReminder} from '../../lib/tasks/note-reminder-days';
import {formatClock, formatDate, formatNumber} from '../../lib/visual-format';
import './tasks-r2.css';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #224; Google Keep reminders in Google Tasks): the reminders written in notes, listed
 * in Tasks → Today (today's), Tasks → Upcoming (the next 14 days, by day) and on the Agenda's day and week, each opening its
 * note. They stay note lines (edit the line in the note to change one). Shows nothing when no note holds one; the Notes
 * page's "Reminders in your notes" teaches the words. Its own chunk.
 */
function useNoteReminders(from: string, to: string, today: string) {
  const notes = useDeviceRecord(NOTES), [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(t); }, []);
  return useMemo(() => notes.loaded && !notes.unreadable ? noteRemindersBetween(notes.data, from, to, today, checklistZone(), now) : [], [notes.loaded, notes.unreadable, notes.data, from, to, today, now]);
}
const dayName = (d: string, today: string) => d === today ? 'Today' : d === addLocalDays(today, 1) ? 'Tomorrow' : formatDate(d, {weekday: true, year: d.slice(0, 4) !== today.slice(0, 4)});
function Item({r, withDay, today}: {r: ListedNoteReminder; withDay: boolean; today: string}) {
  return <li data-gone={r.gone || undefined}>
    <span aria-hidden="true">⏰ </span><span>{withDay ? `${dayName(r.day, today)}, ` : ''}{formatClock(r.time)}{r.gone && r.day === today ? ' · gone off' : ''} · <span dir="auto">{r.what}</span></span>
    <Link prefetch={false} className="text-link" href={noteHref(r.note.id)}>Open the note “{noteName(r.note)}”</Link>
  </li>;
}
/** Tasks → Today (`today`) or Tasks → Upcoming (`upcoming`, the next 14 days). */
export default function NoteRemindersInTasks({kind, today}: {kind: 'today' | 'upcoming'; today: string}) {
  const id = useId(), list = useNoteReminders(today, kind === 'today' ? today : addLocalDays(today, 13), today);
  if (!list.length) return null;
  const days = noteRemindersByDay(list);
  return <section className="tasks-note-reminders" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`}>From your notes <small>{formatNumber(list.length)} {list.length === 1 ? 'reminder' : 'reminders'}</small></h3>
    {kind === 'today' ? <ul className="tasks-note-reminder-list" aria-label="Reminders in your notes today">{list.map(r => <Item key={r.key} r={r} withDay={false} today={today} />)}</ul>
      : days.map(d => <ul key={d.day} className="tasks-note-reminder-list" aria-label={`Reminders in your notes: ${dayName(d.day, today)}`}>{d.items.map(r => <Item key={r.key} r={r} withDay today={today} />)}</ul>)}
    <p className="fine">Written in a note as “@remind …”. They stay in the note: change or delete the line there to change one.</p>
  </section>;
}
/** The Agenda's day or week: the note reminders on its days. */
export function AgendaNoteReminders({from, to, today}: {from: string; to: string; today: string}) {
  const id = useId(), list = useNoteReminders(from, to, today);
  if (!list.length) return null;
  return <section className="tasks-note-reminders agenda-note-reminders" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`}>Reminders in your notes <small>{formatNumber(list.length)}</small></h3>
    <ul className="tasks-note-reminder-list" aria-label="Reminders in your notes on these days">{list.map(r => <Item key={r.key} r={r} withDay={from !== to} today={today} />)}</ul>
  </section>;
}
