'use client';
import {useEffect, useId, useMemo, useRef, useState, type ComponentProps, type PointerEvent as ReactPointerEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TaskRow} from './task-parts';
import type {useTaskList} from './use-task-list';
import type {useGoalOptions} from './use-goal-options';
import {editTask, openTasks} from '../../lib/tasks/engine';
import {LEVEL_WORDS, taskLevel, type Task} from '../../lib/tasks/schema';
import {TASK_WHEN, clearPlace, eveningTasks, placeOf, putInSomeday, putOnEvening, restorePlace, somedayTasks, type TaskWhen} from '../../lib/tasks/when';
import {QUADRANTS, QUADRANT_WORDS, levelForMove, matrix, partnerOf, quadrantOf, ruleWords, type Quadrant} from '../../lib/tasks/matrix';
import {MatrixRulesFold, useMatrixRules} from './matrix-rules';
import {formatDate, formatNumber} from '../../lib/visual-format';
import './tasks-when.css';

/**
 * Session AP (owner-approved feature list): three views of Tasks in one chunk, loaded when one of them is opened.
 * - "This evening": open tasks put on tonight's list (for today only; tomorrow they are back in their usual place).
 * - "Someday": open tasks with no day that can wait; giving one a day takes it out.
 *   Both live in their own device record, `zigoals:task-when:v1` (lib/tasks/when.ts), never in the task record.
 * - "Priority matrix": the open tasks in four boxes from priority and day (lib/tasks/matrix.ts); moving a card (drag,
 *   or its button: the keyboard way) changes only its priority level, through the task's own edit, with Undo.
 *   Session AR (6c): the drag is a pointer drag for a mouse or pen (HTML5 drag-and-drop could not be confirmed in headless
 *   Chromium): a press that moves less than DRAG_SLOP_PX stays a click; past it the card follows the pointer (a
 *   transform, so nothing else moves), the box under it is outlined, and the release makes the same move as the card's
 *   button (the same write, announcement and Undo). Escape cancels. Touch and the keyboard keep the button.
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

/** A press that moves this little is a click, not a drag (the Checklist's rows use the same distance). */
const DRAG_SLOP_PX = 8;
type PointerDrag = {id: string; el: HTMLElement; x: number; y: number; active: boolean; pointer: number};
function PriorityMatrix({list, goals, shown}: {list: List; goals: Goals; shown: Task[]}) {
  const {today, clock, tasks} = list, record = tasks.data, id = useId();
  // Session AV (owner follow-up 1, F-MATRIX-RULES): the person's own lines, a display choice of this device.
  const rules = useMatrixRules();
  const boxes = useMemo(() => matrix(shown, today, rules), [shown, today, rules]);
  const [over, setOver] = useState<Quadrant | null>(null), [dragging, setDragging] = useState<string | null>(null);
  const pointer = useRef<PointerDrag | null>(null), stop = useRef<() => void>(() => undefined);
  const move = (task: Task, target: Quadrant) => {
    let level;
    try { level = levelForMove(task, target, today, rules); } catch (e) { showStatus(e instanceof Error ? e.message : 'That box is for another day.', {tone: 'error'}); return; }
    if (level === null) return;
    const was = LEVEL_WORDS[taskLevel(task)];
    list.change(r => editTask(r, task.id, {level}, today, {allowPast: true}), `“${task.title}” moved to “${QUADRANT_WORDS[target].title}”: ${LEVEL_WORDS[level]}.`, `“${task.title}” is back at ${was}.`);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`#task-${CSS.escape(task.id)} .tasks-matrix-move`)?.focus());
  };
  // The latest move and record, for the window listeners of a drag in progress.
  const latest = useRef({move, record});
  useEffect(() => { latest.current = {move, record}; });
  useEffect(() => () => stop.current(), []);
  const boxAt = (x: number, y: number): Quadrant | null => {
    const q = document.elementFromPoint(x, y)?.closest<HTMLElement>('.tasks-matrix-box')?.dataset.quadrant;
    return (QUADRANTS as readonly string[]).includes(q ?? '') ? q as Quadrant : null;
  };
  const startDrag = (taskId: string) => (e: ReactPointerEvent<HTMLElement>) => {
    // A mouse or a pen, the main button, not in a field being typed in; touch keeps scrolling and the card's button.
    if (e.pointerType === 'touch' || e.button !== 0 || pointer.current) return;
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable="true"]')) return;
    pointer.current = {id: taskId, el: e.currentTarget, x: e.clientX, y: e.clientY, active: false, pointer: e.pointerId};
    const end = () => {
      const d = pointer.current; pointer.current = null;
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', end); window.removeEventListener('keydown', onKey, true);
      if (d) Object.assign(d.el.style, {transform: '', pointerEvents: '', position: '', zIndex: ''});
      delete document.documentElement.dataset.cardDragging;
      setOver(null); setDragging(null); stop.current = () => undefined;
    };
    const onMove = (ev: PointerEvent) => {
      const d = pointer.current;
      if (!d || ev.pointerId !== d.pointer) return;
      const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
      if (!d.active) {
        if (Math.hypot(dx, dy) <= DRAG_SLOP_PX) return;
        d.active = true; setDragging(d.id);
        document.documentElement.dataset.cardDragging = ''; // the hover glass (liquid-glass.tsx) lifts nothing while a card is carried
        window.getSelection()?.removeAllRanges();
        // The card is drawn above the boxes and lets the pointer find the box beneath it; its place in the list stays.
        Object.assign(d.el.style, {pointerEvents: 'none', position: 'relative', zIndex: '5'});
      }
      ev.preventDefault();
      d.el.style.transform = `translate(${dx}px, ${dy}px)`;
      setOver(boxAt(ev.clientX, ev.clientY));
    };
    const onUp = (ev: PointerEvent) => {
      const d = pointer.current;
      if (!d || ev.pointerId !== d.pointer) return;
      const active = d.active, target = active ? boxAt(ev.clientX, ev.clientY) : null;
      end();
      if (!active) return; // a click: the button or title under it does its own work
      // The click that follows a drag's release is not a press on the card's own buttons.
      const swallow = (c: MouseEvent) => { c.preventDefault(); c.stopPropagation(); };
      window.addEventListener('click', swallow, {capture: true, once: true});
      setTimeout(() => window.removeEventListener('click', swallow, {capture: true}), 0);
      const task = latest.current.record.tasks.find(t => t.id === d.id);
      if (task && target) latest.current.move(task, target);
    };
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape' && pointer.current?.active) { ev.preventDefault(); ev.stopPropagation(); end(); } };
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', end); window.addEventListener('keydown', onKey, true);
    stop.current = end;
  };
  return <section className="tasks-matrix-view" aria-labelledby={`${id}-rule`}>
    <p id={`${id}-rule`} className="tasks-when-lede">{ruleWords(rules)}</p>
    <MatrixRulesFold rules={rules}/>
    <div className="tasks-matrix" data-dragging={dragging ? '' : undefined}>{QUADRANTS.map(q => {
      const words = QUADRANT_WORDS[q], items = boxes[q], partner = partnerOf(q);
      return <section key={q} className="tasks-matrix-box" data-quadrant={q} data-drop={over === q || undefined} aria-labelledby={`${id}-${q}`}>
        <h3 id={`${id}-${q}`}>{words.title} <small>{formatNumber(items.length)}</small></h3>
        <p className="tasks-matrix-hint">{words.hint}</p>
        {items.length ? <ul className="tasks-list" aria-label={words.title}>{items.map(t => <TaskRow key={t.id} task={t} today={today} nowClock={clock} record={record}
          goal={t.goal ? goals.byKey.get(t.goal) : undefined} goals={goals.open} onToggle={done => list.toggle(t, done)}
          drag={{onPointerDown: startDrag(t.id), 'data-glass-carry': '', ...(dragging === t.id ? {'data-dragging': ''} : {})} as ComponentProps<typeof TaskRow>['drag']}>
          <div className="tasks-when-actions">
            <button type="button" className="text-link tasks-matrix-move" aria-label={`Move “${t.title}” to “${QUADRANT_WORDS[partner].title}”`} onClick={() => { if (quadrantOf(t, today, rules) === q) move(t, partner); }}>
              {q === 'do' || q === 'plan' ? 'Not important' : 'Important'}
            </button>
          </div>
        </TaskRow>)}</ul> : <p className="fine">Nothing here.</p>}
      </section>;
    })}</div>
    <p className="fine">Drag a card to the box beside it with a mouse, or use its button. Only the priority changes (to P1, P2 or P3); to make a task urgent or not, change its day.</p>
  </section>;
}
