'use client';
import type {LayoutAttrs} from '../layout-edit';
import type {GoalSummary} from '../../lib/goal-summary';
import type {AverageGoal} from '../../lib/average-goals/store';
import {averageSummary} from './average-summary';
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
/** The board and the tree show the filtered `goals` (Session AB-Design: the figures are their own block and the switch sits in the toolbar). */
export function GoalsAltView({view, goals, averages, ...layout}: Props & LayoutAttrs & {view: 'board' | 'tree'}) {
  const extras = useGoalExtras(), health = useHealth(), today = useLocalToday();
  const all = [...goals, ...averages.map(g => averageSummary(g, health.loaded && !health.error ? health.data : undefined, today))];
  return <div className="goals-alt-view" {...layout}>
    {view === 'board' ? <VisionBoard goals={all} extras={extras.data} /> : <GoalTreeView goals={all} extras={extras.data} />}
  </div>;
}
