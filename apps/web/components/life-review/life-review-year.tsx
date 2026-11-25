'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import type {HabitData} from '../../lib/habits';
import type {Platform} from '../../lib/positions';
import type {GoalExtras} from '../../lib/goal-extras/store';
import {areasOf} from '../../lib/goal-extras/store';
import {habitAreasFrom} from '../../lib/goal-extras/areas';
import {getAppStorage} from '../../lib/showcase-storage';
import {earliestRecord, recordYears, yearReport, yearWindow, type GoalPoint, type GoalYearRow, type HabitYearRow} from '../../lib/life-review/year';
import {formatNumber} from '../../lib/visual-format';
import {unitFor} from '../../lib/plural';
import {SectionHeading} from '../ui/section-heading';
import {formatDay} from '../goals/format';

/**
 * Session AW (X4, LEDGER #446; Strides' year report): the Life review's "This year" and "All time" — each habit's
 * check-ins done of due and its longest run, each goal from the start of the period to its end, grouped by life area.
 * Counts only, read again each time from the person's own records; nothing is stored. Its own chunk, loaded on the tap.
 */
export default function LifeReviewYear({scope, habits, platform, extras, today}: {scope: 'year' | 'all'; habits: HabitData; platform: Platform; extras: GoalExtras; today: string}) {
  const earliest = useMemo(() => earliestRecord(habits.habits, platform.goals), [habits.habits, platform.goals]);
  const years = recordYears(earliest, today), [year, setYear] = useState(years[0]!);
  const window = useMemo(() => yearWindow(scope === 'all' ? {kind: 'all'} : {kind: 'year', year}, today, earliest), [scope, year, today, earliest]);
  const report = useMemo(() => {
    let habitAreas: Record<string, string> = {};
    try { habitAreas = habitAreasFrom(getAppStorage()); } catch { /* no areas read: every habit sits under "No area yet" */ }
    const goalAreas = Object.fromEntries(Object.entries(extras.goals).map(([key, g]) => [key, g.area]));
    return yearReport({window, habits: habits.habits, platform, today, habitAreas, goalAreas, areas: areasOf(extras).map(a => ({id: a.id, label: a.label}))});
  }, [window, habits.habits, platform, today, extras]);
  const name = scope === 'all' ? 'All time' : year === Number(today.slice(0, 4)) ? 'Your year' : `Your ${year}`;
  const range = `${formatDay(window.start)} – ${formatDay(window.end)}`;
  return <div className="life-year">
    <section className="panel life-review-hero life-review-cover" aria-labelledby="life-year-title">
      <SectionHeading id="life-year-title" eyebrow={range} title={name} level={2} lede="Habits done of those due, the longest runs, and each goal from the start of this period to its end, by life area. Counts from your own records; never a grade." />
      {scope === 'year' && years.length > 1 && <label className="field life-year-pick">Year<select value={year} onChange={e => setYear(Number(e.target.value))}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>}
      {report.habits.length || report.goals.length ? <dl className="life-counts">
        <div><dt>Habit check-ins done</dt><dd>{formatNumber(report.totals.done)}</dd></div>
        <div><dt>Check-ins due</dt><dd>{formatNumber(report.totals.due)}</dd></div>
        <div><dt>Goals followed</dt><dd>{formatNumber(report.goals.length)}</dd></div>
      </dl> : <div className="aa-empty"><h3>Nothing to count yet for {scope === 'all' ? 'all time' : year}.</h3><p>Habits you check in and goals you follow fill this report: each habit&rsquo;s days done of those due and its longest run, each goal from start to end, by life area.</p><Link className="primary" href="/app/habits">Open Habits</Link></div>}
    </section>
    {report.areas.map(area => <section key={area.id ?? 'none'} className="panel life-chapter life-year-area" aria-labelledby={`life-year-area-${area.id ?? 'none'}`}>
      <SectionHeading id={`life-year-area-${area.id ?? 'none'}`} eyebrow={area.due ? `${formatNumber(area.done)} of ${formatNumber(area.due)} check-ins done` : 'Life area'} title={area.label} level={3} />
      {area.habits.length > 0 && <ul className="life-list" aria-label={`Habits in ${area.label}`}>{area.habits.map(h => <li key={h.id}><strong>{h.title}</strong><span>{habitLine(h)}</span></li>)}</ul>}
      {area.goals.length > 0 && <ul className="life-list" aria-label={`Goals in ${area.label}`}>{area.goals.map(g => <li key={g.id}><Link href={g.href}>{g.name}</Link><span>{goalLine(g, scope === 'all' ? 'started' : year === Number(today.slice(0, 4)) ? 'new this year' : `new in ${year}`)}</span></li>)}</ul>}
    </section>)}
    {report.areas.some(a => a.id === null) && <p className="fine">A habit or goal with no life area sits under &ldquo;No area yet&rdquo;. A habit&rsquo;s Details or a goal&rsquo;s page gives it one.</p>}
    <p className="fine">A skipped day counts for neither done nor due; a goal&rsquo;s start is its last counted value before the period began. Where nothing was recorded it says so, never zero. Kept nowhere: read again each time.</p>
  </div>;
}
export function habitLine(h: Pick<HabitYearRow, 'done' | 'due' | 'longest' | 'unit'>): string {
  const run = h.longest > 0 ? ` · longest run ${formatNumber(h.longest)} ${unitFor(h.longest, h.unit)}` : '';
  return h.due ? `${formatNumber(h.done)} of ${formatNumber(h.due)} done${run}` : 'Not due in this period';
}
const point = (p: GoalPoint, made: string) => p === null ? 'not recorded' : p === 'new' ? made : `${p}%`;
/** "25% → 50% of its target", "new this year → 40% of its target"; `made` names a goal begun inside the period. */
export function goalLine(g: Pick<GoalYearRow, 'start' | 'end' | 'status'>, made: string): string {
  if (g.start === null && g.end === null) return 'Progress not recorded in this period';
  return `${point(g.start, made)} → ${point(g.end, made)} of its target${g.status === 'closed' ? ' · closed' : ''}`;
}
