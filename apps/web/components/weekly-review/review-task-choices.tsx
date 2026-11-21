'use client';
import {useRef, useState} from 'react';
import Link from 'next/link';
import {reviewTaskChoices} from '../../lib/tasks/review';
import {letTaskGo, moveTaskDue, putTaskBack} from '../../lib/wrap-up-tasks/move';
import type {Task, Tasks} from '../../lib/tasks/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import {useGoalOptions} from '../tasks/use-goal-options';

/**
 * Session AV (1c, q1 #12, fresh-agent review; Sunsama's weekly planning): the review's Tasks step lists the tasks still
 * open from this week or before, each with "Plan for Monday" (its day moves to the Monday after the week) or "Let go" (it
 * stays in Tasks without a day, as the evening wrap-up does). Each change is written at once and has Undo on its row; the
 * row stays, so focus never falls to the page.
 */
export function ReviewTaskChoices({record, monday, update}: {record: Tasks; monday: string; update: (change: (r: Tasks) => Tasks) => unknown}) {
  const [done, setDone] = useState<Record<string, {words: string; before: Task}>>({}), [error, setError] = useState('');
  // Focus follows the change: to the row's Undo after a change, back to its Plan button after Undo.
  const focusUndo = useRef<string | null>(null), list = useRef<HTMLUListElement>(null);
  // The list as the step opened, so a planned or let-go row keeps its place (with its Undo); a task gone since drops out.
  const [first] = useState(() => reviewTaskChoices(record, monday)), {more} = first;
  const shown = first.items.filter(t => done[t.id] || record.tasks.some(x => x.id === t.id && !x.doneAt));
  if (!shown.length) return null;
  const when = formatDate(monday, {weekday: true, year: false});
  const act = (t: Task, how: 'plan' | 'go') => {
    try { update(r => how === 'plan' ? moveTaskDue(r, t.id, monday) : letTaskGo(r, t.id)); setDone(d => ({...d, [t.id]: {words: how === 'plan' ? `Planned for ${when}.` : 'Let go for now: it stays in Tasks, without a day.', before: t}})); focusUndo.current = t.id; setError(''); }
    catch (cause) { setError(plainErrorMessage(cause, 'That task could not be changed on this device.')); }
  };
  const undo = (t: Task) => {
    try { update(r => putTaskBack(r, done[t.id]!.before)); setDone(d => { const next = {...d}; delete next[t.id]; return next; }); requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`li[data-id="${CSS.escape(t.id)}"] button`)?.focus()); }
    catch (cause) { setError(plainErrorMessage(cause, 'That could not be undone on this device.')); }
  };
  return <div className="review-task-choices">
    <p>Still open from this week or before: plan each for {when}, or let it go.</p>
    <ul ref={list} aria-label="Open tasks to plan or let go">{shown.map(t => { const d = done[t.id]; return <li key={t.id} data-id={t.id}>
      <span className="review-task-title"><span dir="auto">{t.title}</span>{t.due ? <small> · {formatDate(t.due, {weekday: true, year: false})}</small> : null}</span>
      {d ? <span className="review-task-actions"><span role="status">{d.words}</span><button type="button" className="text-link" aria-label={`Undo for “${t.title}”`} ref={el => { if (el && focusUndo.current === t.id) { focusUndo.current = null; el.focus(); } }} onClick={() => undo(t)}>Undo</button></span>
        : <span className="review-task-actions"><button type="button" className="secondary" aria-label={`Plan for ${when}: “${t.title}”`} onClick={() => act(t, 'plan')}>Plan for {formatDate(monday, {weekday: true, year: false}).split(',')[0]}</button><button type="button" className="quiet" aria-label={`Let go: “${t.title}”`} onClick={() => act(t, 'go')}>Let go</button></span>}
    </li>; })}</ul>
    {more > 0 && <p className="fine">{formatNumber(more)} more in <Link prefetch={false} className="text-link" href="/app/tasks?view=overdue">Tasks</Link>.</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
/**
 * Session AV (1c, q1 #12): the review ends in a goal too, if the person likes — the intention, added as a task, can be a
 * next action of one of their open goals (it then shows on that goal's page).
 */
export function IntentionGoal({value, onChange, disabled}: {value: string; onChange: (key: string) => void; disabled?: boolean}) {
  const goals = useGoalOptions();
  if (!goals.open.length) return null;
  return <label className="field weekly-review-goal"><span>For a goal (optional)</span><select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}><option value="">No goal</option>{goals.open.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}</select></label>;
}
export default ReviewTaskChoices;
