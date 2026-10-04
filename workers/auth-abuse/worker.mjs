import {WorkerEntrypoint} from 'cloudflare:workers';
/** @typedef {{ADMISSION:DurableObjectNamespace,AUTH_ADMISSION_KEY?:string,ISOLATED_FIXTURE?:string,LOCAL_TEST_NOW?:string,LOCAL_SHARD_CAPACITY?:string,LOCAL_SWEEP_MS?:string}} AdmissionEnv */
/** @param {unknown} body @param {number} [status] */
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
const admissionWorker={fetch(){return reply({error:'NOT_FOUND'},404);}};
export default admissionWorker;

// [dimension, window ms, limit, cooldown ms]. Unchanged per-email and per-IP limits.
/** @type {Record<'send'|'verify',Record<'email'|'ip',[number,number,number]>>} */
const RULES={send:{email:[86400000,6,60000],ip:[3600000,30,0]},verify:{email:[600000,10,0],ip:[600000,100,0]}};
// One IP group may touch at most this many distinct emails per window.
const DISTINCT_EMAILS_PER_IP={send:10,verify:20};
// Failed code verifications per email per day, on top of the 10 attempts per 10 minutes.
const DAILY_FAILED_VERIFICATIONS=20;
const SHARDS=32;
// Records per shard (32 shards per dimension, so at most 256,000 records across both). Each shard
// is its own Durable Object: no single global object serializes every sign-in.
const SHARD_CAPACITY=4000;
const PRUNE_BATCH=64;
// Retention (Session S, FIX_PLAN C7): while a shard holds records, an alarm removes expired ones at least hourly
// (at most SWEEP_BATCH per run, sooner while more remain), so a shard that is never used again still empties.
const SWEEP_MS=3600000,SWEEP_BATCH=PRUNE_BATCH*4;

/** IPv4 as is; IPv4-mapped IPv6 as IPv4; other IPv6 grouped by /64. Returns null when invalid. */
/** @param {string} raw */
function ipGroup(raw){
 const value=raw.trim().toLowerCase();
 const v4=/** @param {string} text */text=>{const parts=text.split('.');if(parts.length!==4||parts.some(p=>!/^\d{1,3}$/.test(p)||Number(p)>255))return null;return parts.map(Number).join('.');};
 if(!value.includes(':'))return v4(value);
 let text=value;const dotted=/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
 if(dotted){const four=v4(/** @type {string} */(dotted[2]));if(!four)return null;if(/^(?:(?:0{1,4}:){5}|::)ffff:$/.test(/** @type {string} */(dotted[1])))return four;const [a,b,c,d]=/** @type {[number,number,number,number]} v4 returns four parts */(four.split('.').map(Number));text=dotted[1]+((a<<8)|b).toString(16)+':'+((c<<8)|d).toString(16);}
 if(!/^[0-9a-f:]+$/.test(text)||text.split('::').length>2)return null;
 const [head,tail]=text.includes('::')?text.split('::'):[text,null],left=head?head.split(':'):[],right=tail?tail.split(':'):[];
 if([...left,...right].some(h=>!/^[0-9a-f]{1,4}$/.test(h)))return null;
 const missing=8-left.length-right.length;if(tail===null?missing!==0:missing<1)return null;
 const groups=[...left,...Array(tail===null?0:missing).fill('0'),...right];return 'v6:'+groups.slice(0,4).map(h=>h.padStart(4,'0')).join(':')+'::/64';
}
/** @param {string} hash */
const shardOf=hash=>parseInt(hash.slice(0,4),16)%SHARDS;

/** Named service only. Raw addresses never enter durable storage or logs. */
/** @extends {WorkerEntrypoint<AdmissionEnv>} */
export class AdmissionService extends WorkerEntrypoint{
 /** @param {Request} request */
 async fetch(request){
  if(request.method!=='POST')return reply({error:'INVALID_ADMISSION'},400);
  /** @type {any} */
  let input;try{const reader=request.body?.getReader();if(!reader)throw Error();let raw='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true,ignoreBOM:false});for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1024){await reader.cancel();throw Error();}raw+=decoder.decode(part.value,{stream:true});}input=JSON.parse(raw+decoder.decode());}catch{return reply({error:'INVALID_ADMISSION'},400);}
  if(!['send','verify','verify-failed'].includes(input?.action)||typeof input.email!=='string'||input.email.length>254||!/^\S+@\S+\.\S+$/.test(input.email)||typeof input.ip!=='string'||input.ip.length>64||!/^[:.0-9a-f]+$/i.test(input.ip))return reply({error:'INVALID_ADMISSION'},400);
  const group=ipGroup(input.ip);if(!group)return reply({error:'INVALID_ADMISSION'},400);
  if(typeof this.env.AUTH_ADMISSION_KEY!=='string'||this.env.AUTH_ADMISSION_KEY.length<32)return reply({error:'ADMISSION_SETUP_REQUIRED'},503);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(this.env.AUTH_ADMISSION_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=/** @param {string} value */async value=>[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const email=await hash('email:'+input.email.trim().toLowerCase()),ip=await hash('ip:'+group);
  const shard=/** @param {string} dimension @param {string} value */(dimension,value)=>this.env.ADMISSION.get(this.env.ADMISSION.idFromName(`auth-admission-v2:${dimension}:${shardOf(value)}`));
  const call=/** @param {string} dimension @param {string} value */(dimension,value)=>shard(dimension,value).fetch(new Request('https://internal/admit',{method:'POST',body:JSON.stringify({action:input.action,dimension,key:value,email})}));
  // A failed verification is recorded against the email only.
  if(input.action==='verify-failed')return call('email',email);
  // IP first: an IP that is over its limits never consumes the email's budget. Both reserve
  // before provider I/O, including attempts that later fail.
  const byIp=await call('ip',ip);if(!byIp.ok)return byIp;await byIp.body?.cancel();
  return call('email',email);
 }
}

/** @param {number} n */
const pad=n=>String(n).padStart(16,'0');
export class AdmissionAuthority{
 /** @param {RecordState} state @param {AdmissionEnv} env */
 constructor(state,env){this.state=state;this.env=env;}
 now(){return this.env.ISOLATED_FIXTURE==='true'?Number(this.env.LOCAL_TEST_NOW):Date.now();}
 /** Alarm spacing on the real clock; only an isolated test may shorten it. */
 sweepMs(){const local=Number(this.env.LOCAL_SWEEP_MS);return this.env.ISOLATED_FIXTURE==='true'&&Number.isSafeInteger(local)&&local>0?local:SWEEP_MS;}
 /** Removes expired records through the expiry index, as a request does, and re-arms while records remain. */
 async alarm(){
  const observed=this.now();
  const more=await this.state.storage.transaction(async store=>{
   const last=await store.get('clock')??0;if(!Number.isSafeInteger(observed)||observed<last)return true;
   let count=await store.get('count')??0;
   const due=await store.list({prefix:'x:',end:'x:'+pad(observed+1),limit:SWEEP_BATCH});
   for(const [indexKey,recordKey]of due){const until=Number(indexKey.slice(2,18)),record=await store.get(recordKey);await store.delete(indexKey);if(record&&record.until===until){await store.delete(recordKey);count--;}}
   if(due.size)await store.put('count',Math.max(0,count));
   if(due.size===SWEEP_BATCH)return 'soon';
   return (await store.list({prefix:'x:',limit:1})).size>0;
  });
  if(more)await this.state.storage.setAlarm(Date.now()+(more==='soon'?1000:this.sweepMs()));
 }
 /** @param {Request} request */
 async fetch(request){
  const body=await request.json();
  if(!['send','verify','verify-failed'].includes(body.action)||!['email','ip'].includes(body.dimension)||body.action==='verify-failed'&&body.dimension!=='email'||![body.key,body.email].every(v=>/^[a-f0-9]{64}$/.test(v??'')))return reply({error:'INVALID_ADMISSION'},400);
  const observed=this.now();
  // A shard that holds records always has a sweep pending.
  if(await this.state.storage.getAlarm()===null)await this.state.storage.setAlarm(Date.now()+this.sweepMs());
  return this.state.storage.transaction(async store=>{
   const last=await store.get('clock')??0;if(!Number.isSafeInteger(observed)||observed<last)return reply({error:'ADMISSION_CLOCK_UNAVAILABLE'},503);await store.put('clock',observed);
   let count=await store.get('count')??0;
   // Remove at most PRUNE_BATCH expired records per request, found through the expiry index.
   // An index entry whose record was since renewed only removes itself.
   const remove=/** @param {Iterable<[string,any]>} entries */async entries=>{for(const [indexKey,recordKey]of entries){const until=Number(indexKey.slice(2,18)),record=await store.get(recordKey);await store.delete(indexKey);if(record&&record.until===until){await store.delete(recordKey);count--;}}};
   await remove(await store.list({prefix:'x:',end:'x:'+pad(observed+1),limit:PRUNE_BATCH}));
   const recordKey=body.action==='verify-failed'?'f:'+body.key:'r:'+body.action+':'+body.dimension+':'+body.key,stored=await store.get(recordKey),current=stored&&stored.until>observed?stored:undefined;
   /** @type {{until:number,count:number,next:number,emails?:string[]}} */
   let next;
   if(body.action==='verify-failed'){next={until:current?.until??observed+86400000,count:(current?.count??0)+1,next:0};}
   else{
    const [window,limit,cooldown]=RULES[/** @type {'send'|'verify'} */(body.action)][/** @type {'email'|'ip'} */(body.dimension)];
    if(current&&(current.count>=limit||current.next>observed))return reply({error:'TRY_LATER'},429);
    const tag=body.email.slice(0,16),emails=current?.emails??[];
    if(body.dimension==='ip'&&!emails.includes(tag)&&emails.length>=DISTINCT_EMAILS_PER_IP[/** @type {'send'|'verify'} */(body.action)])return reply({error:'TRY_LATER'},429);
    if(body.dimension==='email'&&body.action==='verify'){const failed=await store.get('f:'+body.key);if(failed&&failed.until>observed&&failed.count>=DAILY_FAILED_VERIFICATIONS)return reply({error:'TRY_LATER'},429);
     // An expired record is removed when it is read; its index entry goes with the next sweep.
     if(failed&&failed.until<=observed){await store.delete('f:'+body.key);count--;await store.put('count',count);}}
    next={until:current?.until??observed+window,count:(current?.count??0)+1,next:observed+cooldown,...(body.dimension==='ip'?{emails:emails.includes(tag)?emails:[...emails,tag]}:{})};
   }
   const capacity=this.env.ISOLATED_FIXTURE==='true'&&this.env.LOCAL_SHARD_CAPACITY?Number(this.env.LOCAL_SHARD_CAPACITY):SHARD_CAPACITY;
   if(!stored&&count>=capacity){
    // Full shard: evict the soonest-expiring records that are safe to forget, so filling a shard
    // cannot block sign-in. IP records and per-email send records are evictable (worst case: an
    // extra code email). Per-email verification and failed-code records are never evicted, since
    // that would reset code-guessing limits; if only those remain, new keys here wait (503).
    const evictable=/** @param {string} recordKey */recordKey=>recordKey.startsWith('r:send:')||recordKey.startsWith('r:verify:ip:');
    await remove([...(await store.list({prefix:'x:',limit:PRUNE_BATCH*4}))].filter(([,recordKey])=>evictable(recordKey)).slice(0,PRUNE_BATCH));
    if(count>=capacity)return reply({error:'ADMISSION_CAPACITY'},503);
   }
   const writes=/** @type {Record<string,unknown>} */({[recordKey]:next});if(next.until!==stored?.until)writes['x:'+pad(next.until)+':'+recordKey]=recordKey;
   if(!stored)count++;writes.count=count;
   await store.put(writes);return reply({allowed:true});
  });
 }
}
