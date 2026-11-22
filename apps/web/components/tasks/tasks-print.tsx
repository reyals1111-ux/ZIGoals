'use client';
import {useEffect, useMemo} from 'react';
import {createPortal} from 'react-dom';
import {printGroups, type PrintGrouping} from '../../lib/tasks/print-list';
import type {Task, Tasks} from '../../lib/tasks/schema';
import {formatDate} from '../../lib/visual-format';
import './tasks-print.css';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #225; Google Tasks' print): "Print this list". A sheet of the list the view shows —
 * its title, the day it was printed, the groups, tick boxes, days, priorities and subtasks indented — is put on the page for
 * the browser's print (or Save as PDF) and taken away after, as the bills print does (print CSS, nothing sent anywhere).
 * Hidden on screen. Its own chunk.
 */
export const PRINT_CLASS = 'zg-print-tasks';
export default function TasksPrint({title, record, shown, grouping, projectId, today, onDone}: {title: string; record: Tasks; shown: readonly Task[]; grouping: PrintGrouping; projectId?: string; today: string; onDone: () => void}) {
  const groups = useMemo(() => printGroups(record, shown, {grouping, today, projectId}), [record, shown, grouping, today, projectId]);
  useEffect(() => {
    const root = document.documentElement;
    let finished = false;
    const done = () => { if (finished) return; finished = true; root.classList.remove(PRINT_CLASS); window.removeEventListener('afterprint', done); window.clearTimeout(late); onDone(); };
    root.classList.add(PRINT_CLASS);
    window.addEventListener('afterprint', done);
    const late = window.setTimeout(done, 60_000);
    const frame = requestAnimationFrame(() => { try { window.print(); } catch { done(); } });
    return () => { cancelAnimationFrame(frame); if (!finished) { finished = true; root.classList.remove(PRINT_CLASS); window.removeEventListener('afterprint', done); window.clearTimeout(late); } };
  }, [onDone]);
  const count = groups.reduce((n, g) => n + g.rows.filter(r => !r.depth).length, 0);
  return createPortal(<section className="tasks-print-sheet" aria-label={`${title}, as printed`}>
    <h1>{title}</h1>
    <p className="tasks-print-meta">{count} {count === 1 ? 'task' : 'tasks'} · printed {formatDate(today, {weekday: true})} · ZIGoals</p>
    {groups.map((g, i) => <div key={`${g.title}-${i}`} className="tasks-print-group">
      {g.title && <h2>{g.title}</h2>}
      <ul>{g.rows.map(r => <li key={r.task.id} style={{['--print-depth' as string]: r.depth}}>
        <span className="tasks-print-box" aria-hidden="true">{r.task.doneAt ? '☑' : '☐'}</span>
        <span className="tasks-print-title" dir="auto">{r.task.title}</span>
        {r.meta && <span className="tasks-print-what">{r.meta}</span>}
      </li>)}</ul>
    </div>)}
  </section>, document.body);
}
