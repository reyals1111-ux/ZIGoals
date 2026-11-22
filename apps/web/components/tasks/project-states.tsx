'use client';
import {useId, useState} from 'react';
import type {useTaskList} from './use-task-list';
import {projectHeld} from '../../lib/tasks/engine';
import {HOLD_PAST_MESSAGE, REVIEW_CHOICES, holdProject, markReviewed, nextInOrder, nextReview, resumeProject, setProjectInOrder, setReview} from '../../lib/tasks/project-states';
import {addLocalDays} from '../../lib/local-date';
import type {Project} from '../../lib/tasks/schema';
import {formatDate} from '../../lib/visual-format';
import './tasks-r6.css';

/**
 * Session AV lane 2 (r6-plan; OmniFocus's project types, On Hold and Review), under a project's tools, its own chunk:
 * - one quiet line per state: "On hold until Mon, Dec 7", "In order · next: “Book the venue”", "Review every 2 weeks · next
 *   on Sat, Dec 5" (each with its one tap: Resume now, Reviewed);
 * - "Hold, order and review" opens the choices: put on hold (an optional day to resume; its tasks leave Today, Upcoming, the
 *   matrix, the plans and the reminders, and come back by themselves on that day), do the tasks in order (only the first open
 *   one is in Today, Upcoming, the matrix and the plans; the next comes forward when it is done), review every few weeks.
 * Each change is one write with Undo; a task is never changed.
 */
type List = ReturnType<typeof useTaskList>;
const day = (d: string) => formatDate(d, {weekday: true, year: false});
export default function ProjectStates({list, project}: {list: List; project: Project}) {
  const id = useId(), {today} = list, record = list.tasks.data;
  const [open, setOpen] = useState(false), [until, setUntil] = useState(''), [error, setError] = useState('');
  // Review B6M-5: after each action focus moves to a control that is there afterwards, never to the page.
  const focusOn = (...ids: string[]) => requestAnimationFrame(() => { for (const x of ids) { const el = document.getElementById(x); if (el) { el.focus(); return; } } });
  const held = projectHeld(project, today), next = project.inOrder ? nextInOrder(record, project.id) : null, turn = nextReview(project, today);
  const hold = () => {
    if (until && until <= today) { setError(HOLD_PAST_MESSAGE); return; }
    setError('');
    if (list.change(r => holdProject(r, project.id, today, until || null), `“${project.name}” is on hold${until ? ` until ${day(until)}` : ''}. Its tasks are out of Today, Upcoming, the plans and the reminders${until ? ' until then' : ' until you resume it'}.`, `“${project.name}” is active again.`)) { setUntil(''); focusOn(`${id}-resume`, `${id}-toggle`); }
  };
  const resume = () => { if (list.change(r => resumeProject(r, project.id), `“${project.name}” is active again. Its tasks are back in Today, Upcoming and the reminders.`, `“${project.name}” is on hold again.`)) focusOn(`${id}-hold`, `${id}-toggle`); };
  const lines = [
    held && <p key="hold" className="tasks-r6-line" role="note"><strong>On hold{project.hold?.until ? ` until ${day(project.hold.until)}` : ''}</strong> · its tasks are listed here only, not in Today, Upcoming, the plans or the reminders. <button type="button" className="text-link" onClick={resume}>Resume now</button></p>,
    project.inOrder && <p key="order" className="tasks-r6-line" role="note"><strong>In order</strong> · one task at a time{next ? <>: next is “<span dir="auto">{next.title}</span>”</> : ''}. The others wait their turn.</p>,
    project.review && turn && <p key="review" className="tasks-r6-line" role="note"><strong>Review every {project.review.every === 1 ? 'week' : `${project.review.every} weeks`}</strong> · {turn <= today ? 'its turn has come' : `next on ${day(turn)}`}{project.review.last ? `; last reviewed ${day(project.review.last)}` : ''}. {turn <= today && <button type="button" className="text-link" onClick={() => { if (list.change(r => markReviewed(r, project.id, today), `Reviewed “${project.name}”. Next turn on ${day(addLocalDays(today, 7 * project.review!.every))}.`, 'The review is as it was.')) focusOn(`${id}-toggle`); }}>Reviewed</button>}</p>,
  ].filter(Boolean);
  return <div className="tasks-r6-states">
    {lines}
    <button id={`${id}-toggle`} type="button" className="text-link" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(v => !v)}>Hold, order and review</button>
    {open && <section id={`${id}-panel`} className="tasks-r6-panel" aria-labelledby={`${id}-t`}>
      <h3 id={`${id}-t`} className="sr-only">Hold, order and review for “{project.name}”</h3>
      <fieldset className="tasks-r6-set"><legend>On hold</legend>
        {held ? <p className="fine">On hold since {day(project.hold!.since)}{project.hold?.until ? `, until ${day(project.hold.until)}` : ''}. <button id={`${id}-resume`} type="button" className="secondary" onClick={resume}>Resume now</button></p> : <>
          <p className="fine">Not for now? Its tasks leave Today, Upcoming, the matrix, Plan my day, Plan my week and the reminders, and stay listed here. Choose a day and they come back by themselves.</p>
          <label className="field"><span>Resume on (optional)</span><input type="date" min={addLocalDays(today, 1)} value={until} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-e` : undefined} onChange={e => { setUntil(e.target.value); setError(''); }} /></label>
          <button id={`${id}-hold`} type="button" className="secondary" onClick={hold}>Put on hold</button>
          {error && <small id={`${id}-e`} className="tasks-field-error" role="alert">{error}</small>}</>}
      </fieldset>
      <fieldset className="tasks-r6-set"><legend>In order</legend>
        <label className="tasks-r6-check"><input type="checkbox" checked={!!project.inOrder} onChange={e => list.change(r => setProjectInOrder(r, project.id, e.target.checked), e.target.checked ? `“${project.name}” is in order: one task at a time, from the top.` : `“${project.name}”: every task is available again.`, 'As it was.')} /> <span>Do the tasks one at a time, from the top</span></label>
        <p className="fine">Only the first open task shows in Today, Upcoming, the matrix and the plans; finishing it brings the next forward. A later one can still be ticked done early, as you choose. Change the order by dragging, or with Move up and Move down. A repeating task is always available.</p>
      </fieldset>
      <fieldset className="tasks-r6-set"><legend>Review</legend>
        <label className="field"><span>Review it every</span><select value={project.review?.every ?? ''} onChange={e => { const v = e.target.value ? Number(e.target.value) : null; list.change(r => setReview(r, project.id, v, today), v ? `“${project.name}” comes up for review every ${v === 1 ? 'week' : `${v} weeks`}, in Tasks → Review.` : `“${project.name}” is no longer reviewed.`, 'As it was.'); }}>
          <option value="">Not reviewed</option>{REVIEW_CHOICES.map(n => <option key={n} value={n}>{n === 1 ? '1 week' : `${n} weeks`}</option>)}</select></label>
        <p className="fine">When its turn comes it is listed in Tasks → Review, with its open, waiting and on-hold tasks, and the weekly review says how many projects wait.</p>
      </fieldset>
    </section>}
  </div>;
}
