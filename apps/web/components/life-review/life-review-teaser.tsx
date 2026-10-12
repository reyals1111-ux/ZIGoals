'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {Platform} from '../../lib/positions';
import type {GoalSummary} from '../../lib/goal-summary';
import {lifeReview, reviewPeriod} from '../../lib/life-review/engine';
import {wealthOverview} from '../../lib/wealth';
import {useAverageGoals} from '../goals/use-average-goals';
import {useGoalExtras} from '../goals/use-goal-extras';
import {formatDay} from '../goals/format';
import './life-review.css';

/** Today's door to the Life review (Session AA-Cloud Part 5): this week's highlights, loaded after Today itself. */
export function LifeReviewTeaser({habits, health, platform, goals, today}: {habits: HabitData; health: HealthData; platform: Platform; goals: readonly GoalSummary[]; today: string}) {
  const averages = useAverageGoals(), extras = useGoalExtras(), [now] = useState(() => Date.now());
  const window = reviewPeriod('week', today);
  const review = useMemo(() => averages.loaded && extras.loaded ? lifeReview({window, habits, health, platform, goals: goals.map(g => ({key: g.key, id: g.id, name: g.name, href: g.href, status: g.status})), averages: averages.unreadable ? [] : averages.data.goals, extras: extras.data, history: wealthOverview(platform, now).history, today}) : null, [averages.loaded, averages.unreadable, averages.data, extras.loaded, extras.data, window, habits, health, platform, goals, today, now]);
  return <section className="panel for-you-card life-review-teaser" aria-labelledby="life-review-teaser-title">
    <p className="eyebrow">Life review · {formatDay(window.start)} – {formatDay(window.end)}</p>
    <h2 id="life-review-teaser-title">Your week at a glance.</h2>
    {review?.highlights.length ? <ul className="life-list">{review.highlights.slice(0, 3).map(h => <li key={h}>{h}</li>)}</ul> : <p className="fine">Your review fills as you check in, log and contribute.</p>}
    <div className="actions"><Link className="secondary" href="/app/review">Open your life review →</Link></div>
  </section>;
}
