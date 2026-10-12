'use client';
import type {ReactNode} from 'react';
import type {LayoutAttrs} from '../layout-edit';
import type {GoalSummary} from '../../lib/goal-summary';
import type {HealthData} from '../../lib/health';
import type {AverageGoal} from '../../lib/average-goals/store';
import {averageProgress} from '../../lib/average-goals/progress';
import {useHealth} from '../health/use-health';
import {useLocalToday} from '../use-local-today';
import {GoalTreeView, GoalsFigures} from './goals-overview';
import {VisionBoard} from './vision-board';
import {useGoalExtras} from './use-goal-extras';

/**
 * Goals' figures, vision board and tree with the extras they read (Session AA-Cloud Part 2), in one module that loads
 * after the page (weights): the page itself never reads the goal extras.
 */
type Props = {goals: readonly GoalSummary[]; averages: readonly AverageGoal[]};
export function FiguresSection({goals, averages}: Props) {
  const extras = useGoalExtras();
  return <GoalsFigures goals={goals} averages={averages} extras={extras.data} />;
}
export function GoalsAltView({view, goals, averages, switcher, ...layout}: Props & LayoutAttrs & {view: 'board' | 'tree'; switcher: ReactNode}) {
  const extras = useGoalExtras(), health = useHealth(), today = useLocalToday();
  const all = [...goals, ...averages.map(g => averageSummary(g, health.loaded && !health.error ? health.data : undefined, today))];
  return <div className="goals-alt-view" {...layout}>
    <GoalsFigures goals={goals} averages={averages} extras={extras.data} />
    {switcher}
    {view === 'board' ? <VisionBoard goals={all} extras={extras.data} /> : <GoalTreeView goals={all} extras={extras.data} />}
  </div>;
}
/** An average goal as the board and the tree show it (G8): its share of the target, never an invented amount. */
function averageSummary(g: AverageGoal, health: HealthData | undefined, today: string) {
  const p = averageProgress(g, health, today);
  return {key: `average:${g.id}`, id: g.id, href: `/app/goals/average/${g.id}`, name: g.name, type: 'AVERAGE', source: 'Kept on this device', status: g.status, scene: 'aurora', current: String(p.average ?? 0), currency: g.unit, progressPct: String((p.share ?? 0) * 100), ...(p.share === null ? {progressBound: 'unavailable' as const} : {}), fundingHealth: '', requiresReview: false, metadata: []} as GoalSummary;
}
