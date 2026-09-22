import {isJsonMediaType} from '../../../lib/json-media-type';
import {z} from 'zod';
import {boundedQuoteText} from '../../../lib/market-quotes';
import {marketRequestsSchema,nativeZigRequest,marketRequestKey} from '../../../lib/market-assets';
import {serverMarketCache} from '../../../lib/server/market-service';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const bodySchema=z.object({requests:marketRequestsSchema,refresh:z.boolean().optional()}).strict();
export async function GET(request:Request):Promise<Response>{
 if(new URL(request.url).search)return Response.json({error:'Unsupported public market query.'},{status:400,headers});
 await serverMarketCache.refresh([nativeZigRequest]);const {quotes,error}=serverMarketCache.getSnapshot();const quote=quotes.find(q=>q.providerAssetId==='zignaly'&&q.currency==='USD'&&q.marketRef?.kind==='coin');
 return quote?Response.json({quote,error},{headers}):Response.json({error:'Verified market valuation unavailable. Previous local evidence is unchanged.'},{status:502,headers});
}
export async function POST(request:Request):Promise<Response>{
 if(!isJsonMediaType(request.headers.get('content-type')))return Response.json({error:'Unsupported public market request media type.'},{status:415,headers});
 try{if(new URL(request.url).search)throw Error('Query');const body=bodySchema.parse(JSON.parse(await boundedQuoteText(new Response(request.body),128*1024)));await serverMarketCache.refresh(body.requests,body.refresh);const {quotes,error}=serverMarketCache.getSnapshot();const keys=new Set(body.requests.map(marketRequestKey));const selected=quotes.filter(q=>q.marketRef&&keys.has(marketRequestKey({marketRef:q.marketRef,currency:q.currency as 'USD'|'EUR'})));return Response.json({quotes:selected,error},{status:selected.length||!body.requests.length?200:503,headers});
 }catch{return Response.json({error:'Invalid public market request.'},{status:400,headers});}
}
