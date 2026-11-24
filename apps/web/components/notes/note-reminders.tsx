'use client';
import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {checklistZone} from '../../lib/checklist/zone';
import {localDate} from '../../lib/local-date';
import {noteReminders, remindersInNote} from '../../lib/notes/reminders';
import {noteName, type Note, type Notes} from '../../lib/notes/schema';
import {formatClock, formatDate} from '../../lib/visual-format';

/**
 * Session AV lane 2 (tasks, LEDGER #31; Notion's "@remind"): the reminders written inside notes. Under a note (read mode),
 * each one it holds as "⏰ Reminder · Tue 24 Nov, 9:00 · call the plumber"; on the Notes page, the ones still ahead or gone
 * off today, each opening its note, with a line that teaches the words when there are none. They reach the device's
 * notifications with the task reminders (lib/notify/sync.ts) when those are on. Its own chunk. Each line keeps the day it
 * was written (review b1 #1, lib/notes/reminder-anchors.ts).
 */
const when = (day: string, time: string, today: string) => `${day === today ? 'Today' : formatDate(day, {weekday: true, year: day.slice(0, 4) !== today.slice(0, 4)})}, ${formatClock(time)}`;
export default function NoteReminderChips({note}: {note: Note}) {
  const today = localDate(), list = useMemo(() => remindersInNote(note, today, checklistZone()), [note, today]);
  if (!list.length) return null;
  return <ul className="note-reminders" aria-label="Reminders in this note">{list.map(r => <li key={r.key}><span aria-hidden="true">⏰ </span>Reminder · {when(r.day, r.time, today)} · <span dir="auto">{r.what}</span></li>)}</ul>;
}
export function NotesRemindersPanel({record}: {record: Notes}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 60_000); return () => window.clearInterval(t); }, []);
  const today = localDate(), list = useMemo(() => noteReminders(record, today, checklistZone(), now), [record, today, now]);
  return <details className="note-reminders-panel" open={list.some(r => r.at <= now) || undefined}>
    <summary>Reminders in your notes{list.length ? ` (${list.length})` : ''}</summary>
    {list.length ? <ul className="note-reminders" aria-label="Reminders in your notes">{list.map(r => <li key={r.key} data-due={r.at <= now || undefined}>
      <span aria-hidden="true">⏰ </span>{r.at <= now ? 'Now · ' : ''}{when(r.day, r.time, today)} · <span dir="auto">{r.what}</span> · <Link prefetch={false} className="text-link" href={`/app/notes?note=${encodeURIComponent(r.note.id)}`}>Open “{noteName(r.note)}”</Link>
    </li>)}</ul> : <p className="fine">Write “@remind tomorrow 9:00 call the plumber” (or “⏰ friday 18:00”) on a line of any note, and it reminds you then. A day alone is 9:00; “tomorrow” is the day after you write it, and it stays that day. Change or delete the line to change the reminder.</p>}
  </details>;
}
