import {isJsonMediaType} from '../../../lib/json-media-type';
import {z} from 'zod';
import {marketRequestKey,marketRequestsSchema,uniqueMarketRequests} from '../../../lib/market-assets';
import {DETAIL_NOT_PROVIDED,DETAIL_UNAVAILABLE,MAX_DETAIL_PAIRS,type MarketDetailAnswer} from '../../../lib/market-detail';
import {boundedQuoteText} from '../../../lib/market-quotes';
import {configuredDurableDetails} from '../../../lib/server/market-data-route';
import {serverMarketDetailCache} from '../../../lib/server/market-detail-service';
import {marketClientGroup} from '../../../lib/server/market-client-address';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
// Session W Part 15: coins' market details for Portfolio. At most 64 pairs (as insights): more is a 400 before any market work.
const bodySchema=z.object({requests:marketRequestsSchema.max(MAX_DETAIL_PAIRS),refresh:z.boolean().optional()}).strict();
/** 200 when something is known or nothing more can be known ("not provided"); 503 when details are only unavailable now. */
const status=(answer:MarketDetailAnswer)=>{const results=Object.values(answer.results);return !results.length||results.some(r=>r.detail)||results.every(r=>r.error===DETAIL_NOT_PROVIDED)?200:503;};
export async function POST(request:Request):Promise<Response>{
 if(!isJsonMediaType(request.headers.get('content-type')))return Response.json({error:'Unsupported public market request media type.'},{status:415,headers});
 let body:z.infer<typeof bodySchema>;
 try{if(new URL(request.url).search)throw Error('Unsupported query');body=bodySchema.parse(JSON.parse(await boundedQuoteText(new Response(request.body),256*1024)));}catch{return Response.json({error:'Invalid public market details request.'},{status:400,headers});}
 const requests=uniqueMarketRequests(body.requests);
 const durable=await configuredDurableDetails(requests,request.signal,marketClientGroup(request.headers.get('cf-connecting-ip')));
 if(durable)return Response.json(durable,{status:status(durable),headers});
 await serverMarketDetailCache.refresh(requests,body.refresh);serverMarketDetailCache.tick();
 const snapshot=serverMarketDetailCache.getSnapshot(),answer:MarketDetailAnswer={results:{},error:null};
 for(const pair of requests){const key=marketRequestKey(pair),result=snapshot.results[key]??{detail:null,error:DETAIL_UNAVAILABLE,stale:true};answer.results[key]=result;if(result.error&&answer.error!==DETAIL_UNAVAILABLE)answer.error=result.error;}
 return Response.json(answer,{status:status(answer),headers});
}
