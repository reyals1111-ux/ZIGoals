'use client';
import {Suspense, lazy, useId, useState} from 'react';
import type {MoneyEntry} from '../../../../lib/money-log/schema';
import {ShowcaseTag} from '../../../ui/showcase-tag';
import './insights.css';

/**
 * Session AP (owner-approved, Wealth → Spending): "Your money over time", from the money log only. Eight views (Session
 * AV added "This month vs last" and "Where income went"), each its
 * own chunk loaded when the person opens it (Wealth is near its weight budget): month by month, categories over a year,
 * top payees, your usual pace, age of money and tags. Each currency on its own, never converted; a month without records
 * is a gap, never a zero; comparisons of records, never forecasts. No motion.
 */
const VIEWS = {
  // Session AV (follow-up 1, F-VS-LAST): this month against last, per category.
  vsLast: {label: 'This month vs last', load: lazy(() => import('./vs-last-view'))},
  // Session AV (follow-up 1, F-INCOME-FLOW): where this month's income went.
  flow2: {label: 'Where income went', load: lazy(() => import('./income-flow-view'))},
  flow: {label: 'Month by month', load: lazy(() => import('./cash-flow-view'))},
  trend: {label: 'Categories over a year', load: lazy(() => import('./category-trend-view'))},
  payees: {label: 'Top payees', load: lazy(() => import('./top-payees-view'))},
  pace: {label: 'Your usual pace', load: lazy(() => import('./pace-view'))},
  age: {label: 'Age of money', load: lazy(() => import('./age-view'))},
  tags: {label: 'Tags', load: lazy(() => import('./tags-view'))},
  // Session AV lane 2, round 3 (money; PocketGuard, LEDGER #295): needs, wants and saving as the person's own shares of income.
  needs: {label: 'Needs, wants and saving', load: lazy(() => import('./needs-wants-view'))},
  // Session AV lane 2, round 3 (money; Simplifi, LEDGER #297): a waterfall from last month's spending total to this month's.
  changed: {label: 'What changed', load: lazy(() => import('./month-waterfall'))},
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
