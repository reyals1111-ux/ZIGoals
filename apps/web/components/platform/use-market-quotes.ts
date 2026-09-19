'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {boundedQuoteText,verifiedNativeQuote} from '../../lib/market-quotes';
import {createQuoteCache,type QuoteSnapshot} from '../../lib/market-quote-cache';
const cache=createQuoteCache(async()=>{
 const response=await fetch('/api/market-quotes',{method:'GET',credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw Error('Verified quote unavailable.');const body=JSON.parse(await boundedQuoteText(response));return verifiedNativeQuote(body.quote);
});
const serverSnapshot:QuoteSnapshot={quotes:[],now:0,loading:false,error:null};
let users=0,enabledUsers=0,timer:ReturnType<typeof setInterval>|undefined,hydrated=false;
/** One cache and aging timer across collection, Today and detail, independent of private stores. */
export function useMarketQuotes(enabled=true){
 const snapshot=useSyncExternalStore(cache.subscribe,cache.getSnapshot,()=>serverSnapshot);
 useEffect(()=>{
  if(!hydrated){hydrated=true;try{cache.hydrate(localStorage);}catch{/* Public cache is optional. */}}
  users++;if(enabled)enabledUsers++;cache.tick();if(enabled)void cache.refresh();
  if(!timer)timer=setInterval(()=>{cache.tick();if(enabledUsers>0)void cache.refresh();},30000);
  return()=>{users--;if(enabled)enabledUsers--;if(!users&&timer){clearInterval(timer);timer=undefined;}};
 },[enabled]);
 return {...snapshot,refresh:cache.refresh};
}
