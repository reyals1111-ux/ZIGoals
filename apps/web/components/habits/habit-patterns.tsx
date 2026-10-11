'use client';
import {type Habit} from '../../lib/habits';
import {byWeek, byWeekday, usualSaveTime, WEEKDAY_NAMES, WEEKS} from '../../lib/habits-v2/stats';
import {formatDate} from '../../lib/visual-format';

/**
 * A habit's patterns (Session W Part 10), inside its "Consistency & trends": days done by weekday and by week over the
 * last 12 weeks (a bar per week with its numbers in a table), and when check-ins are usually saved. Plain counts, no
 * score; rest days and unscheduled days count for nothing either way.
 */
const pct = (done: number, scheduled: number) => scheduled ? Math.round(done / scheduled * 100) : null;
export function HabitPatterns({habit, today, zone}: {habit: Habit; today: string; zone: string}) {
  const days = byWeekday(habit, today), weeks = byWeek(habit, today), usual = usualSaveTime(habit, zone, today);
  if (!days.some(d => d.scheduled) && !usual) return <p className="fine">Patterns appear after a few scheduled days.</p>;
  return <div className="habit-patterns">
    <h3>By weekday · last {WEEKS} weeks</h3>
    <ul className="habit-weekdays">{days.map(d => <li key={d.weekday}><span>{WEEKDAY_NAMES[d.weekday]!.slice(0, 3)}</span><strong>{d.scheduled ? `${d.done} of ${d.scheduled}` : '—'}</strong></li>)}</ul>
    <h3>By week</h3>
    <div className="habit-weeks" role="img" aria-label={`Days done per week, last ${WEEKS} weeks: ${weeks.map(w => `${w.weekStart}: ${w.scheduled ? `${w.done} of ${w.scheduled}` : 'none scheduled'}`).join('; ')}`}>
      {weeks.map(w => { const p = pct(w.done, w.scheduled); return <span key={w.weekStart} title={`Week of ${w.weekStart}: ${w.scheduled ? `${w.done} of ${w.scheduled}` : 'none scheduled'}`}><i style={{height: `${p ?? 0}%`}} data-empty={w.scheduled ? undefined : ''} /></span>; })}
    </div>
    <details className="habit-weeks-table"><summary>The weeks as a table</summary><table><caption>Days done of days scheduled, by week</caption><thead><tr><th scope="col">Week of</th><th scope="col">Done</th><th scope="col">Scheduled</th></tr></thead>
      <tbody>{weeks.map(w => <tr key={w.weekStart}><th scope="row">{formatDate(`${w.weekStart}T12:00:00`, {month: 'short', day: 'numeric'})}</th><td>{w.done}</td><td>{w.scheduled}</td></tr>)}</tbody></table></details>
    {usual && <p className="fine">Check-ins are usually saved around <strong>{usual.clock}</strong> (from when {usual.n} check-ins of the last 60 days were saved, which can be later than the habit itself).</p>}
  </div>;
}
