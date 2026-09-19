'use client';
import {useGoals} from './goal-provider';
import {usePlatform} from './platform/use-platform';
import {useMarketQuotes} from './platform/use-market-quotes';
import {needsMarketQuotes} from '../lib/positions';
import {unifiedGoalSummaries} from '../lib/goal-summary';
export function useUnifiedGoals(){
 const legacy=useGoals(),platform=usePlatform(),market=useMarketQuotes(needsMarketQuotes(platform.data));
 const all=unifiedGoalSummaries(legacy.goals,legacy.metadata?.goals??{},platform.data,market.quotes,market.now,legacy.mode==='local'?'Local simulation':'Future Goal Manager');
 const prefs=(id:string)=>platform.data.legacyGoalUi?.[`${legacy.chain}:${legacy.owner}:${id}`];
 const pinned=(g:typeof all[number])=>g.key.startsWith('legacy:')?prefs(g.id)?.pinned:platform.data.goals.find(p=>p.id===g.id)?.pinned;
 const goals=all.filter(g=>!g.key.startsWith('legacy:')||!prefs(g.id)?.archived).sort((a,b)=>Number(!!pinned(b))-Number(!!pinned(a)));
 return {goals,loaded:legacy.loaded&&platform.loaded,error:platform.error,market};
}
