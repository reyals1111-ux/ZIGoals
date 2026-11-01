'use client';
import {useMemo} from 'react';
import {usePlatform} from '../platform/use-platform';
import {goalKeyOf} from '../../lib/tasks/engine';

/**
 * Session AK (T1): the goals a task can serve (this device's open goals), by the key a task keeps (`private:<id>`), and
 * every goal's name by key so a linked task can name its goal (a goal removed later is simply not named).
 */
export type GoalOption = {key: string; id: string; name: string; href: string};
export function useGoalOptions() {
  const platform = usePlatform();
  const all = useMemo<GoalOption[]>(() => platform.loaded && !platform.error ? platform.data.goals.map(g => ({key: goalKeyOf(g.id), id: g.id, name: g.name, href: `/app/goals/tracked/${encodeURIComponent(g.id)}`})) : [], [platform.loaded, platform.error, platform.data.goals]);
  const open = useMemo(() => platform.loaded && !platform.error ? all.filter(o => { const g = platform.data.goals.find(x => x.id === o.id); return g && g.status !== 'closed'; }) : [], [all, platform.loaded, platform.error, platform.data.goals]);
  const byKey = useMemo(() => new Map(all.flatMap(o => [[o.key, o], [o.id, o]] as const)), [all]);
  return {open, byKey, loaded: platform.loaded};
}
