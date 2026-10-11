import {beginPendingWork,ownPendingWork,waitForPendingWork,workIsPending,type PendingWork} from './pending-work';
import {quoteIsStale,verifiedNativeQuote,type MarketQuote} from './market-quotes';
export const PUBLIC_QUOTE_KEY='zigoals:public-market-quotes:v1';
export type QuoteSnapshot={quotes:readonly MarketQuote[];now:number;loading:boolean;error:string|null};
/** A single supported pair, one request in flight, and a minimum one-minute retry interval. */
export function createQuoteCache(load:()=>Promise<MarketQuote>,clock=()=>Date.now()){
 let state:QuoteSnapshot={quotes:[],now:clock(),loading:false,error:null},pending:Promise<void>|null=null,nextAttempt=0;
 const listeners=new Set<()=>void>();let storage:Pick<Storage,'getItem'|'setItem'>|undefined;
 const emit=()=>{for(const listener of listeners)listener();};
 function hydrate(store:Pick<Storage,'getItem'|'setItem'>){storage=store;try{const text=store.getItem(PUBLIC_QUOTE_KEY);if(text&&text.length<=8192){const quote=verifiedNativeQuote(JSON.parse(text),clock());state={...state,quotes:[quote],now:clock()};emit();}}catch{/* Invalid public cache is ignored; private data is never read. */}}
 function tick(){state={...state,now:clock()};emit();}
 function refresh():Promise<void>{
 if(pending)return pending;const now=clock();if(now<nextAttempt||(state.quotes[0]&&!quoteIsStale(state.quotes[0],now)))return Promise.resolve();
 nextAttempt=now+60000;state={...state,now,loading:true};emit();
 pending=(async()=>{try{const quote=verifiedNativeQuote(await load(),clock());const previous=state.quotes[0];if(!previous||Date.parse(quote.observedAt??quote.fetchedAt??'')>=Date.parse(previous.observedAt??previous.fetchedAt??'')){state={...state,quotes:[quote],error:null};try{storage?.setItem(PUBLIC_QUOTE_KEY,JSON.stringify(quote));}catch{/* Storage is optional. */}}}catch{state={...state,error:'Market price could not be refreshed. Last verified evidence is retained.'};}finally{state={...state,loading:false,now:clock()};pending=null;emit();}})();return pending;
 }
 return {getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},hydrate,tick,refresh};
}

import {verifiedMarketQuote} from './market-quotes';
import {MARKET_RETRY_MS,marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
export const MAX_PUBLIC_QUOTES=2000;
export const PUBLIC_QUOTES_MAX_BYTES=2*1024*1024;
/** Shared bounded public cache. Requests contain identities/currencies only, never Positions. */
export type MarketQuoteLoadResult=readonly MarketQuote[]|{quotes:readonly MarketQuote[];error:string|null};
export function createMarketQuoteCache(load:(requests:readonly MarketQuoteRequest[],force?:boolean)=>Promise<MarketQuoteLoadResult>,clock=()=>Date.now()){
 let state:QuoteSnapshot={quotes:[],now:clock(),loading:false,error:null};const attempts=new Map<string,number>(),listeners=new Set<()=>void>();let pending:PendingWork|null=null;let storage:Pick<Storage,'getItem'|'setItem'>|undefined;
 const key=(q:MarketQuote)=>q.marketRef?marketRequestKey({marketRef:q.marketRef,currency:q.currency as 'USD'|'EUR'}):'coingecko:coin:zignaly:USD';
 const emit=()=>{for(const listener of listeners)listener();};
 function hydrate(store:Pick<Storage,'getItem'|'setItem'>){storage=store;try{const text=store.getItem(PUBLIC_QUOTE_KEY);if(!text||text.length>PUBLIC_QUOTES_MAX_BYTES)return;const raw=JSON.parse(text);const rows=Array.isArray(raw)?raw:[raw];if(rows.length>MAX_PUBLIC_QUOTES)return;const quotes=rows.map(q=>verifiedMarketQuote(q,clock()));state={...state,quotes:[...new Map(quotes.map(q=>[key(q),q])).values()],now:clock()};emit();}catch{/* Optional public cache is never allowed to contaminate private data. */}}
 function tick(){state={...state,now:clock()};emit();}
 async function refresh(raw:readonly MarketQuoteRequest[],force=false):Promise<void>{
 const requests=uniqueMarketRequests(raw);if(!requests.length)return;if(pending){if(!await waitForPendingWork(pending)){state={...state,error:'Market prices could not be refreshed. Last verified evidence is retained.'};emit();return;}if(!workIsPending(pending)){pending=null;state={...state,loading:false};}return refresh(requests,force);}
 const now=clock();const needed=requests.filter(r=>{const k=marketRequestKey(r),quote=state.quotes.find(q=>key(q)===k);return now>=(attempts.get(k)??0)&&(force||!quote||quoteIsStale(quote,now));});if(!needed.length)return;
 for(const request of needed)attempts.set(marketRequestKey(request),now+MARKET_RETRY_MS);while(attempts.size>MAX_PUBLIC_QUOTES*2)attempts.delete(attempts.keys().next().value!);
 state={...state,now,loading:true};emit();
 const work=beginPendingWork();pending=work;await ownPendingWork(work,(async()=>{try{const loaded=await load(needed,force);const result='quotes' in loaded?loaded:{quotes:loaded,error:null};const quotes=result.quotes.map(q=>verifiedMarketQuote(q,clock()));if((quotes.length!==needed.length&&!result.error)||quotes.some(q=>!needed.some(r=>marketRequestKey(r)===key(q)))||new Set(quotes.map(key)).size!==quotes.length)throw Error('Incomplete market response.');
 if(pending!==work)return;if(!workIsPending(work))throw Error('Market work expired.');
 const merged=new Map(state.quotes.map(q=>[key(q),q]));for(const quote of quotes){const previous=merged.get(key(quote));if(!previous||Date.parse(quote.observedAt??quote.fetchedAt??'')>=Date.parse(previous.observedAt??previous.fetchedAt??'')){merged.delete(key(quote));merged.set(key(quote),quote);}}
 state={...state,quotes:[...merged.values()].slice(-MAX_PUBLIC_QUOTES),error:result.error?'Market prices could not be refreshed. Last verified evidence is retained; manual valuation remains available.':null};try{const text=JSON.stringify(state.quotes);if(text.length<=PUBLIC_QUOTES_MAX_BYTES)storage?.setItem(PUBLIC_QUOTE_KEY,text);}catch{/* Optional persistence. */}
 }catch{if(pending===work)state={...state,error:'Market prices could not be refreshed. Last verified evidence is retained; manual valuation remains available.'};}finally{work.done=true;if(pending===work){state={...state,loading:false,now:clock()};pending=null;emit();}}})());
 }
 return {getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},hydrate,tick,refresh};
}
