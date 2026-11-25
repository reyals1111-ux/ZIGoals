'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {TASK_PLAN, type TaskPlan, type TimeTarget} from '../../lib/tasks/plan-record';
import {FOCUS_SESSIONS} from '../../lib/focus-sessions/schema';
import {labelsInUse} from '../../lib/tasks/engine';
import {hoursWords, progressWords, removeTimeTarget, setTimeTarget, targetProgress} from '../../lib/tasks/time-targets';
import type {Tasks} from '../../lib/tasks/schema';
import './tasks-aw-x2.css';

/**
 * Session AW (X2, LEDGER #437; Amazing Marvin's time targets), in Tasks → This week, its own chunk: "5 h a week on
 * @writing" for a project, an area or a label, met from the focus blocks started on its tasks (Focus on a task, or a
 * Pomodoro from Tasks), as a bar — "3 h 10 of 5 h this week". Never a warning: a target not met yet is simply how far it is.
 * Kept in `zigoals:task-plan:v1` (`timeTargets`); each change has its Undo. The bar's width is set, never animated.
 */
const HOURS = /^\d{1,3}(?:[.,]\d{1,2})?$/;
export default function TimeTargets({record, today}: {record: Tasks; today: string}) {
  const id = useId(), plan = useDeviceRecord(TASK_PLAN), focus = useDeviceRecord(FOCUS_SESSIONS);
  const [what, setWhat] = useState(''), [hours, setHours] = useState(''), [per, setPer] = useState<TimeTarget['per']>('week'), [error, setError] = useState('');
  if (!plan.loaded || !focus.loaded) return null;
  const projects = (record.projects ?? []).filter(p => !p.archived), areas = record.areas ?? [], labels = labelsInUse(record);
  const targets = plan.data.timeTargets ?? [];
  const write = (fn: (p: TaskPlan) => TaskPlan, message: string): boolean => {
    if (plan.unreadable) { showStatus('Your planning choices could not be read on this device, so nothing was written over them.', {tone: 'error'}); return false; }
    try { const before = plan.data; plan.update(fn); showUndo({message, undone: 'The targets are as they were.', restore: () => plan.update(() => before)}); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'That target could not be kept on this device.'); return false; }
  };
  const add = () => {
    const [kind, ...rest] = what.split(':'), of = rest.join(':');
    if (!kind || !of) { setError('Choose a project, an area or a label.'); return; }
    if (!HOURS.test(hours.trim())) { setError('Type the hours as a number, for example 5 or 1.5.'); return; }
    const minutes = Math.round(Number(hours.trim().replace(',', '.')) * 60);
    if (write(p => setTimeTarget(p, {kind: kind as TimeTarget['kind'], of, minutes, per}, `tt_${crypto.randomUUID()}`), `Time target: ${hoursWords(minutes)} a ${per}.`)) { setWhat(''); setHours(''); setError(''); }
  };
  const shown = targets.map(t => targetProgress(t, record, focus.unreadable ? null : focus.data, today));
  return <section className="tasks-targets" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>Time targets</h4>
    {!shown.length ? <p className="fine">Set how much time you want to give a project, an area or a label — “5 h a week on @writing”. Focus blocks started on its tasks count towards it, and a bar here shows how far it is. Nothing is a warning.</p>
      : <ul className="tasks-targets-list" aria-label="Time targets">{shown.map(p => {
        const share = Math.min(100, Math.round((p.spent / p.target.minutes) * 100)), name = p.name ?? (p.target.kind === 'area' ? 'An area no longer here' : 'A project no longer here');
        return <li key={p.target.id}>
          <span className="tasks-targets-name" dir="auto">{name}</span>
          <span className="tasks-x2-track" aria-hidden="true"><span className="tasks-x2-bar" style={{width: `${share}%`}} /></span>
          <span>{progressWords(p)}</span>
          <button type="button" className="text-link" aria-label={`Remove the time target for ${name}`} onClick={() => write(x => removeTimeTarget(x, p.target.id), `Removed the time target for ${name}.`)}>Remove</button>
        </li>; })}</ul>}
    {shown.length > 0 && <p className="fine">Counted from the focus blocks started on their tasks; a week runs Monday to Sunday. A task’s own timer adds to its time spent and is not counted here.</p>}
    {projects.length + areas.length + labels.length > 0 ? <form className="tasks-targets-form" noValidate onSubmit={e => { e.preventDefault(); add(); }}>
      <label className="field"><span>For</span><select value={what} aria-invalid={error && !what ? true : undefined} onChange={e => { setWhat(e.target.value); setError(''); }}><option value="">Choose…</option>
        {projects.length > 0 && <optgroup label="Projects">{projects.map(p => <option key={p.id} value={`project:${p.id}`}>{p.name}</option>)}</optgroup>}
        {areas.length > 0 && <optgroup label="Areas">{areas.map(a => <option key={a.id} value={`area:${a.id}`}>{a.name}</option>)}</optgroup>}
        {labels.length > 0 && <optgroup label="Labels">{labels.map(l => <option key={l.name} value={`label:${l.name}`}>@{l.name}</option>)}</optgroup>}
      </select></label>
      <label className="field"><span>Hours</span><input inputMode="decimal" autoComplete="off" value={hours} placeholder="5" aria-invalid={error && what ? true : undefined} onChange={e => { setHours(e.target.value); setError(''); }} /></label>
      <label className="field"><span>Each</span><select value={per} onChange={e => setPer(e.target.value as TimeTarget['per'])}><option value="week">Week</option><option value="month">Month</option></select></label>
      <button type="submit" className="secondary">Set the target</button>
      {error && <p className="tasks-field-error" role="alert">{error}</p>}
    </form> : <p className="fine">Give a task a project or a @label first; then a target can be set for it here.</p>}
  </section>;
}
