'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {getAppStorage} from '../../lib/showcase-storage';
import {marketRequestKey,uniqueMarketRequests,type MarketAssetRef,type MarketQuoteRequest} from '../../lib/market-assets';
import {createMarketInsightsCache} from '../../lib/market-insights-cache';
import {fetchPublicMarketInsights} from '../../lib/market-insights-client';
import type {MarketInsightsSnapshot} from '../../lib/market-insights';
const cache=createMarketInsightsCache(fetchPublicMarketInsights);
const serverSnapshot:MarketInsightsSnapshot={entries:[],results:{},loading:false,error:null,now:0};
let users=0,timer:ReturnType<typeof setInterval>|undefined,hydrated=false;
/** Call once at page level with public refs; pass results[marketRequestKey({marketRef,currency})]
 * down to icons/watchlist cards. No card fetches, keystroke requests or background network polling.
 * Empty refs disable acquisition. refresh() is explicit and shares the one-minute admission gate.
 * sparkline.prices are exact 7-day sequence samples WITHOUT individual point timestamps. */
export function useMarketInsights(refs:readonly MarketAssetRef[],currency:'USD'|'EUR'='USD'){
 const requests=uniqueMarketRequests(refs.map(marketRef=>({marketRef,currency}))).sort((a,b)=>marketRequestKey(a).localeCompare(marketRequestKey(b)));const requestKey=JSON.stringify(requests);
 const snapshot=useSyncExternalStore(cache.subscribe,cache.getSnapshot,()=>serverSnapshot);
 useEffect(()=>{
 // A mode change reloads the app; an in-flight response must not cross storage scopes.
 if(!hydrated){hydrated=true;try{const storage=getAppStorage();cache.hydrate({getItem:key=>storage.getItem(key),setItem:(key,value)=>{if(getAppStorage()===storage)storage.setItem(key,value);}});}catch{/* Public metadata persistence is optional. */}}
 users++;cache.tick();void cache.refresh(JSON.parse(requestKey) as MarketQuoteRequest[]);if(!timer)timer=setInterval(()=>cache.tick(),30000);
 return()=>{users--;if(!users&&timer){clearInterval(timer);timer=undefined;}};
 },[requestKey]);
 return {...snapshot,refresh:()=>cache.refresh(requests,true)};
}
