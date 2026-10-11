'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {marketRequestKey,uniqueMarketRequests,type MarketAssetRef,type MarketQuoteRequest} from '../../lib/market-assets';
import {createMarketDetailCache,type MarketDetailSnapshot} from '../../lib/market-detail-cache';
import {fetchPublicMarketDetails} from '../../lib/market-detail-client';
const cache=createMarketDetailCache(fetchPublicMarketDetails);
const serverSnapshot:MarketDetailSnapshot={results:{},loading:false,now:0};
let users=0,timer:ReturnType<typeof setInterval>|undefined;
/**
 * Session W Part 15: coins' market details (1h/7d change, market cap, 24h volume, supply) for a page, keyed like insights
 * (results[marketRequestKey({marketRef,currency})]). Only coins are asked; empty refs ask nothing (the Showcase passes
 * none). No polling: a 30-second tick only ages what is shown; refresh() is explicit and shares the one-minute gate.
 */
export function useMarketDetails(refs:readonly MarketAssetRef[],currency:'USD'|'EUR'='USD'){
 const requests=uniqueMarketRequests(refs.filter(ref=>ref.kind==='coin').map(marketRef=>({marketRef,currency}))).sort((a,b)=>marketRequestKey(a).localeCompare(marketRequestKey(b))),requestKey=JSON.stringify(requests);
 const snapshot=useSyncExternalStore(cache.subscribe,cache.getSnapshot,()=>serverSnapshot);
 useEffect(()=>{
  users++;cache.tick();void cache.refresh(JSON.parse(requestKey) as MarketQuoteRequest[]);if(!timer)timer=setInterval(()=>cache.tick(),30000);
  return()=>{users--;if(!users&&timer){clearInterval(timer);timer=undefined;}};
 },[requestKey]);
 return {...snapshot,refresh:()=>cache.refresh(requests,true)};
}
