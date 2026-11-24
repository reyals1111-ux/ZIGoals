'use client';
import {useEffect, useId, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASK_PLAN, TIMER_NOTE_MAX, runningTimer, setTimerNote, startTimer, stopTimer, timerMinutes} from '../../lib/tasks/plan-record';
import {addSpent} from '../../lib/tasks/layouts';
import {minutesWords} from '../../lib/tasks/minutes';
import {TASKS, type Task} from '../../lib/tasks/schema';

/**
 * Session AV lane 2 (review b1 #14; Sunsama and Toggl start a timer from any task): "Start a timer" in a task's editor,
 * wherever the task is edited (a row in any list, Upcoming, This week, the Table, the Calendar, the Timeline). The same
 * timers as Tasks → Today's (`zigoals:task-plan:v1`, several at once); "Stop the timer" adds the minutes to the task's
 * time spent at once (the editor's field follows), as Stop on Today and ticking Done do. Its own chunk.
 */
export default function TaskTimer({task, onStopped, onNote}: {task: Task; onStopped: (minutes: number, updatedAt: string | undefined) => void;
  /** Session AV lane 2 (r3-plan, LEDGER #260): the note written while it ran, added to the editor's notes on the person's tap. */ onNote?: (note: string) => void}) {
  const plan = useDeviceRecord(TASK_PLAN), tasks = useDeviceRecord(TASKS), id = useId();
  const [now, setNow] = useState(() => Date.now()), [said, setSaid] = useState<{text: string; error?: boolean} | null>(null);
  const [draft, setDraft] = useState<string | null>(null), [stoppedNote, setStoppedNote] = useState('');
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  if (!plan.loaded || task.doneAt) return null;
  const running = runningTimer(plan.data, task.id), note = draft ?? running?.note ?? '';
  // Session AV lane 2 (r3-plan, LEDGER #260): the note is kept with the running timer (on this device) when the box is left.
  const keep = () => { if (draft === null || !running) return; try { plan.update(p => setTimerNote(p, task.id, draft)); } catch { setSaid({text: 'The note could not be kept on this device; it is still in the box.', error: true}); } };
  const start = () => {
    if (plan.unreadable) { setSaid({text: 'Your timers could not be read on this device, so nothing was written over them.', error: true}); return; }
    try { plan.update(p => startTimer(p, task.id, Date.now())); setNow(Date.now()); setSaid({text: `Timing “${task.title}”. Stop it here, on Tasks → Today, or by ticking Done: the minutes go to its time spent.`}); }
    catch (e) { setSaid({text: e instanceof Error ? e.message : 'The timer could not be kept on this device.', error: true}); }
  };
  const stop = () => {
    try {
      const latest = draft !== null ? setTimerNote(plan.data, task.id, draft) : plan.data;
      const {plan: next, minutes, note: kept} = stopTimer(latest, task.id, Date.now());
      // The minutes first, then the timer: a minutes write that fails leaves the timer running and nothing changed.
      const record = tasks.update(r => addSpent(r, task.id, minutes));
      plan.update(() => next);
      onStopped(minutes, record.tasks.find(t => t.id === task.id)?.updatedAt);
      setSaid({text: `Stopped: ${minutesWords(minutes)} added to its time spent.`});
      setDraft(null); setStoppedNote(kept ?? '');
    } catch (e) { setSaid({text: e instanceof Error ? e.message : 'The timer could not be stopped on this device.', error: true}); }
  };
  return <div className="task-timer">
    {/* One button whose words change, so focus stays on it after Start and Stop. */}
    {running && <span><span aria-hidden="true">⏱ </span>Timing: {minutesWords(timerMinutes(running.since, now))}</span>}
    <button type="button" className="secondary" onClick={running ? stop : start}>{running ? 'Stop the timer' : 'Start a timer'}</button>
    {running && <label className="field task-timer-note"><span>Note while timing</span><textarea dir="auto" rows={2} maxLength={TIMER_NOTE_MAX} value={note} aria-describedby={`${id}-tn`} onChange={e => setDraft(e.target.value)} onBlur={keep} />
      <small id={`${id}-tn`} className="tasks-field-note">Kept with the timer on this device. When you stop it, you can add the note to this task’s notes.</small></label>}
    {stoppedNote && onNote && <p className="task-timer-note-add"><button type="button" className="secondary" onClick={() => { onNote(stoppedNote); setStoppedNote(''); setSaid({text: 'The note is in the Notes field below; Save keeps it.'}); }}>Add the timer’s note to the notes</button></p>}
    {said && <p className={said.error ? 'tasks-field-error' : 'tasks-field-note'} role={said.error ? 'alert' : 'status'}>{said.text}</p>}
  </div>;
}
