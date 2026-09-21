import {z} from 'zod';
import {marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {boundedQuoteText} from './market-quotes';
import {marketInsightSchema,verifiedMarketInsight,INSIGHTS_UNAVAILABLE,type MarketInsightsLoadResult} from './market-insights';
const resultSchema=z.object({insight:marketInsightSchema.nullable(),error:z.string().max(300).nullable(),stale:z.boolean()}).strict();
const responseSchema=z.object({entries:z.array(marketInsightSchema).max(500),results:z.record(z.string().max(200),resultSchema).refine(value=>Object.keys(value).length<=500),error:z.string().max(300).nullable()}).strict();
/** Batches public identities only. Browser secrets, account state and quantities are never sent. */
export async function fetchPublicMarketInsights(raw:readonly MarketQuoteRequest[],force=false,fetcher:typeof fetch=fetch,now=Date.now()):Promise<MarketInsightsLoadResult>{
 const requests=uniqueMarketRequests(raw),result:MarketInsightsLoadResult={entries:[],error:null,errors:{}};
 for(let offset=0;offset<requests.length;offset+=500){const batch=requests.slice(offset,offset+500);try{
 const response=await fetcher('/api/market-insights',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:batch,refresh:force}),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(30000)});
 const body=responseSchema.parse(JSON.parse(await boundedQuoteText(response,16*1024*1024)));if(!response.ok&&!body.entries.length)throw Error('Unavailable');const byKey=new Map(batch.map(request=>[marketRequestKey(request),request])),seen=new Set<string>();
 const entries=body.entries.map(rawEntry=>{const key=marketRequestKey(rawEntry),request=byKey.get(key);if(!request||seen.has(key))throw Error('Invalid insight identity');seen.add(key);return verifiedMarketInsight(rawEntry,request,now);});
 if(Object.keys(body.results).length!==batch.length)throw Error('Incomplete insight results');
 for(const [key,value] of Object.entries(body.results)){const request=byKey.get(key);if(!request)throw Error('Invalid result identity');if(value.insight){const verified=verifiedMarketInsight(value.insight,request,now),entry=entries.find(row=>marketRequestKey(row)===key);if(!entry||JSON.stringify(verified)!==JSON.stringify(entry))throw Error('Inconsistent result');}else if(seen.has(key))throw Error('Inconsistent missing result');}
 if(entries.length!==batch.length&&!body.error)throw Error('Incomplete insights');
 result.entries.push(...entries);for(const [key,value] of Object.entries(body.results))result.errors![key]=value.error?INSIGHTS_UNAVAILABLE:null;if(body.error)result.error=INSIGHTS_UNAVAILABLE;
 }catch{result.error=INSIGHTS_UNAVAILABLE;for(const request of batch)result.errors![marketRequestKey(request)]=INSIGHTS_UNAVAILABLE;}}
 return result;
}
