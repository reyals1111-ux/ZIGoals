'use client';
import {Suspense, lazy, type ComponentProps, type ComponentType, type ReactNode} from 'react';

/**
 * Session AA-Cloud weights (scripts/weight-budgets.json, never raised): Goals' new sections load after the page itself,
 * each behind a skeleton the size of a card, so the first screen (the header, the figures and the cards) costs what it
 * did on main. The consistency keeper renders nothing; it loads with them and tidies extras in the background.
 */
function deferred<P extends object>(load: () => Promise<ComponentType<P>>, skeleton: boolean | ReactNode = true) {
  const Lazy = lazy(() => load().then(Component => ({default: Component})));
  return function Deferred(props: P) {
    // A layout region's attributes go on the skeleton too, so the card keeps its place while it loads.
    const layout = Object.fromEntries(Object.entries(props).filter(([k]) => k.startsWith('data-layout-')));
    return <Suspense fallback={skeleton === true ? <div className="aa-skeleton" aria-hidden="true" {...layout}><i /><i /><i /></div> : skeleton || null}><Lazy {...(props as ComponentProps<typeof Lazy>)} /></Suspense>;
  };
}
export const LazyGoalsAltView = deferred(() => import('./goals-sections').then(m => m.GoalsAltView));
export const LazyLifeBalanceCard = deferred(() => import('./life-balance-card').then(m => m.LifeBalanceCard));
export const LazyAchievementsHall = deferred(() => import('./achievements-hall').then(m => m.AchievementsHall));
export const LazyTemplateTeaser = deferred(() => import('./template-library').then(m => m.TemplateTeaser));
export const LazyAverageGoalCard = deferred(() => import('./average-goals').then(m => m.AverageGoalCard));
// The figures keep their own size while they load, so the cards under them never move.
export const LazyGoalsFigures = deferred(() => import('./goals-sections').then(m => m.FiguresSection), <div className="goals-figures is-placeholder" aria-hidden="true"><div /><div /><div /><div /></div>);
export const LazyExtrasKeeper = deferred(() => import('./extras-keeper').then(m => m.ExtrasKeeper), false);
