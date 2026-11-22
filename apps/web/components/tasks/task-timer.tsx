'use client';
import {useEffect, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASK_PLAN, runningTimer, startTimer, stopTimer, timerMinutes} from '../../lib/tasks/plan-record';
import {addSpent} from '../../lib/tasks/layouts';
import {minutesWords} from '../../lib/tasks/minutes';
import {TASKS, type Task} from '../../lib/tasks/schema';

/**
 * Session AV lane 2 (review b1 #14; Sunsama and Toggl start a timer from any task): "Start a timer" in a task's editor,
 * wherever the task is edited (a row in any list, Upcoming, This week, the Table, the Calendar, the Timeline). The same
 * timers as Tasks → Today's (`zigoals:task-plan:v1`, several at once); "Stop the timer" adds the minutes to the task's
 * time spent at once (the editor's field follows), as Stop on Today and ticking Done do. Its own chunk.
 */
export default function TaskTimer({task, onStopped}: {task: Task; onStopped: (minutes: number, updatedAt: string | undefined) => void}) {
  const plan = useDeviceRecord(TASK_PLAN), tasks = useDeviceRecord(TASKS);
  const [now, setNow] = useState(() => Date.now()), [said, setSaid] = useState<{text: string; error?: boolean} | null>(null);
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(t); }, []);
  if (!plan.loaded || task.doneAt) return null;
  const running = runningTimer(plan.data, task.id);
  const start = () => {
    if (plan.unreadable) { setSaid({text: 'Your timers could not be read on this device, so nothing was written over them.', error: true}); return; }
    try { plan.update(p => startTimer(p, task.id, Date.now())); setNow(Date.now()); setSaid({text: `Timing “${task.title}”. Stop it here, on Tasks → Today, or by ticking Done: the minutes go to its time spent.`}); }
    catch (e) { setSaid({text: e instanceof Error ? e.message : 'The timer could not be kept on this device.', error: true}); }
  };
  const stop = () => {
    try {
      const {plan: next, minutes} = stopTimer(plan.data, task.id, Date.now());
      // The minutes first, then the timer: a minutes write that fails leaves the timer running and nothing changed.
      const record = tasks.update(r => addSpent(r, task.id, minutes));
      plan.update(() => next);
      onStopped(minutes, record.tasks.find(t => t.id === task.id)?.updatedAt);
      setSaid({text: `Stopped: ${minutesWords(minutes)} added to its time spent.`});
    } catch (e) { setSaid({text: e instanceof Error ? e.message : 'The timer could not be stopped on this device.', error: true}); }
  };
  return <div className="task-timer">
    {/* One button whose words change, so focus stays on it after Start and Stop. */}
    {running && <span><span aria-hidden="true">⏱ </span>Timing: {minutesWords(timerMinutes(running.since, now))}</span>}
    <button type="button" className="secondary" onClick={running ? stop : start}>{running ? 'Stop the timer' : 'Start a timer'}</button>
    {said && <p className={said.error ? 'tasks-field-error' : 'tasks-field-note'} role={said.error ? 'alert' : 'status'}>{said.text}</p>}
  </div>;
}
