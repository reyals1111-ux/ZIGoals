'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {forecastWords, paceForecast, privateGoalPoints, type Forecast} from '../../lib/goal-forecast';
import {privateGoalSummary} from '../../lib/goal-summary';
import type {MarketQuote} from '../../lib/market-quotes';
import type {Platform} from '../../lib/positions';
import {SectionHeading} from '../ui/section-heading';
import {formatDay} from './format';
import './goals.css';

const ORDER: Record<Forecast['state'], number> = {estimate: 0, reached: 1, 'no-pace': 2, 'not-enough': 3};

/**
 * Today's pace forecasts (Session AA-Cloud Part 8): G1's estimate for each active tracked goal with a target, from the
 * goal's own recorded progress, the nearest dates first. Each line says it is an estimate; a goal without enough
 * history says so and is never given a date.
 */
export function PaceForecastsCard({platform, quotes, now, today}: {platform: Platform; quotes: readonly MarketQuote[]; now: number; today: string}) {
  const rows = useMemo(() => platform.goals.filter(g => g.status === 'active' && g.type !== 'PROJECT').flatMap(goal => {
    const summary = privateGoalSummary(platform, goal, quotes, now), current = Number(summary.current), target = Number(summary.target);
    if (summary.progressBound === 'unavailable' || !Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return [];
    const forecast = paceForecast(privateGoalPoints(goal, platform.contributions ?? [], current, today), current, target, today);
    return [{id: goal.id, name: goal.name, href: summary.href, forecast, words: forecastWords(forecast, formatDay)}];
  }).sort((a, b) => ORDER[a.forecast.state] - ORDER[b.forecast.state] || (a.forecast.date ?? '').localeCompare(b.forecast.date ?? '')).slice(0, 4), [platform, quotes, now, today]);
  return <section className="panel pace-forecasts" aria-labelledby="pace-forecasts-title">
    <SectionHeading id="pace-forecasts-title" eyebrow="Goals · estimates from your own pace" title="Pace forecasts" level={3} action={<Link className="text-link" href="/app/goals">All goals →</Link>} />
    {rows.length ? <ul className="pace-list">{rows.map(r => <li key={r.id} data-state={r.forecast.state}>
      <Link href={r.href}>{r.name}</Link>
      <strong>{r.words.headline}</strong>
      {r.forecast.state === 'estimate' && r.forecast.earliest && r.forecast.latest && r.forecast.earliest !== r.forecast.latest && <small>Between {formatDay(r.forecast.earliest)} and {formatDay(r.forecast.latest)}</small>}
    </li>)}</ul> : <div className="aa-empty"><h4>No forecasts yet.</h4><p>A goal with a target and a few recorded steps gets an estimated date here.</p><Link className="secondary" href="/app/goals/new">Create a goal</Link></div>}
    <p className="fine">Estimates from your pace so far, not promises.</p>
  </section>;
}
