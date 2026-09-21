'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {getAppStorage} from '../../lib/showcase-storage';
import {fetchPublicMarketQuotes} from '../../lib/market-quote-client';
import {nativeZigRequest,uniqueMarketRequests,type MarketQuoteRequest} from '../../lib/market-assets';
import {createMarketQuoteCache,type QuoteSnapshot} from '../../lib/market-quote-cache';
const cache=createMarketQuoteCache(fetchPublicMarketQuotes);
const serverSnapshot:QuoteSnapshot={quotes:[],now:0,loading:false,error:null};
let users=0,timer:ReturnType<typeof setInterval>|undefined,hydrated=false;
/** Aging is local only. Network requests happen on relevant mounts/identity changes or explicit refresh. */
export function useMarketQuotes(input:boolean|readonly MarketQuoteRequest[]=true){
 const requests=typeof input==='boolean'?(input?[nativeZigRequest]:[]):uniqueMarketRequests(input);const requestKey=JSON.stringify(requests);
 const snapshot=useSyncExternalStore(cache.subscribe,cache.getSnapshot,()=>serverSnapshot);
 useEffect(()=>{
  // A mode change reloads the app; an in-flight response must not cross storage scopes.
 if(!hydrated){hydrated=true;try{const storage=getAppStorage();cache.hydrate({getItem:key=>storage.getItem(key),setItem:(key,value)=>{if(getAppStorage()===storage)storage.setItem(key,value);}});}catch{/* Public cache optional. */}}
  users++;cache.tick();void cache.refresh(JSON.parse(requestKey) as MarketQuoteRequest[]);
  if(!timer)timer=setInterval(()=>cache.tick(),30000);
  return()=>{users--;if(!users&&timer){clearInterval(timer);timer=undefined;}};
 },[requestKey]);
 return {...snapshot,refresh:()=>cache.refresh(requests,true)};
}
