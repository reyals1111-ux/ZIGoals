'use client';
import {useId} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASK_PLAN} from '../../lib/tasks/plan-record';
import {MAX_TRAVEL, PLACE_MAX, type Task} from '../../lib/tasks/schema';
import {bucketOf, bucketTitle} from '../../lib/tasks/plan-bucket';
import type {R5Fields} from '../../lib/tasks/r5-fields';
import {blocksOn, leaveBy, TRAVEL_CHOICES} from '../../lib/tasks/time-blocks';
import {minutesWords} from '../../lib/tasks/minutes';
import {formatClock, formatDate, formatMonth} from '../../lib/visual-format';
import './tasks-r5.css';

/**
 * Session AV lane 2 (r5-plan; Akiflow), in the task editor, its own chunk; the editor keeps the values and saves them with
 * the rest:
 * - a place (LEDGER #354): an address or a link, written as typed; nothing is looked up; it goes into the .ics export;
 * - travel minutes before its time (LEDGER #353): typed (working them out from a route would need a maps service); a block
 *   before the task on the Day Timeline and the Agenda, busy for Plan my day, and a "Leave by" reminder;
 * - a week or a month, for a task with no day (LEDGER #349);
 * - the time block it is in, on its day (LEDGER #348).
 * Session AV lane 2 (fixb5): each control is named by its own words only (`aria-labelledby`), its note under it read as its
 * description; inside the <label>, the note was part of the name ("Place Written as you type it; …").
 */
export default function TaskR5Fields({task, today, due, time, value, onChange}: {task: Task; today: string; due: string; time: string; value: R5Fields; onChange: (v: R5Fields) => void}) {
  const id = useId(), plan = useDeviceRecord(TASK_PLAN);
  const blocks = due && plan.loaded ? blocksOn(plan.data, due) : [];
  const travel = Number(value.travel) || 0, leave = time && travel ? leaveBy(time, travel) : null, bad = value.travel.trim() !== '' && !(Number.isInteger(Number(value.travel)) && travel >= 1 && travel <= MAX_TRAVEL);
  const current = bucketOf(task, today), name = (b: NonNullable<Task['plan']>) => bucketTitle(b.kind, b.of, today, formatMonth, d => formatDate(d, {year: false}));
  const isLink = /^https?:\/\//i.test(value.place.trim());
  return <fieldset className="task-r5-fields">
    <legend>Where and when — optional</legend>
    <label className="field"><span id={`${id}-place-name`}>Place</span><input aria-labelledby={`${id}-place-name`} dir="auto" value={value.place} maxLength={PLACE_MAX} placeholder="An address, or a link" aria-describedby={`${id}-place`} onChange={e => onChange({...value, place: e.target.value})} />
      <small id={`${id}-place`} className="tasks-field-note">{value.place.trim() ? isLink ? 'A link: it opens in a new tab from the task’s row.' : 'Shown on the task’s row and put in a calendar export. Nothing is looked up.' : 'Written as you type it; nothing is looked up.'}</small></label>
    <label className="field"><span id={`${id}-travel-name`}>Travel before (minutes)</span><input aria-labelledby={`${id}-travel-name`} inputMode="numeric" autoComplete="off" list={`${id}-travel-list`} value={value.travel} disabled={!due || !time} placeholder="20" aria-invalid={bad || undefined} aria-describedby={`${id}-travel`} onChange={e => onChange({...value, travel: e.target.value})} />
      <datalist id={`${id}-travel-list`}>{TRAVEL_CHOICES.map(n => <option key={n} value={n} />)}</datalist>
      <small id={`${id}-travel`} className={bad ? 'tasks-field-error' : 'tasks-field-note'} role={bad ? 'alert' : undefined}>{!due || !time ? 'Give the task a day and a time first.' : bad ? `Enter whole minutes from 1 to ${MAX_TRAVEL}.` : leave ? `Leave by ${formatClock(leave)}: ${minutesWords(travel)} kept free before it, and a reminder then when task reminders are on.` : 'How long it takes you to get there. You type it; no route is looked up.'}</small></label>
    {!due && <label className="field"><span id={`${id}-bucket-name`}>Plan for</span><select aria-labelledby={`${id}-bucket-name`} value={value.bucket} aria-describedby={`${id}-bucket`} onChange={e => onChange({...value, bucket: e.target.value as R5Fields['bucket']})}>
      <option value="">No week or month</option>
      {task.plan && current && <option value="keep">{name(current)} (as now)</option>}
      <option value="week">This week, any day</option><option value="next-week">Next week, any day</option><option value="month">This month, any day</option><option value="next-month">Next month, any day</option></select>
      <small id={`${id}-bucket`} className="tasks-field-note">It shows in Upcoming under its week or month until it is done or given a day. If the week passes, it moves to the next week’s list.</small></label>}
    {/* Review B5L-9: not for a repeating task (it moves on when ticked) */}
    {due && !task.recur && (blocks.length > 0 || value.block) && <label className="field"><span id={`${id}-block-name`}>Time block</span><select aria-labelledby={`${id}-block-name`} value={value.block} aria-describedby={`${id}-block`} onChange={e => onChange({...value, block: e.target.value})}>
      <option value="">Not in a block</option>
      {value.block && !blocks.some(b => b.id === value.block) && <option value={value.block}>A block not on this day</option>}
      {blocks.map(b => <option key={b.id} value={b.id}>{b.name} · {formatClock(b.from)}–{formatClock(b.to)}</option>)}</select>
      <small id={`${id}-block`} className="tasks-field-note">Plan my day places it inside the block; the block counts it in “2 of 4 done”.</small></label>}
  </fieldset>;
}
