import {getCloudflareContext} from '@opennextjs/cloudflare';
import {normalizeBarcode,parseFoodProduct} from '../../../lib/food-lookup';
export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
export async function GET(request:Request){
 const url=new URL(request.url);let code:string;try{if([...url.searchParams.keys()].some(k=>k!=='code'))throw Error('query');code=normalizeBarcode(url.searchParams.get('code')??'');}catch{return reply({error:'INVALID_BARCODE'},400);}
 try{
  const {env}=await getCloudflareContext({async:true});const binding=(env as unknown as {FOOD_LOOKUP?:{fetch:(request:Request)=>Promise<Response>}}).FOOD_LOOKUP;
  if(!binding)return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
  const res=await binding.fetch(new Request('https://food.internal/lookup?code='+code));
  const raw=await res.text();if(new TextEncoder().encode(raw).length>128000)throw Error('size');const data=JSON.parse(raw);
  if(!res.ok)return reply({error:[404,429,503].includes(res.status)?res.status===404?'NOT_FOUND':res.status===429?'TRY_LATER':'PROVIDER_SETUP_REQUIRED':'PROVIDER_UNAVAILABLE'},res.status);
  return reply(parseFoodProduct(data,code));
 }catch{return reply({error:'PROVIDER_UNAVAILABLE'},503);}
}
