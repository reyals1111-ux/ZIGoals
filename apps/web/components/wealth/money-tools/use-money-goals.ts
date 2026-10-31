'use client';
import {useMemo} from 'react';
import {usePlatform} from '../../platform/use-platform';

/** Session AK (lane M): the person's active Wealth Goals by id and name, for a rule's or a part's Goal choice. */
export type GoalChoice = {id: string; name: string};
export function useMoneyGoals(): {goals: GoalChoice[]; nameOf: (id: string) => string | undefined} {
  const platform = usePlatform();
  const goals = useMemo(() => platform.loaded ? platform.data.goals.filter(g => g.status === 'active').map(g => ({id: g.id, name: g.name})) : [], [platform.loaded, platform.data.goals]);
  return useMemo(() => ({goals, nameOf: (id: string) => platform.data.goals.find(g => g.id === id)?.name}), [goals, platform.data.goals]);
}
