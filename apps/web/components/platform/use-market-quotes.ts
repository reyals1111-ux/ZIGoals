'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {getAppStorage,isShowcase} from '../../lib/showcase-storage';
import {fetchPublicMarketQuotes} from '../../lib/market-quote-client';
import {setFrozenPrices} from '../../lib/market-quotes';
import {nativeZigRequest,uniqueMarketRequests,type MarketQuoteRequest} from '../../lib/market-assets';
import {createMarketQuoteCache,PUBLIC_QUOTE_KEY,type QuoteSnapshot} from '../../lib/market-quote-cache';
const cache=createMarketQuoteCache(fetchPublicMarketQuotes);
const serverSnapshot:QuoteSnapshot={quotes:[],now:0,loading:false,error:null};
let users=0,timer:ReturnType<typeof setInterval>|undefined,hydrated=false;
/** Session AL (TK-208, PR-016): newer quotes another tab saved are taken in (not in the Showcase, whose prices stay as first loaded). */
const fromOtherTab=(event:StorageEvent)=>{if(event.key===PUBLIC_QUOTE_KEY&&!isShowcase())cache.adopt(event.newValue);};
/** Aging is local only. Network requests happen on relevant mounts/identity changes or explicit refresh. */
export function useMarketQuotes(input:boolean|readonly MarketQuoteRequest[]=true){
 const requests=typeof input==='boolean'?(input?[nativeZigRequest]:[]):uniqueMarketRequests(input);const requestKey=JSON.stringify(requests);
 const snapshot=useSyncExternalStore(cache.subscribe,cache.getSnapshot,()=>serverSnapshot);
 useEffect(()=>{
  // A mode change reloads the app; an in-flight response must not cross storage scopes.
 if(!hydrated){hydrated=true;try{const storage=getAppStorage();cache.hydrate({getItem:key=>storage.getItem(key),setItem:(key,value)=>{if(getAppStorage()===storage)storage.setItem(key,value);}});}catch{/* Public cache optional. */}}
  // Session AH Part 4 (TR2/TR3): the Showcase keeps the prices it first loaded (in its own tab storage) for every page.
  const frozen=isShowcase();setFrozenPrices(frozen);
  users++;cache.tick();void cache.refresh(JSON.parse(requestKey) as MarketQuoteRequest[],false,frozen);
  if(!timer){timer=setInterval(()=>cache.tick(),30000);window.addEventListener('storage',fromOtherTab);}
  return()=>{users--;if(!users&&timer){clearInterval(timer);timer=undefined;window.removeEventListener('storage',fromOtherTab);}};
 },[requestKey]);
 return {...snapshot,refresh:()=>cache.refresh(requests,true,isShowcase())};
}
