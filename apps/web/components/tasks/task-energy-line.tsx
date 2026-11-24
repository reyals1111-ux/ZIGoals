'use client';
import {useMemo} from 'react';
import {useSleep} from '../health/sleep/use-sleep';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import {focusWindow} from '../../lib/sleep/focus-window';
import {dayEnergy, energyLine} from '../../lib/tasks/energy-load';
import {minutesClock} from '../../lib/timeline/store';
import {formatClock} from '../../lib/visual-format';
import type {Task} from '../../lib/tasks/schema';
import './tasks-r3.css';

/**
 * Session AV lane 2 (r3-plan, LEDGER #259; Structured's Energy Monitor): the day's energy on Tasks → Today (part of the Plan
 * my day chunk): its total against the person's amount in calm words, never red, and a quiet mark on a heavy task planned
 * outside today's focus window (from the person's own sleep, only where Health is shown). Nothing when no task of the day
 * has an energy.
 */
export default function TaskEnergyLine({tasks, today, amount}: {tasks: readonly Task[]; today: string; amount?: number}) {
  const sleep = useSleep(), healthShown = isShown(usePagesView(), 'health');
  const window = useMemo(() => healthShown && sleep.loaded && !sleep.error ? focusWindow(sleep.sleep, today) : null, [healthShown, sleep.loaded, sleep.error, sleep.sleep, today]);
  const e = useMemo(() => dayEnergy(tasks, amount, window), [tasks, amount, window]);
  if (!e.rated) return null;
  const span = window ? `${formatClock(minutesClock(window.from))}–${formatClock(minutesClock(window.to))}` : '';
  return <div className="tasks-energy" data-energy={e.state}>
    <p className="tasks-energy-line">{energyLine(e)}{e.unrated ? <small className="fine"> {e.unrated === 1 ? '1 task has' : `${e.unrated} tasks have`} no energy yet.</small> : null}</p>
    {e.heavyOutside.length > 0 && <ul className="tasks-energy-marks" aria-label="Heavy tasks outside today’s focus window">{e.heavyOutside.map(t => <li key={t.id}><span aria-hidden="true">◦ </span><span dir="auto">{t.title}</span> at {formatClock(t.time!)} is heavy and outside today’s focus window ({span}); it may sit better inside it.</li>)}</ul>}
  </div>;
}
