import 'server-only';
import {z} from 'zod';
import {MARKET_REQUEST_CHUNK,marketAssetRefSchema,uniqueMarketRequests,type MarketQuoteRequest} from '../market-assets';
import {boundedQuoteText} from '../market-quotes';
import {HISTORY_UNAVAILABLE,historyIsStale,verifiedMarketHistory,type MarketHistoryRequest} from '../market-history';
import {fetchPublicMarketInsights} from '../market-insights-client';
import {INSIGHTS_UNAVAILABLE} from '../market-insights';
import {DETAIL_NOT_PROVIDED,DETAIL_UNAVAILABLE,detailAnswerFor,verifiedDetailAnswer,type MarketDetailAnswer} from '../market-detail';
import {marketRuntime,marketBindingHeaders} from './market-runtime';
const catalogSchema=z.object({assets:z.array(z.object({ref:marketAssetRefSchema,name:z.string().min(1).max(300),symbol:z.string().max(100),platforms:z.record(z.string(),z.string()).optional()}).strict()).max(50000),error:z.string().max(300).nullable(),fetchedAt:z.iso.datetime().nullable(),stale:z.boolean()}).strict();
/** Each function's `client` is the edge address group from marketClientGroup, sent as `x-market-client`; an incoming
 * header of that name is never forwarded. */
export async function configuredDurableCatalog(signal?:AbortSignal,client?:string|null){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 const unavailable={assets:[],error:'Market catalog unavailable. Last verified catalog is retained; manual valuation remains available.',fetchedAt:null,stale:true};
 if(runtime.mode!=='durable')return unavailable;
 try{const response=await runtime.binding.fetch(new Request('https://market.internal/catalog',{method:'POST',signal,headers:marketBindingHeaders(runtime.caller,client),body:'{"version":1}'}));if(!response.ok)return unavailable;return catalogSchema.parse(JSON.parse(await boundedQuoteText(response,32*1024*1024)));}catch{return unavailable;}
}
export async function configuredDurableHistory(request:MarketHistoryRequest,signal?:AbortSignal,client?:string|null){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 const unavailable={history:null,error:HISTORY_UNAVAILABLE,stale:true,nextAttemptAt:Date.now()+60000};
 if(runtime.mode!=='durable')return unavailable;
 try{const response=await runtime.binding.fetch(new Request('https://market.internal/history',{method:'POST',signal,headers:marketBindingHeaders(runtime.caller,client),body:JSON.stringify({version:1,request})}));if(!response.ok)return unavailable;const raw=JSON.parse(await boundedQuoteText(response,2*1024*1024));if(!raw.history)return unavailable;const history=verifiedMarketHistory(raw.history,request);return {history,error:raw.error?HISTORY_UNAVAILABLE:null,stale:historyIsStale(history),nextAttemptAt:Date.now()+60000};}catch{return unavailable;}
}
/** Session U Part 2d: when the coordinator's MARKET_POLICY period ends (QuoteService /status), for the deploy summary and
 * the owner's verifier; follow-up F2: and when an installed next window ends (null when none waits, or from a coordinator
 * built before F2, which does not send it). null means "not reported": no binding, an older coordinator (404) or any other
 * answer. A reported end is kept in this isolate for 10 minutes, never past the end itself (the next window takes over
 * there); /status reads no account state, so this only saves a call. */
const statusSchema=z.object({version:z.literal(1),policyWindowEnd:z.iso.datetime().nullable(),nextPolicyWindowEnd:z.iso.datetime().nullable().default(null)}).strict();
type MarketStatus=z.output<typeof statusSchema>;
let reportedStatus:{value:MarketStatus;until:number}|undefined;
export async function configuredMarketStatus(signal?:AbortSignal,client?:string|null):Promise<MarketStatus>{
 const none={version:1 as const,policyWindowEnd:null,nextPolicyWindowEnd:null};
 if(reportedStatus&&Date.now()<reportedStatus.until)return reportedStatus.value;
 const runtime=await marketRuntime();if(runtime.mode!=='durable')return none;
 try{
  const response=await runtime.binding.fetch(new Request('https://market.internal/status',{method:'POST',signal,headers:marketBindingHeaders(runtime.caller,client),body:'{"version":1}'}));
  if(!response.ok){await response.body?.cancel();return none;}
  const value=statusSchema.parse(JSON.parse(await boundedQuoteText(response,1024)));
  if(value.policyWindowEnd)reportedStatus={value,until:Math.min(Date.now()+600000,Date.parse(value.policyWindowEnd))};
  return value;
 }catch{return none;}
}
export async function configuredDurableInsights(requests:readonly MarketQuoteRequest[],signal?:AbortSignal,client?:string|null){
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 if(runtime.mode!=='durable')return {entries:[],error:INSIGHTS_UNAVAILABLE};
 return fetchPublicMarketInsights(requests,false,async(_input,init)=>{
  const body=JSON.parse(String(init?.body));
  return runtime.binding.fetch(new Request('https://market.internal/insights',{method:'POST',signal,headers:marketBindingHeaders(runtime.caller,client),body:JSON.stringify({version:1,requests:body.requests})}));
 });
}
/** Session W Part 15: coins' market details from QuoteService /insights-detail, at most 32 pairs per coordinator request
 * (a client's share, as for insights). A coordinator built before Part 15 answers 404: every pair is then "not provided"
 * until the owner redeploys it; any other failure is "unavailable". Null in direct development (the route asks itself). */
export async function configuredDurableDetails(raw:readonly MarketQuoteRequest[],signal?:AbortSignal,client?:string|null):Promise<MarketDetailAnswer|null>{
 const runtime=await marketRuntime();if(runtime.mode==='development')return null;
 const requests=uniqueMarketRequests(raw);if(runtime.mode!=='durable')return detailAnswerFor(requests,DETAIL_UNAVAILABLE);
 const answer:MarketDetailAnswer={results:{},error:null};
 for(let offset=0;offset<requests.length;offset+=MARKET_REQUEST_CHUNK){
  const batch=requests.slice(offset,offset+MARKET_REQUEST_CHUNK);let part:MarketDetailAnswer;
  try{
   const response=await runtime.binding.fetch(new Request('https://market.internal/insights-detail',{method:'POST',signal,headers:marketBindingHeaders(runtime.caller,client),body:JSON.stringify({version:1,requests:batch})}));
   if(!response.ok){await response.body?.cancel();part=detailAnswerFor(batch,response.status===404?DETAIL_NOT_PROVIDED:DETAIL_UNAVAILABLE);}
   else part=verifiedDetailAnswer(JSON.parse(await boundedQuoteText(response,4*1024*1024)),batch);
  }catch{part=detailAnswerFor(batch,DETAIL_UNAVAILABLE);}
  Object.assign(answer.results,part.results);if(part.error&&answer.error!==DETAIL_UNAVAILABLE)answer.error=part.error;
 }
 return answer;
}
