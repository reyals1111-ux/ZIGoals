'use client';
import {useMemo} from 'react';
import {usePlatform} from '../platform/use-platform';
import {goalKeyOf} from '../../lib/tasks/engine';

/**
 * Session AK (T1): the goals a task can serve (this device's open goals), by the key a task keeps (`private:<id>`), and
 * every goal's name by key so a linked task can name its goal (a goal removed later is simply not named).
 * Session AK G2 (RELEASE_REVIEW_2 R2-17): "open" is the active goals only — a finished goal (`completed`) or a closed one
 * is no longer offered for a new task; a task already linked to one keeps its name (byKey holds every goal).
 */
/** Session AL (LS-035, P-LS-43): `closed` marks a goal that is no longer active, so a task linked to it says "(closed)". */
export type GoalOption = {key: string; id: string; name: string; href: string; closed?: 'closed' | 'finished'};
export function useGoalOptions() {
  const platform = usePlatform();
  const all = useMemo<GoalOption[]>(() => platform.loaded && !platform.error ? platform.data.goals.map(g => ({key: goalKeyOf(g.id), id: g.id, name: g.name, href: `/app/goals/tracked/${encodeURIComponent(g.id)}`, ...(g.status !== 'active' ? {closed: g.status === 'completed' ? 'finished' as const : 'closed' as const} : {})})) : [], [platform.loaded, platform.error, platform.data.goals]);
  const open = useMemo(() => platform.loaded && !platform.error ? all.filter(o => { const g = platform.data.goals.find(x => x.id === o.id); return g?.status === 'active'; }) : [], [all, platform.loaded, platform.error, platform.data.goals]);
  const byKey = useMemo(() => new Map(all.flatMap(o => [[o.key, o], [o.id, o]] as const)), [all]);
  return {open, byKey, loaded: platform.loaded};
}
