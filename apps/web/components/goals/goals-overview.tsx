'use client';
import Link from 'next/link';
import {useState} from 'react';
import {BUILT_IN_AREAS} from '../../lib/goal-extras/store';
import './goal-tree.css';
import type {GoalSummary} from '../../lib/goal-summary';
import type {AverageGoal} from '../../lib/average-goals/store';
import type {GoalExtras} from '../../lib/goal-extras/store';
import {goalTree, rollUp, rollUpWords, type TreeNode} from '../../lib/goal-hierarchy';
import {formatGoalAmount} from '../../lib/goal-summary';
import {ProgressRing} from '../platform/financial-ui';
import {progressPresentation} from '../../lib/visual-format';
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

/**
 * G5's tree, redrawn (Session AB-Design, owner request 16): top goals with their sub-goals under them on nebula
 * connectors, each node with its progress ring, its roll-up and its life area's colour; phones get Fit / − / + so a wide
 * tree stays readable (a scale on the canvas, never a second layout).
 */
export function GoalTreeView({goals, extras}: {goals: readonly GoalSummary[]; extras: GoalExtras}) {
  const byKey = new Map(goals.map(g => [g.key, g]));
  const tree = goalTree(goals.map(g => g.key), extras);
  const [zoom, setZoom] = useState(1);
  const areaOf = (key: string) => { const id = extras.goals[key]?.area; if (!id) return null; return extras.areas.find(a => a.id === id) ?? BUILT_IN_AREAS.find(a => a.id === id) ?? null; };
  const row = (node: TreeNode, depth: number): React.ReactNode => {
    const g = byKey.get(node.key)!, kids = node.children.map(c => byKey.get(c.key)!).filter(Boolean), area = areaOf(node.key);
    const r = kids.length ? rollUp(g, kids) : null;
    return <li key={node.key} data-depth={depth} style={area ? {'--area-color': area.color} as React.CSSProperties : undefined}>
      <Link href={g.href} className="goal-tree-node" data-done={g.status === 'completed' || undefined}>
        <ProgressRing percent={g.progressBound === 'unavailable' ? null : g.progressPct} size={depth ? 44 : 56} label={`${g.name} progress`} complete={g.status === 'completed'} identity={`tree-${g.key}`} bound={g.progressBound} />
        <span className="goal-tree-text"><strong>{g.name}</strong><small>{r ? rollUpWords(r, (v, c) => formatGoalAmount(v, c)) : g.status === 'completed' ? 'Finished' : g.progressBound === 'unavailable' ? 'Progress unknown' : `${progressPresentation(g.progressPct)?.label ?? Math.floor(Number(g.progressPct))}% of the way`}</small></span>
        {area && <span className="goal-tree-area"><i aria-hidden="true"/>{area.label}</span>}
        {kids.length > 0 && <span className="goal-tree-count" aria-label={`${kids.length} sub-goals`}>{kids.length}</span>}
      </Link>
      {node.children.length > 0 && <ul>{node.children.map(c => row(c, depth + 1))}</ul>}
    </li>;
  };
  return <section className="panel goals-tree" aria-label="Goals as a tree">
    <div className="goal-tree-tools" role="group" aria-label="Tree size">
      <button type="button" className="quiet" aria-label="Smaller" onClick={() => setZoom(z => Math.max(.5, Math.round((z - .1) * 10) / 10))}>−</button>
      <button type="button" className="quiet" aria-pressed={zoom === 1} onClick={() => setZoom(1)}>Fit</button>
      <button type="button" className="quiet" aria-label="Larger" onClick={() => setZoom(z => Math.min(1.6, Math.round((z + .1) * 10) / 10))}>+</button>
    </div>
    {/* Phase 2, Part 7 (owner request 16): the tree grows from one root — "Your goals" — down a trunk, each goal on a
        curved branch, sub-goals on their own branches below; the rows keep their links, rings and area colours. */}
    <div className="goal-tree-canvas" style={{'--tree-zoom': zoom} as React.CSSProperties}>
      <p className="goal-tree-root"><span className="goal-tree-root-mark" aria-hidden="true">✦</span><strong>Your goals</strong><small>{tree.length} {tree.length === 1 ? 'destination' : 'destinations'}{goals.length > tree.length ? ` · ${goals.length - tree.length} sub-goals` : ''}</small></p>
      <ul className="goal-tree is-page">{tree.map(n => row(n, 0))}</ul>
    </div>
    {tree.every(n => !n.children.length) && <p className="fine">No sub-goals yet. On a goal’s page, choose a bigger goal under “Part of a bigger goal” (three levels at most: year, quarter, month).</p>}
  </section>;
}
