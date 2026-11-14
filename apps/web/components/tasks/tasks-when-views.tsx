'use client';
import {useId, useMemo, useRef, useState, type DragEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TaskRow} from './task-parts';
import type {useTaskList} from './use-task-list';
import type {useGoalOptions} from './use-goal-options';
import {editTask, openTasks} from '../../lib/tasks/engine';
import {LEVEL_WORDS, taskLevel, type Task} from '../../lib/tasks/schema';
import {TASK_WHEN, clearPlace, eveningTasks, placeOf, putInSomeday, putOnEvening, restorePlace, somedayTasks, type TaskWhen} from '../../lib/tasks/when';
import {MATRIX_RULE, QUADRANTS, QUADRANT_WORDS, levelForMove, matrix, partnerOf, quadrantOf, type Quadrant} from '../../lib/tasks/matrix';
import {formatDate, formatNumber} from '../../lib/visual-format';
import './tasks-when.css';

/**
 * Session AP (owner-approved feature list): three views of Tasks in one chunk, loaded when one of them is opened.
 * - "This evening": open tasks put on tonight's list (for today only; tomorrow they are back in their usual place).
 * - "Someday": open tasks with no day that can wait; giving one a day takes it out.
 *   Both live in their own device record, `zigoals:task-when:v1` (lib/tasks/when.ts), never in the task record.
 * - "Priority matrix": the open tasks in four boxes from priority and day (lib/tasks/matrix.ts); moving a card (drag,
 *   or its button: the keyboard way) changes only its priority level, through the task's own edit, with Undo.
 */
type List = ReturnType<typeof useTaskList>;
type Goals = ReturnType<typeof useGoalOptions>;
export default function TasksWhenViews({kind, list, goals, shown}: {kind: 'evening' | 'someday' | 'matrix'; list: List; goals: Goals; shown: Task[]}) {
  if (kind === 'matrix') return <PriorityMatrix list={list} goals={goals} shown={shown} />;
  return <WhenList kind={kind} list={list} goals={goals} />;
}

function WhenList({kind, list, goals}: {kind: 'evening' | 'someday'; list: List; goals: Goals}) {
  const when = useDeviceRecord(TASK_WHEN), {tasks, today, clock} = list, record = tasks.data, id = useId();
  const latest = useRef(record); latest.current = record;
  const [pick, setPick] = useState(''), [dating, setDating] = useState<string | null>(null), [day, setDay] = useState('');
  const evening = kind === 'evening';
  const items = useMemo(() => evening ? eveningTasks(when.data, record, today) : somedayTasks(when.data, record, today), [evening, when.data, record, today]);
  const choices = useMemo(() => openTasks(record, today).filter(t => placeOf(when.data, t, today) !== kind && (evening || !t.due)), [record, today, when.data, kind, evening]);
  if (!when.loaded) return <p className="fine" role="status">Opening…</p>;
  const write = (task: Task, change: (w: TaskWhen) => TaskWhen, message: string) => {
    if (when.unreadable) { showStatus('This device’s “This evening” and “Someday” lists could not be read, so nothing was written over them.', {tone: 'error'}); return false; }
    const before = Object.hasOwn(when.data.tasks, task.id) ? when.data.tasks[task.id] : undefined;
    try { when.update(change); }
    catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); return false; }
    showUndo({message, undone: `“${task.title}” is back where it was.`, restore: () => when.update(w => restorePlace(w, latest.current, today, task.id, before))});
    return true;
  };
  const add = () => {
    const task = record.tasks.find(t => t.id === pick);
    if (!task) return;
    if (write(task, w => evening ? putOnEvening(w, record, today, task.id) : putInSomeday(w, record, today, task.id), evening ? `“${task.title}” is on this evening’s list.` : `“${task.title}” is in Someday.`)) setPick('');
  };
  const giveDay = (task: Task) => {
    if (!day) return;
    if (list.change(r => editTask(r, task.id, {due: day}, today, {allowPast: true}), `“${task.title}” is due ${formatDate(day, {weekday: true, year: day.slice(0, 4) !== today.slice(0, 4)})}: it left Someday.`, `“${task.title}” is back in Someday.`)) { setDating(null); setDay(''); }
  };
  return <section className="tasks-when" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`} className="sr-only">{evening ? 'This evening' : 'Someday'}</h3>
    <p className="tasks-when-lede">{evening
      ? `For tonight, ${formatDate(today, {weekday: true, year: false})}. Their days stay as they are; tomorrow each one is back in its usual place.`
      : 'Things with no day that can wait. Give one a day and it leaves Someday.'}</p>
    {when.unreadable && <p className="notice" role="status">This list could not be read on this device; it is not written over.</p>}
    {items.length ? <ul className="tasks-list" aria-label={evening ? 'This evening' : 'Someday'}>{items.map(t => <TaskRow key={t.id} task={t} today={today} nowClock={clock} record={record}
      goal={t.goal ? goals.byKey.get(t.goal) : undefined} goals={goals.open} onToggle={done => list.toggle(t, done)} onEdit={(patch, scope) => list.edit(t, patch, scope)} editor="inline">
      <div className="tasks-when-actions">
        {!evening && <button type="button" className="text-link" aria-expanded={dating === t.id} aria-label={`Give “${t.title}” a day`} onClick={() => { setDating(dating === t.id ? null : t.id); setDay(today); }}>Give it a day</button>}
        <button type="button" className="text-link" aria-label={evening ? `Take “${t.title}” off this evening` : `Take “${t.title}” out of Someday`} onClick={() => write(t, w => clearPlace(w, record, today, t.id), evening ? `“${t.title}” is off this evening’s list.` : `“${t.title}” left Someday.`)}>{evening ? 'Not this evening' : 'Out of Someday'}</button>
        {dating === t.id && <form className="tasks-when-form" aria-label={`A day for “${t.title}”`} onSubmit={e => { e.preventDefault(); giveDay(t); }}>
          <label className="field"><span>Due</span><input type="date" value={day} onChange={e => setDay(e.target.value)} /></label>
          <button type="submit" className="secondary" disabled={!day}>Set the day</button>
          <button type="button" className="quiet" onClick={() => setDating(null)}>Cancel</button>
        </form>}
      </div>
    </TaskRow>)}</ul> : <p className="fine">{evening ? 'Nothing on this evening’s list yet. Choose a task below.' : 'Nothing in Someday yet. Choose a task with no day below.'}</p>}
    {!when.unreadable && <form className="tasks-when-form" aria-label={evening ? 'Add a task to this evening' : 'Move a task to Someday'} onSubmit={e => { e.preventDefault(); add(); }}>
      <label className="field"><span>{evening ? 'Add to this evening' : 'Move to Someday'}</span>
        <select value={pick} onChange={e => setPick(e.target.value)} aria-describedby={`${id}-note`}>
          <option value="">Choose a task…</option>
          {choices.map(t => <option key={t.id} value={t.id}>{t.title}{t.due ? ` · ${formatDate(t.due, {year: false})}` : ''}</option>)}
        </select></label>
      <button type="submit" className="secondary" disabled={!pick}>{evening ? 'Add' : 'Move'}</button>
      <small id={`${id}-note`} className="tasks-when-note">{evening ? 'Any open task can go on tonight’s list.' : 'Only tasks with no day are offered: a task with a day is already planned.'} {formatNumber(choices.length)} to choose from.</small>
    </form>}
  </section>;
}

const MATRIX_DRAG = 'application/x-zigoals-matrix';
function PriorityMatrix({list, goals, shown}: {list: List; goals: Goals; shown: Task[]}) {
  const {today, clock, tasks} = list, record = tasks.data, id = useId();
  const boxes = useMemo(() => matrix(shown, today), [shown, today]);
  const dragging = useRef<string | null>(null), [over, setOver] = useState<Quadrant | null>(null);
  const move = (task: Task, target: Quadrant) => {
    let level;
    try { level = levelForMove(task, target, today); } catch (e) { showStatus(e instanceof Error ? e.message : 'That box is for another day.', {tone: 'error'}); return; }
    if (level === null) return;
    const was = LEVEL_WORDS[taskLevel(task)];
    list.change(r => editTask(r, task.id, {level}, today, {allowPast: true}), `“${task.title}” moved to “${QUADRANT_WORDS[target].title}”: ${LEVEL_WORDS[level]}.`, `“${task.title}” is back at ${was}.`);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#task-${CSS.escape(task.id)} .tasks-matrix-move`)?.focus());
  };
  const drop = (q: Quadrant) => ({
    onDragOver: (e: DragEvent<HTMLElement>) => { if (dragging.current || e.dataTransfer.types.includes(MATRIX_DRAG)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setOver(q); } },
    onDragLeave: () => setOver(o => o === q ? null : o),
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault(); e.stopPropagation(); setOver(null);
      const from = dragging.current ?? e.dataTransfer.getData(MATRIX_DRAG); dragging.current = null;
      const task = from ? record.tasks.find(t => t.id === from) : undefined;
      if (task) move(task, q);
    },
  });
  return <section className="tasks-matrix-view" aria-labelledby={`${id}-rule`}>
    <p id={`${id}-rule`} className="tasks-when-lede">{MATRIX_RULE}</p>
    <div className="tasks-matrix">{QUADRANTS.map(q => {
      const words = QUADRANT_WORDS[q], items = boxes[q], partner = partnerOf(q);
      return <section key={q} className="tasks-matrix-box" data-quadrant={q} data-drop={over === q || undefined} aria-labelledby={`${id}-${q}`} {...drop(q)}>
        <h3 id={`${id}-${q}`}>{words.title} <small>{formatNumber(items.length)}</small></h3>
        <p className="tasks-matrix-hint">{words.hint}</p>
        {items.length ? <ul className="tasks-list" aria-label={words.title}>{items.map(t => <TaskRow key={t.id} task={t} today={today} nowClock={clock} record={record}
          goal={t.goal ? goals.byKey.get(t.goal) : undefined} goals={goals.open} onToggle={done => list.toggle(t, done)}
          drag={{draggable: true, onDragStart: (e: DragEvent<HTMLElement>) => { e.stopPropagation(); dragging.current = t.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData(MATRIX_DRAG, t.id); e.dataTransfer.setData('text/plain', t.title); }, onDragEnd: () => { dragging.current = null; setOver(null); }}}>
          <div className="tasks-when-actions">
            <button type="button" className="text-link tasks-matrix-move" aria-label={`Move “${t.title}” to “${QUADRANT_WORDS[partner].title}”`} onClick={() => { if (quadrantOf(t, today) === q) move(t, partner); }}>
              {q === 'do' || q === 'plan' ? 'Not important' : 'Important'}
            </button>
          </div>
        </TaskRow>)}</ul> : <p className="fine">Nothing here.</p>}
      </section>;
    })}</div>
    <p className="fine">Drag a card to the box beside it, or use its button. Only the priority changes (to P1, P2 or P3); to make a task urgent or not, change its day.</p>
  </section>;
}
