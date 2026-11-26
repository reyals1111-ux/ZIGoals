'use client';
import {useId, useState} from 'react';
import type {useTaskList} from './use-task-list';
import {editTask, removeTask} from '../../lib/tasks/engine';
import {movedMost, movedWords} from '../../lib/tasks/moved';
import {LONG_OPEN_DAYS, daysUnchanged, giveDay, keepOpen, longOpen, openForWords, removeLongOpen, type LongOpenDays} from '../../lib/tasks/long-open';
import {addLocalDays} from '../../lib/local-date';
import {formatDate, formatNumber} from '../../lib/visual-format';
import type {Task} from '../../lib/tasks/schema';
import './tasks-aw-x2.css';

/**
 * Session AW (X2; Amazing Marvin), Tasks → Review below the projects' review, its own chunk:
 * - "Moved most" (LEDGER #433): open tasks whose day was put off twice or more, the most first, said as a count ("Moved 4
 *   times"), with the review's own choices — a day, no day for now, remove;
 * - "Open a long time" (LEDGER #434): open one-off tasks unchanged for 60 days or more (or 90), the longest first, with Keep
 *   first (asked again after the same days), Give it a day and Remove.
 * Each choice is one change with its Undo (the toast); nothing is red, nothing is a warning, and an empty list says what
 * would show here. The row stays where it is until the list is drawn again, so focus never falls to the page.
 */
type List = ReturnType<typeof useTaskList>;
const dayWords = (d: string, today: string) => formatDate(d, {weekday: true, year: d.slice(0, 4) !== today.slice(0, 4)});
export default function ReviewExtras({list, onOpen}: {list: List; onOpen: (task: Task) => void}) {
  const id = useId(), {today} = list, record = list.tasks.data;
  const [days, setDays] = useState<LongOpenDays>(60), [when, setWhen] = useState<Record<string, string>>({});
  const moved = movedMost(record), long = longOpen(record, today, days, list.doneDay);
  const focusHeading = (which: 'moved' | 'long') => requestAnimationFrame(() => document.getElementById(`${id}-${which}`)?.focus());
  const plan = (t: Task, which: 'moved' | 'long') => {
    const d = when[t.id] ?? '';
    if (!d) return;
    const ok = list.change(r => which === 'long' ? giveDay(r, t.id, d, today) : editTask(r, t.id, {due: d}, today), `“${t.title}” is planned for ${dayWords(d, today)}.`, 'It is back as it was.');
    if (ok) { setWhen(w => { const n = {...w}; delete n[t.id]; return n; }); if (which === 'long') focusHeading(which); }
  };
  const dayPick = (t: Task, which: 'moved' | 'long') => <span className="tasks-x2-actions">
    <label className="field"><span>Give it a day</span><input type="date" min={today} value={when[t.id] ?? ''} aria-label={`A day for “${t.title}”`} onChange={e => setWhen(w => ({...w, [t.id]: e.target.value}))} /></label>
    <button type="button" className="secondary" disabled={!when[t.id]} aria-label={`Plan “${t.title}” for that day`} onClick={() => plan(t, which)}>Plan it</button>
  </span>;
  return <section className="tasks-x2-review" aria-label="Tasks to look at again">
    <h3 id={`${id}-moved`} tabIndex={-1}>Moved most <small>{moved.items.length ? formatNumber(moved.items.length + moved.more) : 'none'}</small></h3>
    {!moved.items.length ? <p className="fine">Tasks whose day you put off twice or more show here, with how often (“Moved 3 times”), so you can choose again: a day that fits, no day for now, or let it go. Moving a task is never counted against you.</p>
      : <><p className="fine">Each one is a choice, not a mark against you: give it a day that fits, let it wait without a day, or remove it.</p>
        <ul className="tasks-x2-list" aria-label="Tasks moved most">{moved.items.map(t => <li key={t.id}>
          <span className="tasks-x2-what"><button type="button" className="text-link" dir="auto" onClick={() => onOpen(t)}>{t.title}</button><small>{movedWords(t.moved)}{t.due ? ` · now ${dayWords(t.due, today)}` : ''}</small></span>
          {dayPick(t, 'moved')}
          <span className="tasks-x2-actions">
            {!t.recur && t.due && <button type="button" className="quiet" aria-label={`No day for now: “${t.title}”`} onClick={() => { if (list.change(r => editTask(r, t.id, {due: null, time: null}, today, {allowPast: true}), `“${t.title}” waits without a day.`, 'It has its day again.')) focusHeading('moved'); }}>No day for now</button>}
            <button type="button" className="quiet" aria-label={`Remove “${t.title}”`} onClick={() => { if (list.change(r => removeTask(r, t.id), `Removed “${t.title}”.`, 'The task is back.')) focusHeading('moved'); }}>Remove</button>
          </span>
        </li>)}</ul>
        {moved.more > 0 && <p className="fine">and {formatNumber(moved.more)} more (filter: is:moved).</p>}</>}
    <h3 id={`${id}-long`} tabIndex={-1}>Open a long time <small>{long.all ? formatNumber(long.all) : 'none'}</small></h3>
    <label className="field tasks-x2-days"><span>Unchanged for at least</span><select value={days} onChange={e => setDays(Number(e.target.value) as LongOpenDays)}>{LONG_OPEN_DAYS.map(n => <option key={n} value={n}>{n} days</option>)}</select></label>
    {!long.items.length ? <p className="fine">Tasks you have not changed for {days} days or more show here, oldest first: keep them (asked again in {days} days), give one a day, or remove it.</p>
      : <><ul className="tasks-x2-list" aria-label={`Tasks unchanged for ${days} days or more`}>{long.items.map(t => <li key={t.id}>
          <span className="tasks-x2-what"><button type="button" className="text-link" dir="auto" onClick={() => onOpen(t)}>{t.title}</button><small>{openForWords(daysUnchanged(t, today, list.doneDay))}{t.due ? ` · its day ${dayWords(t.due, today)}` : ' · no day'}</small></span>
          <span className="tasks-x2-actions"><button type="button" className="secondary" aria-label={`Keep “${t.title}”`} onClick={() => { if (list.change(r => keepOpen(r, t.id, today), `Kept “${t.title}”. It is asked about again on ${dayWords(addLocalDays(today, days), today)}.`, 'It is as it was.')) focusHeading('long'); }}>Keep</button></span>
          {dayPick(t, 'long')}
          <span className="tasks-x2-actions"><button type="button" className="quiet" aria-label={`Remove “${t.title}”`} onClick={() => { if (list.change(r => removeLongOpen(r, t.id), `Removed “${t.title}”.`, 'The task is back.')) focusHeading('long'); }}>Remove</button></span>
        </li>)}</ul>
        {long.more > 0 && <p className="fine">and {formatNumber(long.more)} more.</p>}</>}
  </section>;
}
