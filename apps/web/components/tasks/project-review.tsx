'use client';
import {useId} from 'react';
import type {useTaskList} from './use-task-list';
import {markReviewed, nextReview, projectTasks, projectsToReview} from '../../lib/tasks/project-states';
import {addLocalDays} from '../../lib/local-date';
import {formatDate, formatNumber} from '../../lib/visual-format';
import './tasks-r6.css';

/**
 * Session AV lane 2 (r6-plan, LEDGER #395; OmniFocus's Review), Tasks → Review, its own chunk: the projects whose review has
 * come round (each project's own interval, set under its tools), the longest waiting first, each with its open tasks, the
 * ones waiting (their turn, or another task) and the ones on hold, then "Reviewed", which sets the next turn. Projects not yet
 * due are listed below with their day. Nothing is changed but the review day.
 */
type List = ReturnType<typeof useTaskList>;
const day = (d: string) => formatDate(d, {weekday: true, year: false});
const SHOWN = 8;
export default function ProjectReview({list, onOpen}: {list: List; onOpen: (projectId: string) => void}) {
  const id = useId(), {today} = list, record = list.tasks.data;
  const due = projectsToReview(record, today), later = (record.projects ?? []).filter(p => !p.archived && p.review && !due.includes(p)).sort((a, b) => nextReview(a, today)!.localeCompare(nextReview(b, today)!));
  const reviewed = (projectId: string, name: string, every: number) => {
    if (!list.change(r => markReviewed(r, projectId, today), `Reviewed “${name}”. Next turn on ${day(addLocalDays(today, 7 * every))}.`, 'The review is as it was.')) return;
    // The project leaves the list: focus goes to the view's heading, never to the page.
    requestAnimationFrame(() => document.getElementById(`${id}-t`)?.focus());
  };
  return <section className="tasks-plan-view tasks-r6-review" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`} tabIndex={-1}>Projects to review <small>{due.length ? formatNumber(due.length) : 'none now'}</small></h3>
    {!due.length && <p className="fine">{later.length ? 'No project’s turn has come. Each comes back here on its day.' : 'No project is reviewed yet. Open a project, choose “Hold, order and review” and set “Review it every”: when its turn comes it is listed here with its open, waiting and on-hold tasks.'}</p>}
    {due.length > 0 && <ul className="tasks-r6-review-list" aria-label="Projects whose turn has come">{due.map(p => {
      const t = projectTasks(record, p.id, today), list_ = (items: {title: string; extra?: string}[], label: string) => items.length ? <><h5>{label} <small>{formatNumber(items.length)}</small></h5><ul aria-label={`${label}, ${p.name}`}>{items.slice(0, SHOWN).map((x, i) => <li key={i}><span dir="auto">{x.title}</span>{x.extra ? <small> · {x.extra}</small> : null}</li>)}{items.length > SHOWN && <li><small>and {formatNumber(items.length - SHOWN)} more</small></li>}</ul></> : null;
      return <li key={p.id} className="tasks-r6-review-item">
        <h4 dir="auto">{p.name}</h4>
        <p className="fine">Every {p.review!.every === 1 ? 'week' : `${p.review!.every} weeks`}{p.review!.last ? ` · last reviewed ${day(p.review!.last)}` : ''}</p>
        {list_(t.open.map(x => ({title: x.title, extra: x.due ? day(x.due) : undefined})), 'Open')}
        {list_(t.waiting.map(x => ({title: x.task.title, extra: `after “${x.on}”`})), 'Waiting')}
        {list_(t.held.map(x => ({title: x.title})), 'On hold')}
        {!t.open.length && !t.waiting.length && !t.held.length && <p className="fine">No open task. Add the next step, or archive the project if it is finished.</p>}
        <p className="tasks-r6-actions"><button type="button" className="secondary" onClick={() => reviewed(p.id, p.name, p.review!.every)}>Reviewed</button><button type="button" className="text-link" onClick={() => onOpen(p.id)}>Open “{p.name}”</button></p>
      </li>;
    })}</ul>}
    {later.length > 0 && <><h4>Coming up</h4><ul className="tasks-r6-later" aria-label="Projects reviewed later">{later.map(p => <li key={p.id}><span dir="auto">{p.name}</span> <small>· {day(nextReview(p, today)!)}</small></li>)}</ul></>}
  </section>;
}
