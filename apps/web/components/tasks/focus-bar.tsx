'use client';
import {useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASK_PLAN, setFocus} from '../../lib/tasks/plan-record';
import {focusName, readFocus, type TaskFocus} from '../../lib/tasks/focus';
import type {Tasks} from '../../lib/tasks/schema';
import './tasks-r6.css';

/**
 * Session AV lane 2 (r6-plan, LEDGER #394; OmniFocus's Focus), its own chunk: "Focus…" chooses one or more areas or projects,
 * and Today, Upcoming, All open, Overdue, a label, a priority, the matrix, the Calendar and Plan my day show only their tasks,
 * with the quiet line "Focused on Work · Show all" until it is ended. The Inbox and a project's own view are never narrowed.
 * Kept on this device in the planning record; ending it is one tap (with Undo).
 */
export default function FocusBar({record, focus, choosing, onChoosing}: {record: Tasks; focus: TaskFocus | null; choosing: boolean; onChoosing: (on: boolean) => void}) {
  const id = useId(), plan = useDeviceRecord(TASK_PLAN), lineRef = useRef<HTMLParagraphElement>(null);
  const [areas, setAreas] = useState<string[]>(focus?.areas ?? []), [projects, setProjects] = useState<string[]>(focus?.projects ?? []), [error, setError] = useState('');
  const live = (record.projects ?? []).filter(p => !p.archived), allAreas = record.areas ?? [];
  const write = (next: TaskFocus | null, said: string, undone: string): boolean => {
    if (plan.unreadable) { showStatus('Your planning choices on this device could not be read, so nothing was changed.', {tone: 'error'}); return false; }
    // Review B6M-8: the Undo puts back the focus only; anything else written to the planning record meanwhile stays.
    const was = readFocus(plan.data.focus);
    try { plan.update(p => setFocus(p, next)); } catch (e) { setError(e instanceof Error ? e.message : 'That could not be kept on this device.'); return false; }
    showUndo({message: said, undone, restore: () => plan.update(p => setFocus(p, was))});
    return true;
  };
  const toggle = (list: string[], set: (v: string[]) => void, v: string, on: boolean) => set(on ? [...new Set([...list, v])] : list.filter(x => x !== v));
  const keep = () => {
    if (!areas.length && !projects.length) { setError('Choose an area or a project to focus on.'); return; }
    const next = {projects, areas};
    if (write(next, `Focused on ${focusName(next, record)}. Other projects’ tasks are hidden from these views until you choose Show all.`, focus ? 'The focus is as it was.' : 'Showing every project again.')) { setError(''); onChoosing(false); requestAnimationFrame(() => lineRef.current?.focus()); }
  };
  // Focus is never dropped to the page: back to the line, or to “Focus…” in the view's head.
  const refocus = () => requestAnimationFrame(() => (lineRef.current ?? document.querySelector<HTMLElement>('.tasks-focus-open') ?? document.getElementById('tasks-view-title'))?.focus());
  const end = () => { if (write(null, 'Showing every project again.', 'Focused again.')) { onChoosing(false); refocus(); } };
  return <div className="tasks-r6-focus">
    {focus && !choosing && <p ref={lineRef} tabIndex={-1} className="tasks-r6-line" role="status">Focused on <strong dir="auto">{focusName(focus, record)}</strong> · <button type="button" className="text-link" onClick={end}>Show all</button> · <button type="button" className="text-link" onClick={() => { setAreas(focus.areas ?? []); setProjects(focus.projects ?? []); onChoosing(true); }}>Change</button></p>}
    {choosing && <fieldset className="tasks-r6-set tasks-r6-focus-pick" aria-describedby={`${id}-help`}>
      <legend>Focus on</legend>
      <p id={`${id}-help`} className="fine">Choose what to work on now. Today, Upcoming, the matrix, the Calendar and Plan my day show only their tasks until you choose Show all. Tasks in the Inbox are never hidden.</p>
      {allAreas.length > 0 && <div role="group" aria-label="Areas" className="tasks-r6-checks">{allAreas.map(a => <label key={a.id} className="tasks-r6-check"><input type="checkbox" checked={areas.includes(a.id)} onChange={e => { toggle(areas, setAreas, a.id, e.target.checked); setError(''); }} /> <span dir="auto">Area: {a.name}</span></label>)}</div>}
      <div role="group" aria-label="Projects" className="tasks-r6-checks">{live.map(p => <label key={p.id} className="tasks-r6-check"><input type="checkbox" checked={projects.includes(p.id)} onChange={e => { toggle(projects, setProjects, p.id, e.target.checked); setError(''); }} /> <span dir="auto">{p.name}</span></label>)}</div>
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
      <p className="tasks-r6-actions"><button type="button" className="secondary" onClick={keep}>Focus</button>{focus && <button type="button" className="quiet" onClick={end}>Show all</button>}<button type="button" className="quiet" onClick={() => { setError(''); onChoosing(false); refocus(); }}>Cancel</button></p>
    </fieldset>}
  </div>;
}
