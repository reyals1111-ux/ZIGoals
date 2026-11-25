'use client';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASK_PLAN} from '../../lib/tasks/plan-record';
import {hoursOn} from '../../lib/tasks/work-hours';
import {dayProgress, dayProgressWords} from '../../lib/tasks/day-progress';
import type {Tasks} from '../../lib/tasks/schema';
import {formatClock} from '../../lib/visual-format';
import './tasks-aw-x2.css';

/**
 * Session AW (X2, LEDGER #436; Amazing Marvin's progress bar and "the day is N % through"), inside Tasks → Today's heading
 * line (never a card of its own, so Today's first screen is as it was), its own chunk: "2 of 5 of today’s tasks done", a thin
 * bar, and beside it how far the working hours have gone. Two facts side by side, never compared and never "behind";
 * nothing before the first task planned for today. The hours are the person's own (Tasks → This week). No motion: the bar's
 * width is set, never animated.
 */
export default function DayProgressLine({record, today, clock, doneDay}: {record: Tasks; today: string; clock: string; doneDay: (iso: string) => string}) {
  const plan = useDeviceRecord(TASK_PLAN);
  if (!plan.loaded) return null;
  const p = dayProgress(record, today, clock, hoursOn(plan.data, today), doneDay);
  if (!p) return null;
  const words = dayProgressWords(p, formatClock), share = Math.round((p.done / p.total) * 100);
  return <p className="tasks-day-progress" data-x2="day-progress">
    <span>{words.tasks}</span>
    <span className="tasks-x2-track" aria-hidden="true"><span className="tasks-x2-bar" style={{width: `${share}%`}} /></span>
    {words.hours && <span>· {words.hours}</span>}
  </p>;
}
