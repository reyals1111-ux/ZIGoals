import {getCloudflareContext} from '@opennextjs/cloudflare';
import {normalizeBarcode,parseFoodProduct} from '../../../lib/food-lookup';
import {marketClientGroup} from '../../../lib/server/market-client-address';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200,extra:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...extra}});
export async function GET(request:Request){
 const url=new URL(request.url);let code:string;try{if([...url.searchParams.keys()].some(k=>k!=='code'))throw Error('query');code=normalizeBarcode(url.searchParams.get('code')??'');}catch{return reply({error:'INVALID_BARCODE'},400);}
 try{
  const {env}=await getCloudflareContext({async:true});const binding=(env as unknown as {FOOD_LOOKUP?:{fetch:(request:Request)=>Promise<Response>}}).FOOD_LOOKUP;
  if(!binding)return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
  // The food Worker's per-client share counts against the edge address group (IPv4, or IPv6 by /48), taken only from
  // Cloudflare's cf-connecting-ip. A new request is built, so an x-food-client header the caller sent never travels.
  const client=marketClientGroup(request.headers.get('cf-connecting-ip'));
  const res=await binding.fetch(new Request('https://food.internal/lookup?code='+code,{headers:client?{'x-food-client':client}:{}}));
  const raw=await res.text();if(new TextEncoder().encode(raw).length>128000)throw Error('size');const data=JSON.parse(raw);
  // A 429 keeps the Worker's wait in seconds, in the body and as Retry-After, for the scanner to show.
  if(res.status===429){const retryAfter=Number.isSafeInteger(data?.retryAfter)&&data.retryAfter>0&&data.retryAfter<=86400?data.retryAfter as number:60;return reply({error:'TRY_LATER',retryAfter},429,{'Retry-After':String(retryAfter)});}
  if(!res.ok)return reply({error:[404,503].includes(res.status)?res.status===404?'NOT_FOUND':'PROVIDER_SETUP_REQUIRED':'PROVIDER_UNAVAILABLE'},res.status);
  return reply(parseFoodProduct(data,code));
 }catch{return reply({error:'PROVIDER_UNAVAILABLE'},503);}
}
