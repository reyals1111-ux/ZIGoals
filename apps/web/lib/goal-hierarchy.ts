import Decimal from 'decimal.js';
import type {GoalSummary} from './goal-summary';
import {liveParent, type GoalExtras} from './goal-extras/store';

/**
 * G5, goal hierarchy (Session AA-Cloud Part 2): a parent's progress from its sub-goals. When every sub-goal counts in the
 * parent's own unit with an exact value, the parent shows their sum against its own target; otherwise it says how many
 * sub-goals are done ("3 of 5 sub-goals done"). Nothing is converted between currencies or units, and an "at least"
 * or unknown value never counts as exact.
 */
export type RollUp = {kind: 'sum'; current: string; target: string; currency: string; share: number} | {kind: 'count'; done: number; total: number};
const exact = (g: GoalSummary) => g.progressBound === undefined && /^-?\d+(\.\d+)?$/.test(g.current);
export function rollUp(parent: Pick<GoalSummary, 'currency' | 'target'>, children: readonly GoalSummary[]): RollUp | null {
  if (!children.length) return null;
  if (parent.target && children.every(c => c.currency === parent.currency && exact(c))) {
    const sum = children.reduce((t, c) => t.plus(c.current), new Decimal(0)), target = new Decimal(parent.target);
    if (target.gt(0)) return {kind: 'sum', current: sum.toFixed(), target: target.toFixed(), currency: parent.currency, share: Math.min(1, Math.max(0, sum.div(target).toNumber()))};
  }
  return {kind: 'count', done: children.filter(c => c.status === 'completed').length, total: children.length};
}
export const rollUpWords = (r: RollUp, money: (value: string, currency: string) => string) => r.kind === 'sum'
  ? `${money(r.current, r.currency)} of ${money(r.target, r.currency)} from its sub-goals`
  : `${r.done} of ${r.total} sub-goal${r.total === 1 ? '' : 's'} done`;

export type TreeNode = {key: string; children: TreeNode[]};
/** The goals as a tree (top goals first, in the order given); a sub-goal whose parent is not shown is a top goal. */
export function goalTree(keys: readonly string[], extras: GoalExtras): TreeNode[] {
  const live = new Set(keys), nodes = new Map(keys.map(k => [k, {key: k, children: [] as TreeNode[]}]));
  const roots: TreeNode[] = [];
  for (const k of keys) {
    const parent = liveParent(extras, k, live);
    if (parent && nodes.has(parent)) nodes.get(parent)!.children.push(nodes.get(k)!); else roots.push(nodes.get(k)!);
  }
  return roots;
}
