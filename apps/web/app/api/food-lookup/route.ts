import {getCloudflareContext} from '@opennextjs/cloudflare';
import {normalizeBarcode,parseFoodProduct} from '../../../lib/food-lookup';
import {isFoodSearchLang,normalizeFoodQuery,parseFoodSearch} from '../../../lib/food-search';
import {marketClientGroup} from '../../../lib/server/market-client-address';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200,extra:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...extra}});
/** One call to the food Worker. A 429 is answered here, keeping the Worker's wait; otherwise its status and parsed body. */
async function callWorker(request:Request,path:string):Promise<Response|{status:number;ok:boolean;data:unknown}>{
 const {env}=await getCloudflareContext({async:true});const binding=(env as unknown as {FOOD_LOOKUP?:{fetch:(request:Request)=>Promise<Response>}}).FOOD_LOOKUP;
 if(!binding)return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
 // The food Worker's per-client share counts against the edge address group (IPv4, or IPv6 by /48), taken only from
 // Cloudflare's cf-connecting-ip. A new request is built, so an x-food-client header the caller sent never travels.
 const client=marketClientGroup(request.headers.get('cf-connecting-ip'));
 const res=await binding.fetch(new Request('https://food.internal'+path,{headers:client?{'x-food-client':client}:{}}));
 const raw=await res.text();if(new TextEncoder().encode(raw).length>128000)throw Error('size');const data:unknown=JSON.parse(raw);
 // A 429 keeps the Worker's wait in seconds, in the body and as Retry-After, for the scanner to show.
 if(res.status===429){const wait=(data as {retryAfter?:unknown}|null)?.retryAfter;const retryAfter=typeof wait==='number'&&Number.isSafeInteger(wait)&&wait>0&&wait<=86400?wait:60;return reply({error:'TRY_LATER',retryAfter},429,{'Retry-After':String(retryAfter)});}
 return {status:res.status,ok:res.ok,data};
}
export async function GET(request:Request){
 const url=new URL(request.url);
 if(url.searchParams.has('q'))return search(request,url);
 let code:string;try{if([...url.searchParams.keys()].some(k=>k!=='code'))throw Error('query');code=normalizeBarcode(url.searchParams.get('code')??'');}catch{return reply({error:'INVALID_BARCODE'},400);}
 try{
  const answer=await callWorker(request,'/lookup?code='+code);if(answer instanceof Response)return answer;
  if(!answer.ok)return reply({error:[404,503].includes(answer.status)?answer.status===404?'NOT_FOUND':'PROVIDER_SETUP_REQUIRED':'PROVIDER_UNAVAILABLE'},answer.status);
  return reply(parseFoodProduct(answer.data,code));
 }catch{return reply({error:'PROVIDER_UNAVAILABLE'},503);}
}
/** Session AJ (item 22, TIER 3 egress routes): `?q=<words>&lang=en|de|fr|it` searches the Swiss Food Composition Database
 * through the food Worker's /search, with the same client share, wait and size limit as the barcode lookup. */
async function search(request:Request,url:URL){
 let q:string,lang:string;
 try{
  const keys=[...url.searchParams.keys()];if(keys.some(k=>k!=='q'&&k!=='lang')||keys.filter(k=>k==='q').length!==1||keys.filter(k=>k==='lang').length>1)throw Error('query');
  q=normalizeFoodQuery(url.searchParams.get('q')??'');lang=url.searchParams.get('lang')??'en';if(!isFoodSearchLang(lang))throw Error('lang');
 }catch{return reply({error:'INVALID_QUERY'},400);}
 try{
  const answer=await callWorker(request,'/search?'+new URLSearchParams({q,lang}));if(answer instanceof Response)return answer;
  if(!answer.ok)return reply({error:answer.status===503?'PROVIDER_SETUP_REQUIRED':'PROVIDER_UNAVAILABLE'},answer.status===503?503:502);
  return reply(parseFoodSearch(answer.data));
 }catch{return reply({error:'PROVIDER_UNAVAILABLE'},503);}
}
