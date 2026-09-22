import {isJsonMediaType} from '../../../lib/json-media-type';
import {z} from 'zod';
import {boundedQuoteText,verifiedMarketQuote,quoteIsStale,type MarketQuote} from '../../../lib/market-quotes';
import {marketRequestsSchema,nativeZigRequest,marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from '../../../lib/market-assets';
import {serverMarketCache} from '../../../lib/server/market-service';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const bodySchema=z.object({requests:marketRequestsSchema,refresh:z.boolean().optional()}).strict();
// Coverage and freshness belong to this request, not the cache's last global refresh.
// Complete evidence does not imply that a provider refresh just succeeded.
function requestedEvidence(requests:readonly MarketQuoteRequest[]){
 const now=Date.now(),byKey=new Map(requests.map(r=>[marketRequestKey(r),r])),selected=new Map<string,MarketQuote>();
 for(const raw of serverMarketCache.getSnapshot().quotes){
  try{
   const quote=verifiedMarketQuote(raw,now);if(!quote.marketRef)continue;
   const key=marketRequestKey({marketRef:quote.marketRef,currency:quote.currency as 'USD'|'EUR'}),requested=byKey.get(key);if(!requested)continue;
   if(requested.marketRef.kind==='rwa'&&(quote.marketRef.kind!=='rwa'||requested.marketRef.assetType!==quote.marketRef.assetType))continue;
   selected.set(key,quote);
  }catch{/* Unusable evidence cannot satisfy requested coverage. */}
 }
 const quotes=[...selected.values()],complete=selected.size===byKey.size;
 const degraded=!complete||quotes.some(quote=>quoteIsStale(quote,now));
 return {quotes,error:degraded?'Market prices could not be refreshed. Last verified evidence is retained; manual valuation remains available.':null};
}
export async function GET(request:Request):Promise<Response>{
 if(new URL(request.url).search)return Response.json({error:'Unsupported public market query.'},{status:400,headers});
 await serverMarketCache.refresh([nativeZigRequest]);const {quotes,error}=requestedEvidence([nativeZigRequest]);const quote=quotes[0];
 return quote?Response.json({quote,error},{headers}):Response.json({error:'Verified market valuation unavailable. Previous local evidence is unchanged.'},{status:502,headers});
}
export async function POST(request:Request):Promise<Response>{
 if(!isJsonMediaType(request.headers.get('content-type')))return Response.json({error:'Unsupported public market request media type.'},{status:415,headers});
 try{if(new URL(request.url).search)throw Error('Query');const body=bodySchema.parse(JSON.parse(await boundedQuoteText(new Response(request.body),128*1024)));const requests=uniqueMarketRequests(body.requests);await serverMarketCache.refresh(requests,body.refresh);const result=requestedEvidence(requests);return Response.json(result,{status:result.quotes.length||!requests.length?200:503,headers});
 }catch{return Response.json({error:'Invalid public market request.'},{status:400,headers});}
}
