'use client';
import {useMemo, useState} from 'react';
import type {Habit} from '../../lib/habits';
import {countText} from '../../lib/plural';
import {formatDate} from '../../lib/visual-format';
import {dayStreak, habitsByStreak, perfectWeeks, periodCounts, PERIODS, weeklyCounts, type Period, type ReportRow} from './report';
import './activity-report.css';

/**
 * Session AL third pass (GAP-124, GAP-122, GAP-125): Activity's report. The period chips change only this card; the list
 * below keeps its own filters. Every figure is a count of records already listed on this page.
 */
const WORDS: Record<string, [string, string]> = {GOAL: ['goal step', 'goal steps'], WEALTH: ['wealth record', 'wealth records'], HABIT: ['habit record', 'habit records'], HEALTH: ['health log', 'health logs'], TASK: ['task update', 'task updates']};
const ORDER = ['GOAL', 'HABIT', 'HEALTH', 'WEALTH', 'TASK'];
const UNIT: Record<string, [string, string]> = {days: ['day', 'days'], weeks: ['week', 'weeks'], months: ['month', 'months'], years: ['year', 'years']};

export function ActivityReport({rows, habits, today}: {rows: readonly ReportRow[]; habits: readonly Habit[]; today: string}) {
 const [period, setPeriod] = useState<Period>('week');
 const counts = periodCounts(rows, period, today);
 const said = ORDER.filter(c => counts[c]).map(c => countText(counts[c]!, WORDS[c]![0], WORDS[c]![1]));
 const goalDays = useMemo(() => rows.filter(r => r.category === 'GOAL').map(r => r.dayKey), [rows]);
 const streak = dayStreak(new Set(goalDays), today), weeks = weeklyCounts(goalDays, today, 12), most = Math.max(1, ...weeks.map(w => w.count));
 const ranked = useMemo(() => habitsByStreak(habits, today), [habits, today]);
 const perfect = useMemo(() => perfectWeeks(habits, today, 12), [habits, today]);
 const label = PERIODS.find(p => p.id === period)!.label;
 return <section className="activity-report" aria-labelledby="activity-report-title">
  <div className="activity-report-head"><h3 id="activity-report-title">Your report</h3>
   <div className="activity-report-periods" role="group" aria-label="Report period">{PERIODS.map(p => <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)}>{p.label}</button>)}</div></div>
  <p className="activity-report-summary" aria-live="polite"><strong>{label}:</strong> {said.length ? said.join(' · ') : 'nothing recorded yet.'}</p>
  <div className="activity-report-grid">
   <div><h4>Goal days in a row</h4><p className="activity-report-figure">{countText(streak, 'day', 'days')}</p><p className="activity-report-note">A day counts when you take at least one goal step.</p></div>
   <div><h4>Goal steps, last 12 weeks</h4>
    <div className="activity-report-bars" aria-hidden="true">{weeks.map(w => <span key={w.weekStart} title={`Week of ${formatDate(w.weekStart)}: ${countText(w.count, 'goal step', 'goal steps')}`}><i style={{height: `${Math.max(w.count ? 8 : 2, Math.round(w.count / most * 100))}%`}} data-empty={w.count ? undefined : true}/></span>)}</div>
    <table className="sr-only"><caption>Goal steps per week, last 12 weeks</caption><thead><tr><th scope="col">Week of</th><th scope="col">Goal steps</th></tr></thead><tbody>{weeks.map(w => <tr key={w.weekStart}><td>{formatDate(w.weekStart)}</td><td>{w.count}</td></tr>)}</tbody></table>
    <p className="activity-report-note">{countText(weeks.reduce((n, w) => n + w.count, 0), 'goal step', 'goal steps')} in 12 weeks; the last bar is this week so far.</p></div>
   <div><h4>Habits by streak</h4>{ranked.length ? <ol className="activity-report-list">{ranked.map(h => <li key={h.id}><span>{h.title}</span><strong>{countText(h.streak, UNIT[h.unit]?.[0] ?? h.unit, UNIT[h.unit]?.[1] ?? h.unit)}</strong></li>)}</ol> : <p className="activity-report-note">No streak running yet. A check-in on a due day starts one.</p>}</div>
   <div><h4>Perfect weeks</h4><p className="activity-report-figure">{perfect.total} of the last {perfect.weeks} weeks</p><p className="activity-report-note">Every due habit check-in done that week. Skipped days never count against you.</p>{/* Session AP (AO D17 minor): the per-area list is named, and each count says what it counts */}{perfect.byCategory.length > 1 && <ul className="activity-report-list" aria-label="Perfect weeks by area">{perfect.byCategory.map(c => <li key={c.category}><span>{c.category}</span><strong aria-label={`${c.perfect} perfect ${c.perfect === 1 ? 'week' : 'weeks'}`}>{c.perfect}</strong></li>)}</ul>}</div>
  </div>
 </section>;
}
