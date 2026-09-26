import {marketRuntime} from '../../../../lib/server/market-runtime';
import {boundedQuoteText} from '../../../../lib/market-quotes';
import {isJsonMediaType} from '../../../../lib/json-media-type';
export const dynamic='force-dynamic';
const headers={'cache-control':'no-store','referrer-policy':'no-referrer'};
/** A random request capability grants only cancellation of its own followers.
 * This route has no provider access, account identity or owner cancellation. */
export async function POST(request:Request){
 if(new URL(request.url).search||!isJsonMediaType(request.headers.get('content-type')))return new Response(null,{status:400,headers});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return new Response(null,{status:403,headers});
 let cancelToken:string;
 try{const raw=JSON.parse(await boundedQuoteText(new Response(request.body),256));if(Object.keys(raw).length!==1||typeof raw.cancelToken!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.cancelToken))throw Error();cancelToken=raw.cancelToken;}catch{return new Response(null,{status:400,headers});}
 const runtime=await marketRuntime();if(runtime.mode!=='durable')return new Response(null,{status:503,headers});
 try{const response=await runtime.binding.fetch(new Request('https://market.internal/cancel',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({cancelToken})}));const result=JSON.parse(await boundedQuoteText(response,1024));return new Response(null,{status:response.ok&&result.ok===true?204:503,headers});}catch{return new Response(null,{status:503,headers});}
}
