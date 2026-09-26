import 'server-only';
import {z} from 'zod';
import {marketAssetRefSchema,type MarketQuoteRequest} from '../market-assets';
import {boundedQuoteText} from '../market-quotes';
import {HISTORY_UNAVAILABLE,historyIsStale,verifiedMarketHistory,type MarketHistoryRequest} from '../market-history';
import {fetchPublicMarketInsights} from '../market-insights-client';
import {INSIGHTS_UNAVAILABLE} from '../market-insights';
import {marketRuntime} from './market-runtime';
const catalogSchema=z.object({assets:z.array(z.object({ref:marketAssetRefSchema,name:z.string().min(1).max(300),symbol:z.string().max(100),platforms:z.record(z.string(),z.string()).optional()}).strict()).max(50000),error:z.string().max(300).nullable(),fetchedAt:z.iso.datetime().nullable(),stale:z.boolean()}).strict();
export async function configuredDurableCatalog(){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 const unavailable={assets:[],error:'Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.',fetchedAt:null,stale:true};
 if(runtime.mode!=='durable')return unavailable;
 try{const response=await runtime.binding.fetch(new Request('https://market.internal/catalog',{method:'POST',headers:{'content-type':'application/json'},body:'{"version":1}'}));if(!response.ok)return unavailable;return catalogSchema.parse(JSON.parse(await boundedQuoteText(response,32*1024*1024)));}catch{return unavailable;}
}
export async function configuredDurableHistory(request:MarketHistoryRequest){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 const unavailable={history:null,error:HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:Date.now()+60000};
 if(runtime.mode!=='durable')return unavailable;
 try{const response=await runtime.binding.fetch(new Request('https://market.internal/history',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,request})}));if(!response.ok)return unavailable;const raw=JSON.parse(await boundedQuoteText(response,2*1024*1024));if(!raw.history)return unavailable;const history=verifiedMarketHistory(raw.history,request);return {history,error:raw.error?HISTORY_UNAVAILABLE:null,stale:historyIsStale(history),nextAttemptAt:Date.now()+60000};}catch{return unavailable;}
}
export async function configuredDurableInsights(requests:readonly MarketQuoteRequest[]){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 if(runtime.mode!=='durable')return {entries:[],error:INSIGHTS_UNAVAILABLE};
 return fetchPublicMarketInsights(requests,false,async(_input,init)=>{
  const body=JSON.parse(String(init?.body));
  return runtime.binding.fetch(new Request('https://market.internal/insights',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({version:1,requests:body.requests})}));
 });
}
