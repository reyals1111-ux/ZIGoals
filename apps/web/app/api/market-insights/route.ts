import {isJsonMediaType} from '../../../lib/json-media-type';
import {z} from 'zod';
import {marketRequestsSchema,marketRequestKey,uniqueMarketRequests} from '../../../lib/market-assets';
import {verifiedMarketInsight,INSIGHTS_UNAVAILABLE} from '../../../lib/market-insights';
import {boundedQuoteText} from '../../../lib/market-quotes';
import {configuredDurableInsights} from '../../../lib/server/market-data-route';
import {serverMarketInsightsCache} from '../../../lib/server/market-insights-service';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const bodySchema=z.object({requests:marketRequestsSchema,refresh:z.boolean().optional()}).strict();
export async function POST(request:Request):Promise<Response>{
 if(!isJsonMediaType(request.headers.get('content-type')))return Response.json({error:'Unsupported public market request media type.'},{status:415,headers});
 let body:z.infer<typeof bodySchema>;
 try{if(new URL(request.url).search)throw Error('Unsupported query');body=bodySchema.parse(JSON.parse(await boundedQuoteText(new Response(request.body),256*1024)));}catch{return Response.json({error:'Invalid public market insights request.'},{status:400,headers});}
 const requests=uniqueMarketRequests(body.requests);const durable=await configuredDurableInsights(requests);if(durable){const results=Object.fromEntries(requests.map(request=>{const key=marketRequestKey(request),insight=durable.entries.find(row=>marketRequestKey(row)===key)??null;return [key,{insight,error:durable.errors?.[key]??(insight?null:INSIGHTS_UNAVAILABLE),stale:!insight||Date.now()-Date.parse(insight.observedAt??insight.fetchedAt)>=900000}];}));return Response.json({entries:durable.entries,error:durable.error,results},{status:durable.entries.length||!requests.length?200:503,headers});}await serverMarketInsightsCache.refresh(requests,body.refresh);serverMarketInsightsCache.tick();const snapshot=serverMarketInsightsCache.getSnapshot();
 const results=Object.fromEntries(requests.map(request=>{const key=marketRequestKey(request),result=snapshot.results[key];try{if(result?.insight)verifiedMarketInsight(result.insight,request);return [key,result??{insight:null,error:INSIGHTS_UNAVAILABLE,stale:true}];}catch{return [key,{insight:null,error:INSIGHTS_UNAVAILABLE,stale:true}];}}));const entries=requests.flatMap(request=>{const entry=results[marketRequestKey(request)]?.insight;return entry?[entry]:[];});const error=Object.values(results).some(result=>result?.error)?'Market insights are unavailable. Last verified evidence is retained.':null;
 return Response.json({entries,results,error},{status:entries.length||!requests.length?200:503,headers});
}
