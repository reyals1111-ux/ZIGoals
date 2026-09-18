'use client';
import {useGoals} from './goal-provider';
import {usePlatform} from './platform/use-platform';
import {useMarketQuotes} from './platform/use-market-quotes';
import {needsMarketQuotes} from '../lib/positions';
import {unifiedGoalSummaries} from '../lib/goal-summary';
export function useUnifiedGoals(){
 const legacy=useGoals(),platform=usePlatform(),market=useMarketQuotes(needsMarketQuotes(platform.data));
 const goals=unifiedGoalSummaries(legacy.goals,legacy.metadata?.goals??{},platform.data,market.quotes,market.now,legacy.mode==='local'?'Local simulation':'Future Goal Manager');
 return {goals,loaded:legacy.loaded&&platform.loaded,error:platform.error,market};
}
