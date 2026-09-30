/** @typedef {{FOOD_BUDGET:DurableObjectNamespace,FOOD_USER_AGENT?:string}} Env */
/** @typedef {{body:unknown,status:number,until:number}} Cached */
/** @param {unknown} body @param {number} [status] */
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const barcode=/^(?:\d{8}|\d{13}|\d{14})$/;
// One provider request per 12 s for the whole deployment (at most 5/min, a third of Open Food Facts' 15/min per IP).
// A lookup that finds the slot taken may wait for the next one instead of failing at once, but only one lookup
// waits at a time and never for more than 15 s. A 429/503 from the provider pauses every lookup for 60 s.
const SPACING=12000,MAX_WAIT=15000,MAX_QUEUED=1,BACKOFF=60000;
/** @param {number} ms */
const later=ms=>reply({error:'TRY_LATER',retryAfter:Math.max(1,Math.ceil(ms/1000))},429);
/** @type {ExportedHandler<Env>} */
const worker={async fetch(request,env){const url=new URL(request.url);if(request.method!=='GET'||url.pathname!=='/lookup'||[...url.searchParams.keys()].some(k=>k!=='code')||!barcode.test(url.searchParams.get('code')??''))return reply({error:'INVALID_BARCODE'},400);return env.FOOD_BUDGET.get(env.FOOD_BUDGET.idFromName('shared-provider-budget-v1')).fetch(request);}};
export default worker;
export class FoodBudget{
 /** @param {DurableObjectState} state @param {Env} env */
 constructor(state,env){this.state=state;this.env=env;}
 /** @param {Request} request */
 async fetch(request){
  const code=new URL(request.url).searchParams.get('code');if(!barcode.test(code??''))return reply({error:'INVALID_BARCODE'},400);
  if(!/^ZIGoals\/[^\r\n]{1,160}$/.test(this.env.FOOD_USER_AGENT??''))return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
  const cached=async()=>{const cache=/** @type {Cached|undefined} */(await this.state.storage.get('cache:'+code));return cache&&cache.until>Date.now()?reply(cache.body,cache.status):null;};
  const hit=await cached();if(hit)return hit;
  // Reserve the next free slot: now, or a later one if at most MAX_QUEUED lookups wait and the wait is at most MAX_WAIT.
  const now=Date.now(),slot=await this.state.storage.transaction(async s=>{
   const next=/** @type {number|undefined} */(await s.get('next'))??0,backoff=/** @type {number|undefined} */(await s.get('backoffUntil'))??0;
   if(backoff>now)return {refuse:backoff-now};
   const at=Math.max(now,next),queued=next>now?Math.ceil((next-now)/SPACING)-1:0;
   if(at>now&&(at-now>MAX_WAIT||queued>=MAX_QUEUED))return {refuse:at-now};
   await s.put('next',at+SPACING);return {at};
  });
  if(slot.refuse!==undefined)return later(slot.refuse);
  // Reservation survives worker death; failures still consume the shared attempt allowance.
  if(slot.at>Date.now()){
   await new Promise(resolve=>setTimeout(resolve,slot.at-Date.now()));
   // While this lookup waited, another may have fetched the same product, or the provider may have throttled us.
   const late=await cached();if(late)return late;
   const backoff=/** @type {number|undefined} */(await this.state.storage.get('backoffUntil'))??0;if(backoff>Date.now())return reply({error:'PROVIDER_THROTTLED',retryAfter:Math.ceil((backoff-Date.now())/1000)},429);
  }
  try{
   const res=await fetch('https://world.openfoodfacts.org/api/v3.4/product/'+code+'?fields=code,product_name,brands_tags,nutrition_data_per,nutriments',{headers:{'User-Agent':/** @type {string} checked above */(this.env.FOOD_USER_AGENT),accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)});
   if(res.status===429||res.status===503){await res.body?.cancel();await this.state.storage.transaction(async s=>{const until=Date.now()+BACKOFF;await s.put('backoffUntil',until);if((/** @type {number|undefined} */(await s.get('next'))??0)<until)await s.put('next',until);});return reply({error:'PROVIDER_THROTTLED',retryAfter:BACKOFF/1000},429);}
   if(res.status===404){await res.body?.cancel();return reply({error:'NOT_FOUND'},404);}if(!res.ok||!res.headers.get('content-type')?.includes('application/json')){await res.body?.cancel();return reply({error:'PROVIDER_UNAVAILABLE'},502);}
   const reader=res.body?.getReader();if(!reader)throw Error('empty');let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false});
   try{while(true){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>128000)throw Error('size');text+=decoder.decode(p.value,{stream:true});}text+=decoder.decode();}catch(e){await reader.cancel();throw e;}
   const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid');
   await this.state.storage.put('cache:'+code,{body,status:200,until:Date.now()+86400000});
   const rows=/** @type {Map<string,Cached>} */(await this.state.storage.list({prefix:'cache:'}));if(rows.size>256){const oldest=[...rows].sort((a,b)=>a[1].until-b[1].until).slice(0,rows.size-256).map(([k])=>k);await this.state.storage.delete(oldest);}
   return reply(body);
  }catch{return reply({error:'PROVIDER_UNAVAILABLE'},502);}
 }
}
