'use client';
import './aw-x1.css';
import Link from 'next/link';
import {useId} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {NOTIFY_PREFS, taskAgainOf} from '../../lib/notify/prefs';
import {AGAIN_EVERY, AGAIN_SUGGESTED, AGAIN_TIMES_MAX, AGAIN_TIMES_MIN, againWords, type AgainChoice, type AgainEvery} from '../../lib/tasks/remind-again';

/**
 * Session AW (X1, LEDGER #438; Due's "remind again until done"): in a task's editor, whether its reminders come back
 * every few minutes until Done or Snooze — as this device's default, not at all, or every 5, 10, 15 or 30 minutes up to
 * 2–10 times. The editor keeps the choice and writes it with Save (`again` on each reminder). Its own chunk.
 */
export default function RemindAgainField({value, onChange, hasReminder}: {value: AgainChoice; onChange: (v: AgainChoice) => void; hasReminder: boolean}) {
  const id = useId(), prefs = useDeviceRecord(NOTIFY_PREFS), fallback = taskAgainOf(prefs.data);
  const every = value.kind === 'own' ? String(value.again.every) : value.kind;
  const note = !hasReminder ? 'Set a reminder above first; then it can remind you again until you tick Done or Snooze.'
    : value.kind === 'own' ? `After it goes off it reminds you again ${againWords(value.again)}, until you tick Done or Snooze. Quiet hours hold it.`
    : value.kind === 'off' ? 'It reminds you once.'
    : fallback ? `Your default: ${againWords(fallback)}, until you tick Done or Snooze.` : 'Your default is to remind once.';
  return <div className="task-remind-again" role="group" aria-labelledby={`${id}-t`}>
    <span id={`${id}-t`} className="task-editor-pause-title">Remind again</span>
    <label className="field"><span>Every</span><select value={every} disabled={!hasReminder} aria-describedby={`${id}-n`} onChange={e => {
      const v = e.target.value;
      onChange(v === 'default' ? {kind: 'default'} : v === 'off' ? {kind: 'off'} : {kind: 'own', again: {every: Number(v) as AgainEvery, times: value.kind === 'own' ? value.again.times : AGAIN_SUGGESTED.times}});
    }}>
      <option value="default">{fallback ? `As my default (every ${fallback.every} min, ${fallback.times} times)` : 'As my default (once)'}</option>
      <option value="off">Don’t remind again</option>
      {AGAIN_EVERY.map(n => <option key={n} value={n}>Every {n} minutes</option>)}
    </select></label>
    {value.kind === 'own' && <label className="field"><span>Up to</span><select value={String(value.again.times)} disabled={!hasReminder} onChange={e => onChange({kind: 'own', again: {every: value.again.every, times: Number(e.target.value)}})}>
      {Array.from({length: AGAIN_TIMES_MAX - AGAIN_TIMES_MIN + 1}, (_, k) => k + AGAIN_TIMES_MIN).map(n => <option key={n} value={n}>{n} times</option>)}
    </select></label>}
    <small id={`${id}-n`} className="tasks-field-note">{note} <Link prefetch={false} className="text-link" href="/app/tasks?view=week#reminder-choices">Your default and snooze choices</Link></small>
  </div>;
}
