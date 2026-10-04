/** @typedef {{FOOD_BUDGET:DurableObjectNamespace,FOOD_USER_AGENT?:string,ISOLATED_FIXTURE?:string,LOCAL_TEST_NOW?:string,LOCAL_SWEEP_MS?:string}} Env */
/** @typedef {{body:unknown,status:number,until:number}} Cached */
/** @typedef {{buckets:Record<string,{n:number,recent:number[]}>}} FoodDay */
/** @param {unknown} body @param {number} [status] */
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const barcode=/^(?:\d{8}|\d{13}|\d{14})$/;
// One provider request per 12 s for the whole deployment (at most 5/min, a third of Open Food Facts' 15/min per IP).
// A lookup that finds the slot taken may wait for the next one instead of failing at once, but only one lookup
// waits at a time and never for more than 15 s. A 429/503 from the provider pauses every lookup for 60 s.
const SPACING=12000,MAX_WAIT=15000,MAX_QUEUED=1,BACKOFF=60000;
// Found products are kept 24 h; an unknown barcode (provider 404) 1 h, so repeating it uses no slot (Session S, FIX_PLAN C3).
const FOUND_MS=86400000,NOT_FOUND_MS=3600000,MAX_CACHED=256;
// Per client (Session S): at most 3 provider lookups in any rolling minute and 120 per UTC day, inside the global slot
// spacing above. A person scanning several products in a row succeeds while nobody else scans. Cache hits never count.
const CLIENT_MINUTE=3,CLIENT_DAY=120;
// Retention (Session S, FIX_PLAN C7): an expired answer is deleted when it is read, and while anything is stored an
// alarm deletes expired answers, day rows older than yesterday and an earlier day's client key at least hourly.
const SWEEP_MS=3600000;
// The app's address group (market-client-address.ts): an IPv4 address, or an IPv6 /48. Anything else is refused.
const CLIENT_GROUP=/^(?:v4:(?:\d{1,3}\.){3}\d{1,3}|v6:[0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}::\/48)$/;
const KEY_ROW='food-client-key',DAY_INDEX='food-days',dayRow=/** @param {string} day */day=>'food-day:'+day;
/** @param {number} at */
const utcDay=at=>new Date(at).toISOString().slice(0,10);
/** @param {number} ms */
const later=ms=>reply({error:'TRY_LATER',retryAfter:Math.max(1,Math.ceil(ms/1000))},429);
/** @type {ExportedHandler<Env>} */
const worker={async fetch(request,env){const url=new URL(request.url);if(request.method!=='GET'||url.pathname!=='/lookup'||[...url.searchParams.keys()].some(k=>k!=='code')||!barcode.test(url.searchParams.get('code')??''))return reply({error:'INVALID_BARCODE'},400);return env.FOOD_BUDGET.get(env.FOOD_BUDGET.idFromName('shared-provider-budget-v1')).fetch(request);}};
export default worker;
/** A client is one of 4,096 buckets: the first 12 bits of an HMAC-SHA256 of its address group under a random key that is
 * replaced every UTC day. Neither the address nor the group is stored, and once the day's key is replaced no stored
 * bucket can be linked to an address again. The same pattern as the market coordinator (Session R1). @param {string} key @param {string} group */
async function bucketOf(key,group){
 const hmac=await crypto.subtle.importKey('raw',new Uint8Array(/** @type {RegExpMatchArray} 64 hex characters */(key.match(/../g)).map(h=>parseInt(h,16))),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=new Uint8Array(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(group)));
 return 'b'+(((/** @type {number} */(mac[0]))<<4)|((/** @type {number} */(mac[1]))>>4)).toString(16).padStart(3,'0');
}
export class FoodBudget{
 /** @param {DurableObjectState} state @param {Env} env */
 constructor(state,env){this.state=state;this.env=env;}
 /** The fixture clock only in isolated tests, as in the admission and market Workers. */
 now(){return this.env.ISOLATED_FIXTURE==='true'?Number(this.env.LOCAL_TEST_NOW):Date.now();}
 /** @param {Request} request */
 async fetch(request){
  const code=new URL(request.url).searchParams.get('code');if(!barcode.test(code??''))return reply({error:'INVALID_BARCODE'},400);
  if(!/^ZIGoals\/[^\r\n]{1,160}$/.test(this.env.FOOD_USER_AGENT??''))return reply({error:'PROVIDER_SETUP_REQUIRED'},503);
  const group=request.headers.get('x-food-client');if(group!==null&&!CLIENT_GROUP.test(group))return reply({error:'INVALID_CLIENT'},400);
  const cached=async()=>{
   const cache=/** @type {Cached|undefined} */(await this.state.storage.get('cache:'+code));if(!cache)return null;
   if(cache.until>this.now())return reply(cache.body,cache.status);
   await this.state.storage.delete('cache:'+code);return null;
  };
  const hit=await cached();if(hit)return hit;
  const now=this.now(),day=utcDay(now);
  // Reserve the next free slot: now, or a later one if at most MAX_QUEUED lookups wait and the wait is at most MAX_WAIT.
  // The client's share is checked first and counted only when a slot is granted.
  const slot=await this.state.storage.transaction(async s=>{
   /** @type {FoodDay|undefined} */
   let usage;let recent=/** @type {number[]} */([]);
   // The day's client key, made on first use and stored with the first lookup that uses it.
   let key=group?/** @type {{day:string,key:string}|undefined} */(await s.get(KEY_ROW)):undefined;
   if(group&&(key?.day!==day||!/^[0-9a-f]{64}$/.test(key.key)))key={day,key:[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('')};
   const bucket=group&&key?await bucketOf(key.key,group):undefined;
   if(bucket){
    usage=(await s.get(dayRow(day)))??{buckets:{}};const mine=usage.buckets[bucket]??{n:0,recent:[]};recent=mine.recent.filter(at=>at>now-60000);
    if(mine.n>=CLIENT_DAY)return {refuse:Date.parse(day+'T00:00:00Z')+86400000-now};
    if(recent.length>=CLIENT_MINUTE)return {refuse:Math.min(...recent)+60000-now};
   }
   const next=/** @type {number|undefined} */(await s.get('next'))??0,backoff=/** @type {number|undefined} */(await s.get('backoffUntil'))??0;
   if(backoff>now)return {refuse:backoff-now};
   const at=Math.max(now,next),queued=next>now?Math.ceil((next-now)/SPACING)-1:0;
   if(at>now&&(at-now>MAX_WAIT||queued>=MAX_QUEUED))return {refuse:at-now};
   await s.put('next',at+SPACING);
   if(bucket&&usage&&key){
    const mine=usage.buckets[bucket]??{n:0,recent:[]};
    await s.put(dayRow(day),{buckets:{...usage.buckets,[bucket]:{n:mine.n+1,recent:[...recent,now]}}});
    await s.put(KEY_ROW,key);
    // Day rows older than yesterday go, at most 4 per lookup, so none outlives about 48 hours of use.
    const days=/** @type {string[]} */((await s.get(DAY_INDEX))??[]),old=days.filter(d=>d<utcDay(now-86400000)).slice(0,4);
    for(const d of old)await s.delete(dayRow(d));
    await s.put(DAY_INDEX,[...new Set([...days.filter(d=>!old.includes(d)),day])].sort());
   }
   return {at};
  });
  if(slot.refuse!==undefined)return later(slot.refuse);
  await this.armSweep();
  // Reservation survives worker death; failures still consume the shared attempt allowance.
  if(slot.at>this.now()){
   await new Promise(resolve=>setTimeout(resolve,slot.at-this.now()));
   // While this lookup waited, another may have fetched the same product, or the provider may have throttled us.
   const late=await cached();if(late)return late;
   const backoff=/** @type {number|undefined} */(await this.state.storage.get('backoffUntil'))??0;if(backoff>this.now())return reply({error:'PROVIDER_THROTTLED',retryAfter:Math.ceil((backoff-this.now())/1000)},429);
  }
  try{
   const res=await fetch('https://world.openfoodfacts.org/api/v3.4/product/'+code+'?fields=code,product_name,brands_tags,nutrition_data_per,nutriments',{headers:{'User-Agent':/** @type {string} checked above */(this.env.FOOD_USER_AGENT),accept:'application/json'},redirect:'manual',signal:AbortSignal.timeout(8000)});
   if(res.status===429||res.status===503){await res.body?.cancel();await this.state.storage.transaction(async s=>{const until=this.now()+BACKOFF;await s.put('backoffUntil',until);if((/** @type {number|undefined} */(await s.get('next'))??0)<until)await s.put('next',until);});return reply({error:'PROVIDER_THROTTLED',retryAfter:BACKOFF/1000},429);}
   if(res.status===404){await res.body?.cancel();const body={error:'NOT_FOUND'};await this.remember(code,body,404,NOT_FOUND_MS);return reply(body,404);}
   if(!res.ok||!res.headers.get('content-type')?.includes('application/json')){await res.body?.cancel();return reply({error:'PROVIDER_UNAVAILABLE'},502);}
   const reader=res.body?.getReader();if(!reader)throw Error('empty');let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false});
   try{while(true){const p=await reader.read();if(p.done)break;size+=p.value.length;if(size>128000)throw Error('size');text+=decoder.decode(p.value,{stream:true});}text+=decoder.decode();}catch(e){await reader.cancel();throw e;}
   const body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid');
   await this.remember(code,body,200,FOUND_MS);
   return reply(body);
  }catch{return reply({error:'PROVIDER_UNAVAILABLE'},502);}
 }
 /** Alarm spacing on the real clock; only an isolated test may shorten it. */
 sweepMs(){const local=Number(this.env.LOCAL_SWEEP_MS);return this.env.ISOLATED_FIXTURE==='true'&&Number.isSafeInteger(local)&&local>0?local:SWEEP_MS;}
 async armSweep(){if(await this.state.storage.getAlarm()===null)await this.state.storage.setAlarm(Date.now()+this.sweepMs());}
 /** Deletes what has outlived its use, and re-arms while anything that can expire is still stored. */
 async alarm(){
  const now=this.now(),today=utcDay(now),yesterday=utcDay(now-86400000);
  const left=await this.state.storage.transaction(async s=>{
   const rows=/** @type {Map<string,Cached>} */(await s.list({prefix:'cache:'})),expired=[...rows].filter(([,row])=>!(row.until>now)).map(([key])=>key);
   if(expired.length)await s.delete(expired);
   const days=/** @type {string[]} */((await s.get(DAY_INDEX))??[]),old=days.filter(d=>d<yesterday);
   for(const d of old)await s.delete(dayRow(d));
   if(old.length)await s.put(DAY_INDEX,days.filter(d=>!old.includes(d)));
   const key=/** @type {{day:string}|undefined} */(await s.get(KEY_ROW));if(key&&key.day<today)await s.delete(KEY_ROW);
   return rows.size-expired.length+days.length-old.length;
  });
  if(left>0)await this.state.storage.setAlarm(Date.now()+this.sweepMs());
 }
 /** Caches an answer (found or not found); keeps at most MAX_CACHED, dropping the soonest to expire.
  * @param {string|null} code @param {unknown} body @param {number} status @param {number} ms */
 async remember(code,body,status,ms){
  await this.state.storage.put('cache:'+code,{body,status,until:this.now()+ms});
  const rows=/** @type {Map<string,Cached>} */(await this.state.storage.list({prefix:'cache:'}));if(rows.size>MAX_CACHED){const oldest=[...rows].sort((a,b)=>a[1].until-b[1].until).slice(0,rows.size-MAX_CACHED).map(([k])=>k);await this.state.storage.delete(oldest);}
 }
}
