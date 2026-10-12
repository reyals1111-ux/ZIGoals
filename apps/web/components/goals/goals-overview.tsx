'use client';
import Link from 'next/link';
import type {GoalSummary} from '../../lib/goal-summary';
import type {AverageGoal} from '../../lib/average-goals/store';
import type {GoalExtras} from '../../lib/goal-extras/store';
import {goalTree, rollUp, rollUpWords, type TreeNode} from '../../lib/goal-hierarchy';
import {formatGoalAmount} from '../../lib/goal-summary';
import {ProgressRing} from '../platform/financial-ui';
import './goals.css';

export type {GoalsView} from './goals-view-switch';

/** Goals' key figures under the header (Session AA-Cloud Part 2): active, finished, with a plan, sub-goals. */
export function GoalsFigures({goals, averages, extras}: {goals: readonly GoalSummary[]; averages: readonly AverageGoal[]; extras: GoalExtras}) {
  const active = goals.filter(g => g.status === 'active').length + averages.filter(a => a.status === 'active').length;
  const finished = goals.filter(g => g.status === 'completed').length + averages.filter(a => a.status === 'completed').length;
  const planned = Object.values(extras.goals).filter(e => e.why || e.ifThen).length;
  const areas = new Set(Object.values(extras.goals).map(e => e.area).filter(Boolean)).size;
  const figures: [string, number, string][] = [['Active', active, 'goals in motion'], ['Finished', finished, 'on the Hall of achievements'], ['With a plan', planned, 'why and if-then written'], ['Life areas', areas, 'with at least one goal']];
  return <dl className="goals-figures" aria-label="Your goals at a glance">{figures.map(([label, n, hint]) => <div key={label}><dt>{label}</dt><dd><strong>{n}</strong><small>{hint}</small></dd></div>)}</dl>;
}

/** G5's tree: top goals with their sub-goals indented under them, each parent with its roll-up. */
export function GoalTreeView({goals, extras}: {goals: readonly GoalSummary[]; extras: GoalExtras}) {
  const byKey = new Map(goals.map(g => [g.key, g]));
  const tree = goalTree(goals.map(g => g.key), extras);
  const row = (node: TreeNode, depth: number): React.ReactNode => {
    const g = byKey.get(node.key)!, kids = node.children.map(c => byKey.get(c.key)!).filter(Boolean);
    const r = kids.length ? rollUp(g, kids) : null;
    return <li key={node.key} data-depth={depth}>
      <Link href={g.href} className="goal-tree-row">
        <ProgressRing percent={g.progressBound === 'unavailable' ? null : g.progressPct} size={48} label={`${g.name} progress`} complete={g.status === 'completed'} identity={`tree-${g.key}`} bound={g.progressBound} />
        <span><strong>{g.name}</strong><small>{r ? rollUpWords(r, (v, c) => formatGoalAmount(v, c)) : g.status === 'completed' ? 'Finished' : g.progressBound === 'unavailable' ? 'Progress unknown' : `${Math.floor(Number(g.progressPct))}% of the way`}</small></span>
      </Link>
      {node.children.length > 0 && <ul>{node.children.map(c => row(c, depth + 1))}</ul>}
    </li>;
  };
  return <section className="panel goals-tree" aria-label="Goals as a tree">
    <ul className="goal-tree is-page">{tree.map(n => row(n, 0))}</ul>
    {tree.every(n => !n.children.length) && <p className="fine">No sub-goals yet. On a goal’s page, choose a bigger goal under “Part of a bigger goal” (three levels at most: year, quarter, month).</p>}
  </section>;
}
