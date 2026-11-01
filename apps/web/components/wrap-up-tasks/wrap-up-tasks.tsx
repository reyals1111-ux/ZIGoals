'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASKS, type Task} from '../../lib/tasks/schema';
import {localDate} from '../../lib/local-date';
import {letTaskGo, moveTaskDue, putTaskBack, tomorrowOf, wrapUpTasks} from '../../lib/wrap-up-tasks/move';
import './wrap-up-tasks.css';

/**
 * Session AK (BUILD list 2 #14, lane G1a): inside the evening wrap-up card, the tasks still open today, each with
 * "Move to tomorrow" or "Let it go" (it stays in Tasks without a day), with Undo. No "missed", no count. With no task
 * open today it says nothing, except one teaching line on a device that has never had a task. Loaded with the card.
 */
export default function WrapUpTasks() {
  const rec = useDeviceRecord(TASKS);
  const [said, setSaid] = useState<{text: string; before: Task} | null>(null), [problem, setProblem] = useState('');
  if (!rec.loaded || rec.unreadable) return null;
  const today = localDate(), open = wrapUpTasks(rec.data, today);
  const act = (task: Task, change: 'move' | 'go') => {
    setProblem('');
    // The day is read at the tap, so a card left open past midnight moves to the new tomorrow.
    const now = localDate();
    try { rec.update(r => change === 'move' ? moveTaskDue(r, task.id, tomorrowOf(now)) : letTaskGo(r, task.id)); setSaid({text: change === 'move' ? `“${task.title}” moves to tomorrow.` : `“${task.title}” is let go for now. It stays in Tasks, without a day.`, before: task}); }
    catch (e) { setProblem(e instanceof Error && e.message ? e.message : 'Not saved on this device. Try again.'); }
  };
  const undo = () => { if (!said) return; try { rec.update(r => putTaskBack(r, said.before)); setSaid(null); } catch { setProblem('It could not be put back on this device.'); } };
  if (!open.length && !said) return rec.data.tasks.length ? null : <p className="fine wrap-up-tasks-teach">Tasks you give today&rsquo;s date show here in the evening, to move to tomorrow or let go. <Link className="text-link" href="/app/tasks">Open Tasks</Link></p>;
  return <section className="wrap-up-tasks" aria-label="Moving to tomorrow">
    {open.length > 0 && <><p className="wrap-up-tasks-title">Still open today. Carry anything over?</p>
      <ul className="wrap-up-tasks-list">{open.map(t => <li key={t.id}>
        <span className="wrap-up-tasks-name">{t.title}</span>
        <span className="wrap-up-tasks-actions">
          <button type="button" className="secondary" aria-label={`Move “${t.title}” to tomorrow`} onClick={() => act(t, 'move')}>Move to tomorrow</button>
          <button type="button" className="quiet" aria-label={`Let “${t.title}” go`} onClick={() => act(t, 'go')}>Let it go</button>
        </span>
      </li>)}</ul></>}
    <p className="fine" role="status" aria-live="polite">{said ? <>{said.text} <button type="button" className="text-link" onClick={undo}>Undo</button></> : ''}</p>
    {problem && <p role="alert">{problem}</p>}
  </section>;
}
