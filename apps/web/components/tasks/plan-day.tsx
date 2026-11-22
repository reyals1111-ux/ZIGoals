'use client';
import {useEffect, useMemo, useState} from 'react';
import TodayPlanner from './today-planner';
import {useCarried, useMyDay} from './my-day-parts';
import type {Task} from '../../lib/tasks/schema';
import {planSuggestions, plannedToday} from '../../lib/tasks/plan-day';
import type {Tasks} from '../../lib/tasks/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
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
/** Session AV lane 2 (r3-plan, LEDGER #256): the "Plan your day" notification opens Tasks → Today with ?plan=1. */
const askedToPlan = () => { try { return new URLSearchParams(window.location.search).get('plan') === '1'; } catch { return false; } };
const asideKey = (today: string) => `zigoals:plan-day:aside:${today}`;
function readAside(today: string): string[] { try { const v = JSON.parse(sessionStorage.getItem(asideKey(today)) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 200) : []; } catch { return []; } }
export default function PlanDay({record, today, onPlan, clock, shown, change, doneDay}: {record: Tasks; today: string; onPlan: (id: string) => void;
  /** Session AV lane 2 (tasks): what the day planner below the suggestions needs (today-planner.tsx). */
  clock?: string; shown?: readonly Task[]; change?: (fn: (r: Tasks) => Tasks, text: string, undone?: string) => boolean; doneDay?: (iso: string) => string}) {
  const [aside, setAside] = useState<string[]>(() => readAside(today));
  const suggestions = useMemo(() => planSuggestions(record, today, new Set(aside)), [record, today, aside]);
  // Session AV lane 2 (tasks-r2, LEDGER #223; Microsoft To Do's My Day): "Add to My Day" picks a task for today and leaves
  // its day alone; the last day's picks still open come back as "From yesterday".
  const my = useMyDay(today), carriedAll = useCarried(record, today, my.myDay), carried = carriedAll ? {...carriedAll, tasks: carriedAll.tasks.filter(t => !aside.includes(t.id))} : null;
  // Opened once, as the view opens, when something is overdue; after that it stays as the person leaves it.
  const [openAtFirst] = useState(() => askedToPlan() || planSuggestions(record, today, new Set(readAside(today))).some(s => s.why === 'overdue'));
  // Session AV lane 2 (r3-plan, LEDGER #256): from the notification, the fold opens with the focus on it (the day planner when
  // nothing is suggested), and the address forgets ?plan=1 so a reload does not jump again.
  useEffect(() => {
    if (!askedToPlan()) return;
    const target = document.querySelector<HTMLElement>('.tasks-plan-day > summary') ?? document.querySelector<HTMLElement>('.tasks-today-planner');
    if (target) { if (!target.matches('summary')) target.tabIndex = -1; target.scrollIntoView({block: 'start'}); target.focus({preventScroll: true}); }
    try { const url = new URL(window.location.href); url.searchParams.delete('plan'); window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash); } catch { /* the address stays */ }
  }, []);
  // Session AV lane 2 (LEDGER #21, #24–#27, #9): the day planner shows also when nothing is suggested.
  const planner = clock && shown && change && doneDay ? <TodayPlanner record={record} today={today} clock={clock} shown={shown} change={change} doneDay={doneDay}/> : null;
  if (!suggestions.length && !carried?.tasks.length) return planner;
  const planned = plannedToday(record, today), picks = my.picked.size;
  const putAside = (id: string) => { const next = [...aside, id]; setAside(next); try { sessionStorage.setItem(asideKey(today), JSON.stringify(next)); } catch { /* kept for this view only */ } };
  return <>{planner}<details className="tasks-plan-day" open={openAtFirst || undefined}>
    <summary>Plan my day <small>{[suggestions.length ? `${formatNumber(suggestions.length)} ${plural(suggestions.length, 'suggestion')}` : '', carried?.tasks.length ? `${formatNumber(carried.tasks.length)} from ${carried.when}` : ''].filter(Boolean).join(' · ')} · {planned ? `${formatNumber(planned)} ${plural(planned, 'task')} planned for today` : 'nothing planned for today yet'}{picks ? ` · ${formatNumber(picks)} in My Day` : ''}</small></summary>
    {suggestions.length > 0 && <>
      <p className="fine">Tasks worth a look today: overdue ones, a deadline within three days, and priority 1 or 2 with no day. Plan one for today (it moves to today), add it to My Day (for today only, its day stays), or set it aside for now.</p>
      <ul className="tasks-plan-day-list" aria-label="Suggested for today">{suggestions.map(s => <li key={s.task.id}>
        <span className="tasks-plan-day-what"><strong dir="auto">{s.task.title}</strong><small>{s.words}</small></span>
        <span className="tasks-plan-day-actions"><button type="button" className="secondary" aria-label={`Plan ${s.task.title} for today`} onClick={() => onPlan(s.task.id)}>Plan for today</button>
          {!my.picked.has(s.task.id) && <button type="button" className="quiet" aria-label={`Add ${s.task.title} to My Day`} onClick={() => my.pick([s.task], true)}>My Day</button>}
          <button type="button" className="quiet" aria-label={`Not now: ${s.task.title}`} onClick={() => putAside(s.task.id)}>Not now</button></span>
      </li>)}</ul>
    </>}
    {carried && carried.tasks.length > 0 && <>
      <h3 className="tasks-plan-day-sub">From {carried.when}</h3>
      <p className="fine">Picked for My Day on {carried.when === 'yesterday' ? 'yesterday' : carried.when} and still open. My Day starts empty each morning; add them again, or leave them.</p>
      <ul className="tasks-plan-day-list" aria-label={`From ${carried.when}`}>{carried.tasks.map(t => <li key={t.id}>
        <span className="tasks-plan-day-what"><strong dir="auto">{t.title}</strong><small>{t.due ? `Its day: ${t.due === today ? 'today' : formatDate(t.due, {weekday: true, year: false})}` : 'No day of its own'}</small></span>
        <span className="tasks-plan-day-actions"><button type="button" className="secondary" aria-label={`Add ${t.title} to My Day`} onClick={() => my.pick([t], true)}>Add to My Day</button>
          <button type="button" className="quiet" aria-label={`Not now: ${t.title}`} onClick={() => putAside(t.id)}>Not now</button></span>
      </li>)}</ul>
      {carried.tasks.length > 1 && <p><button type="button" className="quiet" onClick={() => my.pick(carried.tasks, true)}>Add all {formatNumber(carried.tasks.length)} to My Day</button></p>}
    </>}
  </details></>;
}
