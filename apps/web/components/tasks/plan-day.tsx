'use client';
import {useMemo, useState} from 'react';
import {planSuggestions, plannedToday} from '../../lib/tasks/plan-day';
import type {Tasks} from '../../lib/tasks/schema';
import {formatNumber} from '../../lib/visual-format';
import {plural} from '../../lib/plural';
import './plan-day.css';

/**
 * Session AV (owner follow-up 1, F-PLAN-DAY; TickTick's suggestions, Sunsama's planning step, with no model): a fold at
 * the top of Tasks → Today with up to five open tasks worth a look (overdue, a near deadline, priority 1–2 without a
 * day), each with why. "Plan for today" moves it to today (the list's own change, with its Undo); "Not today" sets it
 * aside until tomorrow on this device (session storage, nothing stored in the tasks). Nothing shows when there is nothing
 * to suggest. Its own chunk.
 */
const asideKey = (today: string) => `zigoals:plan-day:aside:${today}`;
function readAside(today: string): string[] { try { const v = JSON.parse(sessionStorage.getItem(asideKey(today)) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : []; } catch { return []; } }
export default function PlanDay({record, today, onPlan}: {record: Tasks; today: string; onPlan: (id: string) => void}) {
  const [aside, setAside] = useState<string[]>(() => readAside(today));
  const suggestions = useMemo(() => planSuggestions(record, today, new Set(aside)), [record, today, aside]);
  if (!suggestions.length) return null;
  const planned = plannedToday(record, today);
  const putAside = (id: string) => { const next = [...aside, id]; setAside(next); try { sessionStorage.setItem(asideKey(today), JSON.stringify(next)); } catch { /* kept for this view only */ } };
  return <details className="tasks-plan-day">
    <summary>Plan my day <small>{formatNumber(suggestions.length)} {plural(suggestions.length, 'suggestion')} · {planned ? `${formatNumber(planned)} ${plural(planned, 'task')} planned for today` : 'nothing planned for today yet'}</small></summary>
    <p className="fine">Tasks worth a look today: overdue ones, a deadline within three days, and priority 1 or 2 with no day. Plan one for today, or set it aside until tomorrow.</p>
    <ul className="tasks-plan-day-list" aria-label="Suggested for today">{suggestions.map(s => <li key={s.task.id}>
      <span className="tasks-plan-day-what"><strong dir="auto">{s.task.title}</strong><small>{s.words}</small></span>
      <span className="tasks-plan-day-actions"><button type="button" className="secondary" aria-label={`Plan ${s.task.title} for today`} onClick={() => onPlan(s.task.id)}>Plan for today</button>
        <button type="button" className="quiet" aria-label={`Not today: ${s.task.title}`} onClick={() => putAside(s.task.id)}>Not today</button></span>
    </li>)}</ul>
  </details>;
}
