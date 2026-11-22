'use client';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {doneByDay, doneByWeek, goalLine} from '../../lib/tasks/done-chart';
import {plural} from '../../lib/plural';
import {localWeekday} from '../../lib/local-date';
import {useDeviceRecord} from '../ai/use-device-record';
import {TASK_PLAN} from '../../lib/tasks/plan-record';

/**
 * Session AV (owner follow-up 1, F-TASKS-DONE; Todoist): at the top of Completed, tasks finished per day for the last 14
 * days as small bars, the last 4 weeks in words, and the same figures as a table. No points, streak or score. Its own chunk.
 */
export default function DoneChart({log, today, doneDay}: {log: readonly {at: string}[]; today: string; doneDay: (iso: string) => string}) {
  // Session AV lane 2 (minors, q1 #6 check 8): the daily goal, when one is kept, as a dashed line and in words.
  const plan = useDeviceRecord(TASK_PLAN), days = doneByDay(log, today, doneDay), weeks = doneByWeek(log, today, doneDay);
  const goal = goalLine(days, plan.loaded && !plan.unreadable ? plan.data.dailyGoal : undefined), top = goal ? goal.top : Math.max(1, ...days.map(d => d.count));
  const goalY = goal ? 64 - Math.round(60 * goal.goal / top) : 0;
  const total = days.reduce((n, d) => n + d.count, 0);
  return <section className="tasks-done-chart" aria-labelledby="tasks-done-chart-title">
    <h3 id="tasks-done-chart-title">Finished per day <small>{total ? `${formatNumber(total)} in the last 14 days` : 'none in the last 14 days yet'}</small></h3>
    <svg className="tasks-done-bars" viewBox="0 0 280 72" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {days.map((d, i) => { const h = d.count ? Math.max(4, Math.round(60 * d.count / top)) : 2; return <rect key={d.date} x={i * 20 + 3} y={64 - h} width={14} height={h} rx={3} className={d.date === today ? 'tasks-done-today' : undefined}/>; })}
      {goal && <line className="tasks-done-goal" x1={0} x2={280} y1={goalY} y2={goalY} vectorEffect="non-scaling-stroke"/>}
    </svg>
    {/* Session AV (1c, q1 #6, fresh-agent review; Todoist): a weekday initial under each bar (the table says it in words). */}
    <p className="tasks-done-days" aria-hidden="true">{days.map(d => <span key={d.date} data-today={d.date === today || undefined}>{'SMTWTFS'[localWeekday(d.date)]}</span>)}</p>
    <p className="fine tasks-done-axis" aria-hidden="true"><span>{formatDate(days[0]!.date, {year: false})}</span><span>Today</span></p>
    {goal ? <p className="fine tasks-done-goal-words" data-testid="tasks-done-goal"><span className="tasks-done-goal-key" aria-hidden="true"/>Daily goal: {formatNumber(goal.goal)} {plural(goal.goal, 'task')} · reached on {formatNumber(goal.reached)} of the last {days.length} days</p>
      : plan.loaded && !plan.unreadable && <p className="fine tasks-done-goal-words">A daily goal draws a line here: Tasks → This week → Your planning choices.</p>}
    <ul className="tasks-done-weeks" aria-label="Finished per week">{weeks.map((w, i) => <li key={w.start}><span>{i === weeks.length - 1 ? 'This week' : `Week of ${formatDate(w.start, {year: false})}`}</span> <strong>{formatNumber(w.count)}</strong></li>)}</ul>
    <details className="tasks-done-table"><summary>As a table</summary>
      <table><caption className="sr-only">Tasks finished per day, last 14 days</caption><thead><tr><th scope="col">Day</th><th scope="col">Finished</th></tr></thead>
        <tbody>{[...days].reverse().map(d => <tr key={d.date}><th scope="row">{formatDate(d.date, {weekday: true, year: false})}</th><td>{d.count} {plural(d.count, 'task')}</td></tr>)}</tbody></table>
    </details>
  </section>;
}
