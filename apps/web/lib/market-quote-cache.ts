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
 pending=(async()=>{try{const quote=verifiedNativeQuote(await load(),clock());const previous=state.quotes[0];if(!previous||Date.parse(quote.observedAt)>=Date.parse(previous.observedAt)){state={...state,quotes:[quote],error:null};try{storage?.setItem(PUBLIC_QUOTE_KEY,JSON.stringify(quote));}catch{/* Storage is optional. */}}}catch{state={...state,error:'Market price could not be refreshed. Last verified evidence is retained.'};}finally{state={...state,loading:false,now:clock()};pending=null;emit();}})();return pending;
 }
 return {getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},hydrate,tick,refresh};
}
