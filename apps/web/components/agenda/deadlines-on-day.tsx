'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASKS} from '../../lib/tasks/schema';
import {deadlinesOn} from '../../lib/agenda/deadlines';
import {formatDate} from '../../lib/visual-format';

/**
 * Session AV lane 2 (minors, q1 #15 check 8; Things counts a deadline down on its day): the tasks whose deadline is this
 * Agenda day while they are planned for another day, as Tasks → Upcoming shows them, each opening its task. Read from the
 * tasks record (zigoals:tasks:v1); nothing is stored and nothing shows on a day without one. Part of the days' chunk.
 */
export function DeadlinesOnDay({date, today}: {date: string; today: string}) {
  const record = useDeviceRecord(TASKS);
  const items = useMemo(() => !record.loaded || record.unreadable ? [] : deadlinesOn(record.data, date), [record.loaded, record.unreadable, record.data, date]);
  if (!items.length) return null;
  return <ul className="agenda-deadlines" aria-label="Deadlines on this day">{items.map(t => <li key={t.id} className="agenda-deadline" data-passed={date < today || undefined}>
    <span className="agenda-deadline-mark" aria-hidden="true">⚑</span>
    <span><Link prefetch={false} className="text-link" href={`/app/tasks#task-${t.id}`}>{t.title}</Link> <small>Deadline {date === today ? 'today' : date < today ? 'passed' : `· planned ${t.due ? formatDate(t.due, {weekday: true, year: t.due.slice(0, 4) !== today.slice(0, 4)}) : 'with no day'}`}</small></span>
  </li>)}</ul>;
}
