'use client';
import {useMemo, useState} from 'react';
import TodayPlanner from './today-planner';
import type {Task} from '../../lib/tasks/schema';
import {planSuggestions, plannedToday} from '../../lib/tasks/plan-day';
import type {Tasks} from '../../lib/tasks/schema';
import {formatNumber} from '../../lib/visual-format';
import {plural} from '../../lib/plural';
import './plan-day.css';

/**
 * Session AV (owner follow-up 1, F-PLAN-DAY; TickTick's suggestions, Sunsama's planning step, with no model): a fold at
 * the top of Tasks → Today with up to five open tasks worth a look (overdue, a near deadline, priority 1–2 without a
 * day), each with why. "Plan for today" moves it to today (the list's own change, with its Undo); "Not now" sets it
 * aside for now (this tab's session storage, nothing stored in the tasks; Session AV 1c, q1 #38: the words said "until
 * tomorrow", which a new tab did not keep). With an overdue suggestion the fold opens itself (it sits below the list).
 * Nothing shows when there is nothing to suggest. Its own chunk.
 */
const asideKey = (today: string) => `zigoals:plan-day:aside:${today}`;
function readAside(today: string): string[] { try { const v = JSON.parse(sessionStorage.getItem(asideKey(today)) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : []; } catch { return []; } }
export default function PlanDay({record, today, onPlan, clock, shown, change, doneDay}: {record: Tasks; today: string; onPlan: (id: string) => void;
  /** Session AV lane 2 (tasks): what the day planner below the suggestions needs (today-planner.tsx). */
  clock?: string; shown?: readonly Task[]; change?: (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean; doneDay?: (iso: string) => string}) {
  const [aside, setAside] = useState<string[]>(() => readAside(today));
  const suggestions = useMemo(() => planSuggestions(record, today, new Set(aside)), [record, today, aside]);
  // Opened once, as the view opens, when something is overdue; after that it stays as the person leaves it.
  const [openAtFirst] = useState(() => planSuggestions(record, today, new Set(readAside(today))).some(s => s.why === 'overdue'));
  // Session AV lane 2 (LEDGER #21, #24–#27, #9): the day planner shows also when nothing is suggested.
  const planner = clock && shown && change && doneDay ? <TodayPlanner record={record} today={today} clock={clock} shown={shown} change={change} doneDay={doneDay}/> : null;
  if (!suggestions.length) return planner;
  const planned = plannedToday(record, today);
  const putAside = (id: string) => { const next = [...aside, id]; setAside(next); try { sessionStorage.setItem(asideKey(today), JSON.stringify(next)); } catch { /* kept for this view only */ } };
  return <>{planner}<details className="tasks-plan-day" open={openAtFirst || undefined}>
    <summary>Plan my day <small>{formatNumber(suggestions.length)} {plural(suggestions.length, 'suggestion')} · {planned ? `${formatNumber(planned)} ${plural(planned, 'task')} planned for today` : 'nothing planned for today yet'}</small></summary>
    <p className="fine">Tasks worth a look today: overdue ones, a deadline within three days, and priority 1 or 2 with no day. Plan one for today, or set it aside for now.</p>
    <ul className="tasks-plan-day-list" aria-label="Suggested for today">{suggestions.map(s => <li key={s.task.id}>
      <span className="tasks-plan-day-what"><strong dir="auto">{s.task.title}</strong><small>{s.words}</small></span>
      <span className="tasks-plan-day-actions"><button type="button" className="secondary" aria-label={`Plan ${s.task.title} for today`} onClick={() => onPlan(s.task.id)}>Plan for today</button>
        <button type="button" className="quiet" aria-label={`Not now: ${s.task.title}`} onClick={() => putAside(s.task.id)}>Not now</button></span>
    </li>)}</ul>
  </details></>;
}
