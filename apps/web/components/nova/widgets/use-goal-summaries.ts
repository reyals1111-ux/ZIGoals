'use client';
import {useMemo} from 'react';
import {usePlatform} from '../../platform/use-platform';
import {useGoals} from '../../goal-provider';
import {useMarketQuotes} from '../../platform/use-market-quotes';
import {useEvidenceNow} from '../../platform/use-evidence-now';
import {wealthMarketRequests} from '../../../lib/wealth';
import {unifiedGoalSummaries, type GoalSummary} from '../../../lib/goal-summary';

/**
 * Session AK (owner follow-up 2, N2; lane NA): the person's goals as Today summarises them (lib/goal-summary.ts), with the
 * same market prices Today asks for, so NOVA's "Goal pace" and "Next contribution" say what Today says. Loaded only with
 * those widgets.
 */
export function useGoalSummaries(): {goals: GoalSummary[]; loaded: boolean; error: boolean} {
  const platform = usePlatform(), legacy = useGoals();
  const requests = platform.loaded && !platform.error && platform.data.goals.length ? wealthMarketRequests(platform.data) : false;
  const market = useMarketQuotes(requests), now = useEvidenceNow(platform.data, market.now);
  const goals = useMemo(() => !platform.loaded || platform.error ? [] : unifiedGoalSummaries(legacy.goals, legacy.metadata?.goals ?? {}, platform.data, market.quotes, now, legacy.mode === 'local' ? 'Local simulation' : 'Future Goal Manager')
    .filter(g => !g.key.startsWith('legacy:') || !platform.data.legacyGoalUi?.[`${legacy.chain}:${legacy.owner}:${g.id}`]?.archived),
  [platform.loaded, platform.error, platform.data, legacy.goals, legacy.metadata, legacy.mode, legacy.chain, legacy.owner, market.quotes, now]);
  return {goals, loaded: platform.loaded && legacy.loaded, error: !!platform.error};
}
