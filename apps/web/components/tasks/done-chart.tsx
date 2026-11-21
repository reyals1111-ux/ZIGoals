'use client';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {doneByDay, doneByWeek} from '../../lib/tasks/done-chart';
import {plural} from '../../lib/plural';
import {localWeekday} from '../../lib/local-date';

/**
 * Session AV (owner follow-up 1, F-TASKS-DONE; Todoist): at the top of Completed, tasks finished per day for the last 14
 * days as small bars, the last 4 weeks in words, and the same figures as a table. No points, streak or score. Its own chunk.
 */
export default function DoneChart({log, today, doneDay}: {log: readonly {at: string}[]; today: string; doneDay: (iso: string) => string}) {
  const days = doneByDay(log, today, doneDay), weeks = doneByWeek(log, today, doneDay), top = Math.max(1, ...days.map(d => d.count));
  const total = days.reduce((n, d) => n + d.count, 0);
  return <section className="tasks-done-chart" aria-labelledby="tasks-done-chart-title">
    <h3 id="tasks-done-chart-title">Finished per day <small>{total ? `${formatNumber(total)} in the last 14 days` : 'none in the last 14 days yet'}</small></h3>
    <svg className="tasks-done-bars" viewBox="0 0 280 72" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {days.map((d, i) => { const h = d.count ? Math.max(4, Math.round(60 * d.count / top)) : 2; return <rect key={d.date} x={i * 20 + 3} y={64 - h} width={14} height={h} rx={3} className={d.date === today ? 'tasks-done-today' : undefined}/>; })}
    </svg>
    {/* Session AV (1c, q1 #6, fresh-agent review; Todoist): a weekday initial under each bar (the table says it in words). */}
    <p className="tasks-done-days" aria-hidden="true">{days.map(d => <span key={d.date} data-today={d.date === today || undefined}>{'SMTWTFS'[localWeekday(d.date)]}</span>)}</p>
    <p className="fine tasks-done-axis" aria-hidden="true"><span>{formatDate(days[0]!.date, {year: false})}</span><span>Today</span></p>
    <ul className="tasks-done-weeks" aria-label="Finished per week">{weeks.map((w, i) => <li key={w.start}><span>{i === weeks.length - 1 ? 'This week' : `Week of ${formatDate(w.start, {year: false})}`}</span> <strong>{formatNumber(w.count)}</strong></li>)}</ul>
    <details className="tasks-done-table"><summary>As a table</summary>
      <table><caption className="sr-only">Tasks finished per day, last 14 days</caption><thead><tr><th scope="col">Day</th><th scope="col">Finished</th></tr></thead>
        <tbody>{[...days].reverse().map(d => <tr key={d.date}><th scope="row">{formatDate(d.date, {weekday: true, year: false})}</th><td>{d.count} {plural(d.count, 'task')}</td></tr>)}</tbody></table>
    </details>
  </section>;
}
