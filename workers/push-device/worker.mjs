import {boundedJSON,response} from '../push-reminders/verify.mjs';
import {b64url,importVapidKey,jwkPoint,vapidAuthorization} from '../push-reminders/webpush.mjs';
import {inQuietWindow,nextDue,wallClock,zoneSupported,TIME} from '../push-reminders/clock.mjs';
import {allowedEndpoint,parseExtraHosts} from '../push-reminders/hosts.mjs';
import {DEVICE_ID,DEVICE_LIMITS as L,DEVICE_SECRET} from './limits.mjs';
/**
 * Device push for the public Alpha (ADR-036 Q3, owner decision D1; a sibling of ADR-010's account Worker, which stays
 * untouched). A device registers with no account: a random id, a random secret (kept here only as its SHA-256), its push
 * endpoint, its IANA zone, its quiet hours and its WAKE TIMES — recurring minutes of the day on a weekday mask, plus a
 * few one-off minutes and minutes to skip. No label, no kind, no count, no content: the server never learns what a
 * reminder is about. Each wake sends a push with NO payload (VAPID only); the service worker wakes, reads the device's
 * own snapshot and composes the text there (A1, A2).
 * Limits: one SQLite Durable Object per device (PushDevice) and one for the whole deployment (PushBudget: new
 * registrations per hour, sends per day). The kill switch is ON unless KILL_SWITCH is exactly "off": then nothing is
 * registered or sent, while DELETE always works. Nothing is logged (observability off); no IP or user agent is kept.
 * @typedef {{PUSH_DEVICES:DurableObjectNamespace,PUSH_BUDGET:DurableObjectNamespace,APP_ORIGIN?:string,VAPID_SUBJECT?:string,VAPID_PRIVATE_KEY?:string,PUSH_ALLOWED_HOSTS?:string,KILL_SWITCH?:string,ISOLATED_FIXTURE?:string}} DeviceEnv
 * @typedef {{m:number,d:number}} Wake
 * @typedef {{v:1,hash:string,endpoint:string,zone:string,quiet:{from:string,to:string},wakes:Wake[],once:number[],skips:number[],created:number,refreshed:number,next:number|null,last:number|null,day:string,count:number,failures:number,puts:{hour:number,n:number},tests:{hour:number,n:number}}} DeviceRecord
 */
const ROUTES=['/v1/key','/v1/device','/v1/device/test','/v1/device/fixture'];
/** @param {DeviceEnv} env */
export const killed=env=>env.KILL_SWITCH!=='off';
/** The VAPID private JWK from the secret, or null. @param {DeviceEnv} env */
function vapidJwk(env){try{const jwk=JSON.parse(env.VAPID_PRIVATE_KEY??'');return jwk&&typeof jwk==='object'&&jwk.kty==='EC'&&jwk.crv==='P-256'&&typeof jwk.d==='string'&&typeof jwk.x==='string'&&typeof jwk.y==='string'?jwk:null;}catch{return null;}}
/** @param {DeviceEnv} env */
function configured(env){
 if(!/^https:\/\/[^\s/]+$/.test(env.APP_ORIGIN??'')&&!/^http:\/\/127\.0\.0\.1:\d+$/.test(env.APP_ORIGIN??''))return false;
 if(!vapidJwk(env)||!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s/]+)$/.test(env.VAPID_SUBJECT??''))return false;
 try{parseExtraHosts(env.PUSH_ALLOWED_HOSTS);return true;}catch{return false;}
}
/** @param {any} value @param {string[]} keys */
function exact(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));}
const minute=/** @param {unknown} v */v=>Number.isSafeInteger(v)&&/** @type {number} */(v)>0&&/** @type {number} */(v)<1e8;
/** @param {any} w */
const validWake=w=>exact(w,['m','d'])&&Number.isSafeInteger(w.m)&&w.m>=0&&w.m<1440&&Number.isSafeInteger(w.d)&&w.d>=1&&w.d<=127;
/** @param {number} m */
export const clockOf=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
/**
 * A registration body, checked: everything the device may say, and nothing else. One-off wakes and skips are epoch
 * minutes; one-offs within the next 31 days, skips within the next 3; duplicates refused.
 * @param {any} body @param {number} now
 */
export function validRegistration(body,now){
 if(!exact(body,['id','secret','endpoint','zone','quiet','wakes','once','skips']))return null;
 if(typeof body.id!=='string'||!DEVICE_ID.test(body.id)||typeof body.secret!=='string'||!DEVICE_SECRET.test(body.secret))return null;
 if(!zoneSupported(body.zone)||!exact(body.quiet,['from','to'])||typeof body.quiet.from!=='string'||!TIME.test(body.quiet.from)||typeof body.quiet.to!=='string'||!TIME.test(body.quiet.to))return null;
 if(!Array.isArray(body.wakes)||!Array.isArray(body.once)||!Array.isArray(body.skips))return null;
 if(body.wakes.length+body.once.length>L.wakes||body.skips.length>L.skips)return null;
 if(!body.wakes.every(validWake)||new Set(body.wakes.map(/** @param {Wake} w */w=>w.m+':'+w.d)).size!==body.wakes.length)return null;
 const nowMin=Math.floor(now/60000);
 if(!body.once.every(minute)||new Set(body.once).size!==body.once.length||body.once.some(/** @param {number} m */m=>m<nowMin-1||m*60000>now+L.onceAheadMs))return null;
 if(!body.skips.every(minute)||new Set(body.skips).size!==body.skips.length||body.skips.some(/** @param {number} m */m=>m*60000>now+L.skipAheadMs))return null;
 return {id:body.id,secret:body.secret,endpoint:body.endpoint,zone:body.zone,quiet:{from:body.quiet.from,to:body.quiet.to},wakes:body.wakes.map(/** @param {Wake} w */w=>({m:w.m,d:w.d})),once:[...body.once].sort((a,b)=>a-b),skips:[...body.skips].filter(m=>m*60000>=now-3_600_000).sort((a,b)=>a-b)};
}
/**
 * The next instant at or after `from` when this device should wake: the earliest recurring wake (in the device's zone,
 * DST-aware through clock.mjs) or one-off wake, leaving out the minutes the device asked to skip. Null when none.
 * @param {{zone:string,wakes:Wake[],once:number[],skips:number[]}} device @param {number} from
 */
export function nextWake(device,from){
 const skip=new Set(device.skips);let best=null;
 for(const w of device.wakes){
  let t=from;
  for(let n=0;n<16;n++){const at=nextDue({time:clockOf(w.m),zone:device.zone,weekdays:w.d},t);if(at===null)break;if(!skip.has(Math.floor(at/60000))){if(best===null||at<best)best=at;break;}t=at+60_000;}
 }
 for(const m of device.once){const at=m*60000;if(at>=from&&!skip.has(m)&&(best===null||at<best))best=at;}
 return best;
}
/** Hex SHA-256 of a device secret. @param {string} secret */
async function digest(secret){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
/** Constant-time comparison of two equal-length hex strings. @param {string} a @param {string} b */
function same(a,b){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}

/** @type {ExportedHandler<DeviceEnv>} */
const deviceWorker={async fetch(request,env){
 const url=new URL(request.url);
 if(!ROUTES.includes(url.pathname))return response({error:'NOT_FOUND'},404);
 if(!configured(env))return response({error:'HOSTED_CONFIGURATION_REQUIRED'},503);
 if(request.headers.get('origin')!==env.APP_ORIGIN)return response({error:'ORIGIN_DENIED'},403);
 if(url.pathname==='/v1/key'){if(request.method!=='GET')return response({error:'METHOD_NOT_ALLOWED'},405);return response({publicKey:b64url(jwkPoint(/** @type {{x:string,y:string}} */(vapidJwk(env)))),paused:killed(env)});}
 const allowed=url.pathname==='/v1/device'?['PUT','DELETE']:['POST'];
 if(!allowed.includes(request.method))return response({error:'METHOD_NOT_ALLOWED'},405);
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return response({error:'JSON_REQUIRED'},415);
 let body;try{body=await boundedJSON(request,L.bodyBytes);}catch{return response({error:'INVALID_DEVICE_REQUEST'},400);}
 if(url.pathname==='/v1/device/fixture'&&env.ISOLATED_FIXTURE!=='true')return response({error:'NOT_FOUND'},404);
 const id=typeof body?.id==='string'&&DEVICE_ID.test(body.id)?body.id:null;if(!id)return response({error:'INVALID_DEVICE_REQUEST'},400);
 // A new registration counts against the deployment's hourly budget before it reaches its own object.
 if(request.method==='PUT'){
  if(killed(env))return response({error:'PUSH_PAUSED'},503);
  const budget=env.PUSH_BUDGET.get(env.PUSH_BUDGET.idFromName('global'));
  const admitted=await budget.fetch(new Request('https://budget.internal/admit',{method:'POST',body:JSON.stringify({kind:'put'})}));
  if(admitted.status!==200)return response({error:'TRY_LATER'},429);
 }
 // The device id is the only key: nothing else the client sent selects another object.
 const stub=env.PUSH_DEVICES.get(env.PUSH_DEVICES.idFromName('device:'+id));
 return stub.fetch(new Request('https://device.internal'+url.pathname,{method:request.method,headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
}};
export default deviceWorker;

/** One per deployment: hourly registrations and the daily send budget (A5). Counters only; pruned as they age. */
export class PushBudget{
 /** @param {DurableObjectState} state @param {DeviceEnv} env */
 constructor(state,env){this.state=state;this.env=env;}
 /** @param {Request} request */
 async fetch(request){
  let body;try{body=await boundedJSON(request,256);}catch{return response({error:'INVALID'},400);}
  const now=Number.isSafeInteger(body?.now)&&this.env.ISOLATED_FIXTURE==='true'?body.now:Date.now();
  const kind=body?.kind==='put'?'put':body?.kind==='send'?'send':null;if(!kind)return response({error:'INVALID'},400);
  const key=kind==='put'?'put:'+Math.floor(now/3_600_000):'send:'+new Date(now).toISOString().slice(0,10),cap=kind==='put'?L.globalPutsPerHour:L.globalSendsPerDay;
  const count=(/** @type {number|undefined} */(await this.state.storage.get(key))??0)+1;
  if(count>cap)return response({admitted:false},429);
  await this.state.storage.put(key,count);
  // Older counters leave: anything but the current hour's and the current day's keys.
  const keep=new Set(['put:'+Math.floor(now/3_600_000),'send:'+new Date(now).toISOString().slice(0,10)]);
  const all=await this.state.storage.list({limit:16});const stale=[...all.keys()].filter(k=>!keep.has(k));if(stale.length)await this.state.storage.delete(stale);
  return response({admitted:true});
 }
}

export class PushDevice{
 /** @param {DurableObjectState} state @param {DeviceEnv} env */
 constructor(state,env){
  this.state=state;this.env=env;
  /** @type {Map<string,{header:string,until:number}>} */this.tokens=new Map();
  /** @type {Promise<{privateKey:CryptoKey,publicPoint:Uint8Array}>|null} */this.vapid=null;
  /** @type {number|null} */this.fixtureNow=null;
 }
 now(){return this.env.ISOLATED_FIXTURE==='true'&&this.fixtureNow!==null?this.fixtureNow:Date.now();}
 /** @returns {Promise<DeviceRecord|undefined>} */
 read(){return this.state.storage.get('device');}
 /** @param {Request} request */
 async fetch(request){
  const path=new URL(request.url).pathname;let body;try{body=await boundedJSON(request,L.bodyBytes);}catch{return response({error:'INVALID_DEVICE_REQUEST'},400);}
  if(path==='/v1/device/fixture')return this.fixture(body);
  const now=this.now(),current=await this.read();
  if(request.method==='PUT')return this.register(body,current,now);
  // DELETE and test need the device's own secret; an unknown device answers the same 404 either way.
  if(!current||typeof body?.secret!=='string'||!DEVICE_SECRET.test(body.secret)||!same(await digest(body.secret),current.hash))return response({error:'DEVICE_UNKNOWN'},404);
  if(request.method==='DELETE'){if(!exact(body,['id','secret']))return response({error:'INVALID_DEVICE_REQUEST'},400);await this.forget();return response({deleted:true});}
  if(!exact(body,['id','secret']))return response({error:'INVALID_DEVICE_REQUEST'},400);
  return this.test(current,now);
 }
 /** @param {any} body @param {DeviceRecord|undefined} current @param {number} now */
 async register(body,current,now){
  const reg=validRegistration(body,now);if(!reg)return response({error:'INVALID_DEVICE_REQUEST'},400);
  const endpoint=allowedEndpoint(reg.endpoint,parseExtraHosts(this.env.PUSH_ALLOWED_HOSTS));if(!endpoint)return response({error:'ENDPOINT_NOT_ALLOWED'},400);
  const hash=await digest(reg.secret);
  // A taken id answers like an unknown one: a guess learns nothing.
  if(current&&!same(hash,current.hash))return response({error:'DEVICE_UNKNOWN'},404);
  const hour=Math.floor(now/3_600_000),puts=current&&current.puts.hour===hour?{hour,n:current.puts.n+1}:{hour,n:1};
  if(puts.n>L.putsPerHour)return response({error:'TRY_LATER'},429);
  const day=new Date(now).toISOString().slice(0,10);
  /** @type {DeviceRecord} */
  const record={v:1,hash,endpoint,zone:reg.zone,quiet:reg.quiet,wakes:reg.wakes,once:reg.once,skips:reg.skips,created:current?.created??now,refreshed:now,next:null,last:current?.last??null,day:current?.day===day?current.day:day,count:current?.day===day?current.count:0,failures:current&&current.endpoint===endpoint?current.failures:0,puts,tests:current?.tests??{hour,n:0}};
  record.next=nextWake(record,now);
  await this.state.storage.put('device',record);
  await this.arm(record,now);
  return response({registered:true,next:record.next,wakes:record.wakes.length+record.once.length});
 }
 /** The next alarm: the next wake, or (with none) a daily check so the record still leaves after 30 days. @param {DeviceRecord} record @param {number} now */
 async arm(record,now){
  const at=killed(this.env)?now+86_400_000:record.next!==null?Math.max(record.next,now+1000):now+86_400_000;
  if(this.env.ISOLATED_FIXTURE!=='true')await this.state.storage.setAlarm(Math.min(at,record.refreshed+L.ttlMs+60_000));
  return at;
 }
 async forget(){await this.state.storage.deleteAll();if(this.env.ISOLATED_FIXTURE!=='true')await this.state.storage.deleteAlarm();}
 /** @param {DeviceRecord} current @param {number} now */
 async test(current,now){
  if(killed(this.env))return response({error:'PUSH_PAUSED'},503);
  const hour=Math.floor(now/3_600_000),tests=current.tests.hour===hour?{hour,n:current.tests.n+1}:{hour,n:1};
  if(tests.n>L.testsPerHour)return response({error:'TRY_LATER'},429);
  const record={...current,tests};await this.state.storage.put('device',record);
  const outcome=await this.deliver(record,now,true);
  if(outcome==='gone'){await this.forget();return response({error:'DEVICE_GONE'},410);}
  return outcome==='sent'?response({sent:true}):response({error:outcome==='capped'?'TRY_LATER':'PUSH_SERVICE_FAILED'},outcome==='capped'?429:502);
 }
 async alarm(){await this.runAlarm(this.now());}
 /**
 * The only sender besides the test button. A wake more than 10 minutes late is skipped, never sent late; quiet hours,
 * the per-device daily cap, the 60 s gap, the kill switch and the deployment's daily budget each skip a send. The record
 * is saved before any outbound call. Never logs; always re-arms.
 * @param {number} now
 */
 async runAlarm(now){
  const result={sent:false,skipped:/** @type {string|null} */(null),deleted:false};
  const record=await this.read();if(!record){if(this.env.ISOLATED_FIXTURE!=='true')await this.state.storage.deleteAlarm();result.skipped='none';return result;}
  if(now-record.refreshed>L.ttlMs){await this.forget();result.deleted=true;return result;}
  try{
   const due=record.next;
   if(due!==null&&due<=now){
    record.once=record.once.filter(m=>m*60000>due);record.skips=record.skips.filter(m=>m*60000>=now-3_600_000);
    // The next wake after this one; when the alarm ran so late that it too is stale, start again from now.
    let following=nextWake(record,due+60_000);if(following!==null&&following<now-L.staleMs)following=nextWake(record,now);record.next=following;
    const day=new Date(now).toISOString().slice(0,10);if(record.day!==day){record.day=day;record.count=0;}
    result.skipped=killed(this.env)?'paused':now-due>L.staleMs?'stale':inQuietWindow(wallClock(due,record.zone).time,record.quiet.from,record.quiet.to)?'quiet':record.count>=L.sendsPerDay?'capped':record.last!==null&&now-record.last<L.gapMs?'gap':null;
    await this.state.storage.put('device',record);
    if(!result.skipped){
     const outcome=await this.deliver(record,now,false);
     if(outcome==='gone'){await this.forget();result.deleted=true;return result;}
     if(outcome==='sent')result.sent=true;else result.skipped=outcome;
    }
   }else if(due===null)record.next=nextWake(record,now);
  }catch{/* never logged: the alarm below is what matters */}
  const latest=await this.read();if(latest)await this.arm(latest,now);
  return result;
 }
 /**
 * One payload-free push (RFC 8030 with RFC 8292 VAPID; no body, so nothing to encrypt). Counts against the deployment's
 * daily budget first. 404/410 means the browser dropped the subscription: the caller deletes the device.
 * @param {DeviceRecord} record @param {number} now @param {boolean} test @returns {Promise<'sent'|'gone'|'failed'|'capped'>}
 */
 async deliver(record,now,test){
  const budget=this.env.PUSH_BUDGET.get(this.env.PUSH_BUDGET.idFromName('global'));
  const admitted=await budget.fetch(new Request('https://budget.internal/admit',{method:'POST',body:JSON.stringify({kind:'send',...(this.env.ISOLATED_FIXTURE==='true'?{now}:{})})}));
  if(admitted.status!==200)return 'capped';
  let outcome=/** @type {'sent'|'gone'|'failed'} */('failed');
  try{
   const origin=new URL(record.endpoint).origin;let token=this.tokens.get(origin);
   if(!token||token.until<=now){
    this.vapid??=importVapidKey(JSON.parse(/** @type {string} */(this.env.VAPID_PRIVATE_KEY)));const key=await this.vapid;
    token={header:(await vapidAuthorization({privateKey:key.privateKey,publicPoint:key.publicPoint,audience:origin,subject:/** @type {string} */(this.env.VAPID_SUBJECT),now})).header,until:now+L.tokenMs};
    this.tokens.set(origin,token);
   }
   const sent=await fetch(record.endpoint,{method:'POST',headers:{TTL:test?'300':'1800',Urgency:'normal',Topic:'zigoals',Authorization:token.header,'Content-Length':'0'},redirect:'manual',signal:AbortSignal.timeout(10_000)});
   await sent.body?.cancel().catch(()=>{});
   outcome=sent.status===404||sent.status===410?'gone':sent.ok?'sent':'failed';
  }catch{outcome='failed';}
  const latest=await this.read();if(!latest)return outcome;
  if(outcome==='sent'){latest.last=now;latest.count+=1;latest.failures=0;}
  else if(outcome==='failed'){latest.failures+=1;if(latest.failures>=L.failuresBeforeDelete)return 'gone';}
  await this.state.storage.put('device',latest);
  return outcome;
 }
 /** Test control (Miniflare only): a fixed clock and an optional alarm run, and the record's shape for assertions. @param {any} body */
 async fixture(body){
  if(this.env.ISOLATED_FIXTURE!=='true'||!exact(body,['id','now','alarm'])||!Number.isSafeInteger(body.now)||typeof body.alarm!=='boolean')return response({error:'INVALID_DEVICE_REQUEST'},400);
  this.fixtureNow=body.now;const run=body.alarm?await this.runAlarm(body.now):null,record=await this.read();
  return response({run,record:record?{zone:record.zone,wakes:record.wakes,once:record.once,skips:record.skips,next:record.next,last:record.last,count:record.count,failures:record.failures,hashLength:record.hash.length}:null});
 }
}
