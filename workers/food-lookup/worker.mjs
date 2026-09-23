const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const barcode=/^(?:\d{8}|\d{13}|\d{14})$/;
const worker={async fetch(request,env){const url=new URL(request.url);if(request.method!=='GET'||url.pathname!=='/lookup'||[...url.searchParams.keys()].some(k=>k!=='code')||!barcode.test(url.searchParams.get('code')??''))return reply({error:'INVALID_BARCODE'},400);return env.FOOD_BUDGET.get(env.FOOD_BUDGET.idFromName('shared-provider-budget-v1')).fetch(request);}};
export default worker;
export class FoodBudget{
 constructor(state,env){this.state=state;this.env=env;}
 async fetch(request){
  const code=new URL(request.url).searchParams.get('code');if(!barcode.test(code??''))return reply({error:'INVALID_BARCODE'},400);
  if(!/^ZIGoals\/[^\r\n]{1,160}$/.test(this.env.FOOD_USER_AGENT??''))return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
  const now=Date.now(),cache=await this.state.storage.get('cache:'+code);if(cache&&cache.until>now)return reply(cache.body,cache.status);
  const allowed=await this.state.storage.transaction(async s=>{const next=await s.get('next')??0;if(next>now)return false;await s.put('next',now+12000);return true;});
  if(!allowed)return reply({error:'TRY_LATER',retryAfter:12},429);
  // Reservation survives worker death; failures still consume the shared attempt allowance.
  try{
   const res=await fetch('https://world.openfoodfacts.org/api/v3.4/product/'+code+'?fields=code,product_name,brands_tags,nutrition_data_per,nutriments',{headers:{'User-Agent':this.env.FOOD_USER_AGENT,accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)});
   if(res.status===429||res.status===503){await res.body?.cancel();await this.state.storage.put('next',Date.now()+60000);return reply({error:'PROVIDER_THROTTLED',retryAfter:60},429);}
   if(res.status===404){await res.body?.cancel();return reply({error:'NOT_FOUND'},404);}if(!res.ok||!res.headers.get('content-type')?.includes('application/json')){await res.body?.cancel();return reply({error:'PROVIDER_UNAVAILABLE'},502);}
   const reader=res.body?.getReader();if(!reader)throw Error('empty');let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
   try{while(true){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>128000)throw Error('size');text+=decoder.decode(p.value,{stream:true});}text+=decoder.decode();}catch(e){await reader.cancel();throw e;}
   const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid');
   await this.state.storage.put('cache:'+code,{body,status:200,until:Date.now()+86400000});
   const rows=await this.state.storage.list({prefix:'cache:'});if(rows.size>256){const oldest=[...rows].sort((a,b)=>a[1].until-b[1].until).slice(0,rows.size-256).map(([k])=>k);await this.state.storage.delete(oldest);}
   return reply(body);
  }catch{return reply({error:'PROVIDER_UNAVAILABLE'},502);}
 }
}
