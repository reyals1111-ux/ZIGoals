'use client';
import {Suspense, lazy, useId, useState} from 'react';
import type {MoneyEntry} from '../../../../lib/money-log/schema';
import {ShowcaseTag} from '../../../ui/showcase-tag';
import './insights.css';

/**
 * Session AP (owner-approved, Wealth → Spending): "Your money over time", from the money log only. Six views, each its
 * own chunk loaded when the person opens it (Wealth is near its weight budget): month by month, categories over a year,
 * top payees, your usual pace, age of money and tags. Each currency on its own, never converted; a month without records
 * is a gap, never a zero; comparisons of records, never forecasts. No motion.
 */
const VIEWS = {
  flow: {label: 'Month by month', load: lazy(() => import('./cash-flow-view'))},
  trend: {label: 'Categories over a year', load: lazy(() => import('./category-trend-view'))},
  payees: {label: 'Top payees', load: lazy(() => import('./top-payees-view'))},
  pace: {label: 'Your usual pace', load: lazy(() => import('./pace-view'))},
  age: {label: 'Age of money', load: lazy(() => import('./age-view'))},
  tags: {label: 'Tags', load: lazy(() => import('./tags-view'))},
} as const;
type View = keyof typeof VIEWS;
export type InsightProps = {entries: readonly MoneyEntry[]; today: string; showcase?: boolean};

export default function SpendingInsights({entries, today, showcase = false}: InsightProps) {
  const id = useId(), [view, setView] = useState<View | null>(null), Chosen = view ? VIEWS[view].load : null;
  return <section className="money-insights" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>Your money over time</h3>
    <p className="fine">From your own entries, each currency on its own. A month with nothing logged is shown as a gap, not as zero.</p>
    <div className="money-insights-views" role="group" aria-label="Show">
      {(Object.keys(VIEWS) as View[]).map(v => <button key={v} type="button" className="quiet" aria-pressed={view === v} aria-controls={`${id}-panel`} onClick={() => setView(view === v ? null : v)}>{VIEWS[v].label}</button>)}
    </div>
    <div id={`${id}-panel`} className="money-insights-panel">
      {Chosen && <>
        {showcase && <p className="fine"><ShowcaseTag/> Fictional Showcase entries.</p>}
        <Suspense fallback={<p className="fine" aria-busy="true">Loading…</p>}><Chosen entries={entries} today={today}/></Suspense>
      </>}
    </div>
  </section>;
}
