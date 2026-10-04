import 'server-only';
import {z} from 'zod';
import {marketAssetRefSchema,type MarketQuoteRequest} from '../market-assets';
import {boundedQuoteText} from '../market-quotes';
import {HISTORY_UNAVAILABLE,historyIsStale,verifiedMarketHistory,type MarketHistoryRequest} from '../market-history';
import {fetchPublicMarketInsights} from '../market-insights-client';
import {INSIGHTS_UNAVAILABLE} from '../market-insights';
import {marketRuntime} from './market-runtime';
const marketHeaders=(client?:string|null)=>({'content-type':'application/json',...(client?{'x-market-client':client}:{})});
const catalogSchema=z.object({assets:z.array(z.object({ref:marketAssetRefSchema,name:z.string().min(1).max(300),symbol:z.string().max(100),platforms:z.record(z.string(),z.string()).optional()}).strict()).max(50000),error:z.string().max(300).nullable(),fetchedAt:z.iso.datetime().nullable(),stale:z.boolean()}).strict();
/** Each function's `client` is the edge address group from marketClientGroup, sent as `x-market-client`; an incoming
 * header of that name is never forwarded. */
export async function configuredDurableCatalog(signal?:AbortSignal,client?:string|null){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 const unavailable={assets:[],error:'Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.',fetchedAt:null,stale:true};
 if(runtime.mode!=='durable')return unavailable;
 try{const response=await runtime.binding.fetch(new Request('https://market.internal/catalog',{method:'POST',signal,headers:marketHeaders(client),body:'{"version":1}'}));if(!response.ok)return unavailable;return catalogSchema.parse(JSON.parse(await boundedQuoteText(response,32*1024*1024)));}catch{return unavailable;}
}
export async function configuredDurableHistory(request:MarketHistoryRequest,signal?:AbortSignal,client?:string|null){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 const unavailable={history:null,error:HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:Date.now()+60000};
 if(runtime.mode!=='durable')return unavailable;
 try{const response=await runtime.binding.fetch(new Request('https://market.internal/history',{method:'POST',signal,headers:marketHeaders(client),body:JSON.stringify({version:1,request})}));if(!response.ok)return unavailable;const raw=JSON.parse(await boundedQuoteText(response,2*1024*1024));if(!raw.history)return unavailable;const history=verifiedMarketHistory(raw.history,request);return {history,error:raw.error?HISTORY_UNAVAILABLE:null,stale:historyIsStale(history),nextAttemptAt:Date.now()+60000};}catch{return unavailable;}
}
/** Session U Part 2d: when the coordinator's MARKET_POLICY period ends (QuoteService /status), for the deploy summary and
 * the owner's verifier. null means "not reported": no binding, an older coordinator (404) or any other answer. A
 * reported end is kept in this isolate for 10 minutes; /status reads no account state, so this only saves a call. */
const statusSchema=z.object({version:z.literal(1),policyWindowEnd:z.iso.datetime().nullable()}).strict();
let reportedStatus:{value:z.infer<typeof statusSchema>;until:number}|undefined;
export async function configuredMarketStatus(signal?:AbortSignal,client?:string|null):Promise<z.infer<typeof statusSchema>>{
 const none={version:1 as const,policyWindowEnd:null};
 if(reportedStatus&&Date.now()<reportedStatus.until)return reportedStatus.value;
 const runtime=await marketRuntime();if(runtime.mode!=='durable')return none;
 try{
  const response=await runtime.binding.fetch(new Request('https://market.internal/status',{method:'POST',signal,headers:marketHeaders(client),body:'{"version":1}'}));
  if(!response.ok){await response.body?.cancel();return none;}
  const value=statusSchema.parse(JSON.parse(await boundedQuoteText(response,1024)));
  if(value.policyWindowEnd)reportedStatus={value,until:Date.now()+600000};
  return value;
 }catch{return none;}
}
export async function configuredDurableInsights(requests:readonly MarketQuoteRequest[],signal?:AbortSignal,client?:string|null){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 if(runtime.mode!=='durable')return {entries:[],error:INSIGHTS_UNAVAILABLE};
 return fetchPublicMarketInsights(requests,false,async(_input,init)=>{
  const body=JSON.parse(String(init?.body));
  return runtime.binding.fetch(new Request('https://market.internal/insights',{method:'POST',signal,headers:marketHeaders(client),body:JSON.stringify({version:1,requests:body.requests})}));
 });
}
