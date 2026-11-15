'use client';
import Link from 'next/link';
import {useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import type {Habit} from '../../lib/habits';
import {firstHabitDay, habitOnDayWords, habitsOnDay, perfectDay, perfectDayWords, perfectMonth, perfectRun, shiftMonth} from '../../lib/habits-extras/perfect-days';
import {formatDateLong, formatMonth, formatNumber, formatWeekday} from '../../lib/visual-format';
import {addLocalDays} from '../../lib/local-date';
import {plural} from '../../lib/plural';
import './perfect-days.css';

// The column headings, Monday first, in the display locale (2 Nov 2026 is a Monday).
const WEEK = Array.from({length: 7}, (_, i) => addLocalDays('2026-11-02', i));

/**
 * Session AO (C-DVG-19, AL-COMPETITOR-GAP-087): Perfect days. Today's count of due habits done, the current run, and every
 * past day month by month (perfect, partly, no record, nothing due), each in words, not colour alone. Read from Habits' own
 * records (lib/habits-extras/perfect-days.ts); nothing is stored and nothing is written by looking. A day's habits link to
 * that habit's check-in for that day (its own page, History open on the day), where Habits' own rules and Undo apply.
 */
export default function PerfectDays({habits, today}: {habits: readonly Habit[]; today: string}) {
  const thisMonth = today.slice(0, 7), first = firstHabitDay(habits) ?? today, firstMonth = first.slice(0, 7);
  const [month, setMonth] = useState(thisMonth), [selected, setSelected] = useState(today);
  const now = perfectDay(habits, today, today), run = perfectRun(habits, today), view = perfectMonth(habits, month, today);
  const monthName = formatMonth(`${month}-01`);
  const pick = perfectDay(habits, selected, today), pickWords = perfectDayWords(pick);
  const pickHabits = habitsOnDay(habits, selected, today), counted = pickHabits.filter(h => h.state !== 'rest'), rest = pickHabits.filter(h => h.state === 'rest' && h.status !== 'archived');
  const go = (by: number) => { const next = shiftMonth(month, by); setMonth(next); setSelected(next === thisMonth ? today : `${next}-01` < first ? first : `${next}-01`); };
  return <section className="panel habit-perfect" aria-labelledby="habit-perfect-title">
    <div className="habit-section-heading"><div><p className="eyebrow">Every habit due, done</p><h2 id="habit-perfect-title"><NebulaFlow identity="habit-perfect-title">Perfect days</NebulaFlow></h2></div></div>
    <p className="habit-perfect-today" data-kind={now.kind}><strong>Today:</strong> {now.kind === 'nothing-due' ? 'nothing is due.' : `${formatNumber(now.done)} of ${formatNumber(now.due)} due ${plural(now.due, 'habit')} done${now.kind === 'perfect' ? ', a perfect day.' : '.'}`}</p>
    <p className="habit-perfect-facts"><span>Current run: <strong>{formatNumber(run)} perfect {plural(run, 'day')}</strong></span><span>Perfect days in {monthName}: <strong>{formatNumber(view.perfect)}</strong>{view.dueDays ? ` of ${formatNumber(view.dueDays)} with habits due` : ''}</span></p>
    <div className="habit-perfect-nav"><button type="button" className="quiet" aria-label="Previous month" disabled={month <= firstMonth} onClick={() => go(-1)}>←</button><strong aria-live="polite">{monthName}</strong><button type="button" className="quiet" aria-label="Next month" disabled={month >= thisMonth} onClick={() => go(1)}>→</button></div>
    {/* Scrolls sideways only on the narrowest screens; then the keyboard can reach it (axe scrollable-region-focusable). */}<div className="habit-perfect-scroll" role="region" aria-label="Perfect days calendar" tabIndex={0}><table className="habit-perfect-grid">
      <caption className="sr-only">Perfect days, {monthName}. Choose a day to see its habits.</caption>
      <thead><tr>{WEEK.map(d => <th key={d} scope="col">{formatWeekday(d)}</th>)}</tr></thead>
      <tbody>{view.weeks.map(week => <tr key={week.find(Boolean)!.date}>{week.map((day, i) => {
        if (!day) return <td key={`pad-${i}`} />;
        const words = perfectDayWords(day), label = `${formatDateLong(day.date)}${day.isToday ? ' (today)' : ''}: ${words.text}`;
        return <td key={day.date}><button type="button" className="habit-perfect-day" data-kind={day.kind} data-today={day.isToday || undefined} aria-pressed={selected === day.date} aria-label={label} disabled={day.kind === 'ahead'} onClick={() => setSelected(day.date)}>
          <span className="habit-perfect-date">{Number(day.date.slice(8))}</span>{words.mark && <span className="habit-perfect-mark" aria-hidden="true">{words.mark}</span>}
        </button></td>;
      })}</tr>)}</tbody>
    </table></div>
    <p className="habit-perfect-legend"><span><b>All</b> perfect: every due habit done</span><span><b>2/3</b> partly: 2 of 3 done</span><span><b>None</b> due, nothing logged</span><span><b>Off</b> nothing due</span></p>
    <div className="habit-perfect-detail" aria-live="polite">
      <h3>{formatDateLong(selected)}{pick.isToday ? ' · today' : ''}</h3>
      <p>{pickWords.text}.</p>
      {counted.length > 0 && <ul>{counted.map(h => <li key={h.id} data-state={h.state}><span><strong>{h.title}</strong> · {habitOnDayWords(h, pick.isToday)}</span><Link className="text-link" href={`/app/habits?habit=${encodeURIComponent(h.id)}&date=${selected}`} aria-label={`Open the check-in for ${h.title} on ${formatDateLong(selected)}`}>Open check-in</Link></li>)}</ul>}
      {rest.length > 0 && <p className="fine">Not counted that day: {rest.map(h => `${h.title} (${habitOnDayWords(h, pick.isToday).toLowerCase()})`).join(', ')}.</p>}
    </div>
    <p className="fine">A perfect day has every habit due that day done. Skipped and paused habits, days before a habit started and days with nothing due are not counted as missed; an unfinished today does not end the run. Read from your check-ins; nothing is saved here.</p>
  </section>;
}
