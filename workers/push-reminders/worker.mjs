import {boundedJSON,providerConfigured,response,verifySession} from './verify.mjs';
import {b64url,encryptPush,fromB64url,importVapidKey,isPoint,jwkPoint,vapidAuthorization} from './webpush.mjs';
import {TIME,inQuietWindow,nextDue,wallClock,zoneSupported} from './clock.mjs';
import {allowedEndpoint,parseExtraHosts} from './hosts.mjs';
import {LIMITS,PAYLOAD} from './limits.mjs';
/**
 * Push reminders (ADR-010): a separately deployed Worker outside the Stage 7 topology. One SQLite Durable Object per
 * verified account holds subscriptions, schedules and send marks; its alarm is the only sender. The payload is always
 * the same encrypted {"v":1}: the server never holds a title, a count or any content.
 * @typedef {{PUSH_ACCOUNTS:DurableObjectNamespace,AUTH_ORIGIN?:string,AUTH_PUBLIC_KEY?:string,APP_ORIGIN?:string,VAPID_SUBJECT?:string,VAPID_PRIVATE_KEY?:string,PUSH_ALLOWED_HOSTS?:string,ISOLATED_FIXTURE?:string}} PushEnv
 * @typedef {{id:string,endpoint:string,p256dh:string,auth:string}} SendTarget
 */
const ROUTES=['/v1/push','/v1/push/key'];
const SCHEMA=[
 'CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, endpoint TEXT UNIQUE NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL, zone TEXT NOT NULL, quiet_from TEXT NOT NULL, quiet_to TEXT NOT NULL, created_at INTEGER NOT NULL, refreshed_at INTEGER NOT NULL, last_sent_at INTEGER, failures INTEGER NOT NULL DEFAULT 0, paused INTEGER NOT NULL DEFAULT 0)',
 'CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL, time TEXT NOT NULL, zone TEXT NOT NULL, weekdays INTEGER NOT NULL, next_due INTEGER NOT NULL)',
 'CREATE INDEX IF NOT EXISTS schedules_due ON schedules (next_due)',
 'CREATE TABLE IF NOT EXISTS sent (schedule_id TEXT NOT NULL, day TEXT NOT NULL, PRIMARY KEY (schedule_id, day))',
 'CREATE TABLE IF NOT EXISTS sends (day TEXT PRIMARY KEY, count INTEGER NOT NULL)',
 'CREATE TABLE IF NOT EXISTS windows (key TEXT PRIMARY KEY, count INTEGER NOT NULL)',
];
/** @param {any} value @param {string[]} keys */
function exact(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(value,k));}
/** @param {any} s */
const validSchedule=s=>exact(s,['time','zone','weekdays'])&&typeof s.time==='string'&&TIME.test(s.time)&&zoneSupported(s.zone)&&Number.isSafeInteger(s.weekdays)&&s.weekdays>=1&&s.weekdays<=127;
/** @param {any} q */
const validQuiet=q=>exact(q,['from','to'])&&typeof q.from==='string'&&TIME.test(q.from)&&typeof q.to==='string'&&TIME.test(q.to);
/** @param {any} list */
const validSchedules=list=>Array.isArray(list)&&list.length<=LIMITS.schedules*4&&list.every(validSchedule)&&new Set(list.map(s=>JSON.stringify([s.time,s.zone,s.weekdays]))).size===list.length;
/** The VAPID private JWK from the secret, or null. @param {PushEnv} env */
function vapidJwk(env){try{const jwk=JSON.parse(env.VAPID_PRIVATE_KEY??'');return jwk&&typeof jwk==='object'&&jwk.kty==='EC'&&jwk.crv==='P-256'&&typeof jwk.d==='string'&&typeof jwk.x==='string'&&typeof jwk.y==='string'?jwk:null;}catch{return null;}}
/** @param {PushEnv} env */
function configured(env){
 if(!providerConfigured(env)||!vapidJwk(env)||!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s/]+)$/.test(env.VAPID_SUBJECT??''))return false;
 try{parseExtraHosts(env.PUSH_ALLOWED_HOSTS);return true;}catch{return false;}
}
/** @type {ExportedHandler<PushEnv>} */
const pushWorker={async fetch(request,env){
 const url=new URL(request.url);
 if(!ROUTES.includes(url.pathname)||!['GET','POST'].includes(request.method))return response({error:'NOT_FOUND'},404);
 if(!configured(env))return response({error:'HOSTED_CONFIGURATION_REQUIRED'},503);
 if(request.headers.get('origin')!==env.APP_ORIGIN)return response({error:'ORIGIN_DENIED'},403);
 if(url.pathname==='/v1/push/key'){if(request.method!=='GET')return response({error:'METHOD_NOT_ALLOWED'},405);return response({publicKey:b64url(jwkPoint(/** @type {{x:string,y:string}} */(vapidJwk(env))))});}
 const verified=await verifySession(request,env);if('response' in verified)return verified.response;
 let body=null;
 if(request.method==='POST'){
  if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return response({error:'JSON_REQUIRED'},415);
  try{body=JSON.stringify(await boundedJSON(request,LIMITS.bodyBytes));}catch{return response({error:'INVALID_PUSH_REQUEST'},400);}
 }
 // The verified account is the only tenant key; nothing the client sent selects another object.
 const stub=env.PUSH_ACCOUNTS.get(env.PUSH_ACCOUNTS.idFromName(verified.account));
 return stub.fetch(new Request('https://push.internal'+url.pathname,{method:request.method,headers:{'x-verified-account':verified.account,'content-type':'application/json'},body}));
}};
export default pushWorker;
export class PushAccount{
 /** @param {DurableObjectState} state @param {PushEnv} env */
 constructor(state,env){
  this.state=state;this.env=env;this.sql=state.storage.sql;
  /** @type {Map<string,{header:string,until:number}>} */this.tokens=new Map();
  /** @type {Promise<{privateKey:CryptoKey,publicPoint:Uint8Array}>|null} */this.vapid=null;
  /** @type {number|null} */this.fixtureNow=null;
  for(const statement of SCHEMA)this.sql.exec(statement);
 }
 fixture(){return this.env.ISOLATED_FIXTURE==='true';}
 now(){return this.fixture()&&this.fixtureNow!==null?this.fixtureNow:Date.now();}
 /** @param {Request} request */
 async fetch(request){
  const path=new URL(request.url).pathname;
  let body=null;if(request.method==='POST'){try{body=await boundedJSON(request,LIMITS.bodyBytes);}catch{return response({error:'INVALID_PUSH_REQUEST'},400);}}
  // Test control (refused unless ISOLATED_FIXTURE) sets the clock the hourly cap is counted in, so it is read first.
  if(body?.action==='fixture')return this.fixtureAction(body);
  const now=this.now();
  if(!this.admit(now))return response({error:'TOO_MANY_REQUESTS'},429);
  if(request.method==='GET')return path==='/v1/push'?response(this.summary()):response({error:'NOT_FOUND'},404);
  switch(body?.action){
   case 'subscribe':return this.subscribe(body,now);
   case 'schedule':return this.schedule(body,now);
   case 'unsubscribe':return this.unsubscribe(body,now);
   case 'delete-all':return this.deleteAll(body);
   default:return response({error:'INVALID_PUSH_REQUEST'},400);
  }
 }
 /** At most LIMITS.requestsPerHour requests per account per clock hour. @param {number} now */
 admit(now){
  const key='req:'+Math.floor(now/3_600_000);
  return this.state.storage.transactionSync(()=>{
   this.sql.exec('DELETE FROM windows WHERE key <> ?',key);
   const count=Number(this.sql.exec('SELECT count FROM windows WHERE key = ?',key).toArray()[0]?.count??0)+1;
   this.sql.exec('INSERT INTO windows (key, count) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET count = excluded.count',key,count);
   return count<=LIMITS.requestsPerHour;
  });
 }
 summary(){
  const due=this.sql.exec('SELECT MIN(next_due) AS due FROM schedules').one().due;
  return {subscriptions:Number(this.sql.exec('SELECT COUNT(*) AS n FROM subscriptions').one().n),schedules:Number(this.sql.exec('SELECT COUNT(*) AS n FROM schedules').one().n),nextDue:due===null?null:Number(due)};
 }
 /** @param {any} body @param {number} now */
 async subscribe(body,now){
  if(!exact(body,['action','endpoint','p256dh','auth','zone','quiet','schedules'])||!zoneSupported(body.zone)||!validQuiet(body.quiet)||!validSchedules(body.schedules))return response({error:'INVALID_PUSH_REQUEST'},400);
  let p256dh,auth;try{p256dh=fromB64url(body.p256dh);auth=fromB64url(body.auth);}catch{return response({error:'INVALID_PUSH_REQUEST'},400);}
  if(!isPoint(p256dh)||auth.length!==16)return response({error:'INVALID_PUSH_REQUEST'},400);
  const endpoint=allowedEndpoint(body.endpoint,parseExtraHosts(this.env.PUSH_ALLOWED_HOSTS));if(!endpoint)return response({error:'ENDPOINT_NOT_ALLOWED'},400);
  if(body.schedules.length>LIMITS.schedules)return response({error:'SCHEDULE_LIMIT'},409);
  const result=this.state.storage.transactionSync(()=>{
   const existing=this.sql.exec('SELECT id FROM subscriptions WHERE endpoint = ?',endpoint).toArray()[0],count=Number(this.sql.exec('SELECT COUNT(*) AS n FROM subscriptions').one().n);
   if(!existing&&count>=LIMITS.subscriptions)return response({error:'SUBSCRIPTION_LIMIT'},409);
   const id=existing?String(existing.id):crypto.randomUUID();
   if(existing)this.sql.exec('UPDATE subscriptions SET p256dh = ?, auth = ?, zone = ?, quiet_from = ?, quiet_to = ?, refreshed_at = ?, failures = 0, paused = 0 WHERE id = ?',b64url(p256dh),b64url(auth),body.zone,body.quiet.from,body.quiet.to,now,id);
   else this.sql.exec('INSERT INTO subscriptions (id, endpoint, p256dh, auth, zone, quiet_from, quiet_to, created_at, refreshed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',id,endpoint,b64url(p256dh),b64url(auth),body.zone,body.quiet.from,body.quiet.to,now,now);
   this.replaceSchedules(id,body.schedules,now);
   return response({subscriptionId:id,schedules:body.schedules.length,subscriptions:existing?count:count+1});
  });
  await this.scheduleAlarm(now);return result;
 }
 /** @param {any} body @param {number} now */
 async schedule(body,now){
  if(!exact(body,['action','subscriptionId','zone','quiet','schedules'])||typeof body.subscriptionId!=='string'||!zoneSupported(body.zone)||!validQuiet(body.quiet)||!validSchedules(body.schedules))return response({error:'INVALID_PUSH_REQUEST'},400);
  if(body.schedules.length>LIMITS.schedules)return response({error:'SCHEDULE_LIMIT'},409);
  const result=this.state.storage.transactionSync(()=>{
   if(!this.sql.exec('SELECT id FROM subscriptions WHERE id = ?',body.subscriptionId).toArray().length)return response({error:'SUBSCRIPTION_UNKNOWN'},404);
   this.sql.exec('UPDATE subscriptions SET zone = ?, quiet_from = ?, quiet_to = ?, refreshed_at = ?, failures = 0, paused = 0 WHERE id = ?',body.zone,body.quiet.from,body.quiet.to,now,body.subscriptionId);
   this.replaceSchedules(body.subscriptionId,body.schedules,now);
   return response({subscriptionId:body.subscriptionId,schedules:body.schedules.length});
  });
  await this.scheduleAlarm(now);return result;
 }
 /** @param {any} body @param {number} now */
 async unsubscribe(body,now){
  if(!exact(body,['action','subscriptionId'])||typeof body.subscriptionId!=='string')return response({error:'INVALID_PUSH_REQUEST'},400);
  this.state.storage.transactionSync(()=>this.removeSubscription(body.subscriptionId));
  await this.scheduleAlarm(now);return response({deleted:true});
 }
 /** @param {any} body */
 async deleteAll(body){
  if(!exact(body,['action']))return response({error:'INVALID_PUSH_REQUEST'},400);
  this.state.storage.transactionSync(()=>{for(const table of ['sent','schedules','subscriptions','sends'])this.sql.exec(`DELETE FROM ${table}`);});
  if(!this.fixture())await this.state.storage.deleteAlarm();
  return response({deleted:true});
 }
 /** Test control (Miniflare only): a fixed clock and an immediate alarm run. Refused unless ISOLATED_FIXTURE is "true". @param {any} body */
 async fixtureAction(body){
  if(!this.fixture()||!exact(body,['action','now','alarm'])||!Number.isSafeInteger(body.now)||typeof body.alarm!=='boolean')return response({error:'INVALID_PUSH_REQUEST'},400);
  this.fixtureNow=body.now;
  return response(body.alarm?await this.runAlarm(body.now):{now:body.now});
 }
 /** @param {string} id @param {{time:string,zone:string,weekdays:number}[]} list @param {number} now */
 replaceSchedules(id,list,now){
  this.sql.exec('DELETE FROM sent WHERE schedule_id IN (SELECT id FROM schedules WHERE subscription_id = ?)',id);
  this.sql.exec('DELETE FROM schedules WHERE subscription_id = ?',id);
  for(const s of list){const due=nextDue(s,now);if(due!==null)this.sql.exec('INSERT INTO schedules (id, subscription_id, time, zone, weekdays, next_due) VALUES (?, ?, ?, ?, ?, ?)',crypto.randomUUID(),id,s.time,s.zone,s.weekdays,due);}
 }
 /** @param {string} id */
 removeSubscription(id){
  this.sql.exec('DELETE FROM sent WHERE schedule_id IN (SELECT id FROM schedules WHERE subscription_id = ?)',id);
  this.sql.exec('DELETE FROM schedules WHERE subscription_id = ?',id);
  this.sql.exec('DELETE FROM subscriptions WHERE id = ?',id);
 }
 /** The next alarm: the earliest due schedule, else a daily prune while subscriptions exist, else none. Fixture mode only reports it. @param {number} now */
 async scheduleAlarm(now){
  const due=this.sql.exec('SELECT MIN(next_due) AS due FROM schedules').one().due,subscriptions=Number(this.sql.exec('SELECT COUNT(*) AS n FROM subscriptions').one().n);
  const at=due!==null?Math.max(Number(due),now+1000):subscriptions?now+86_400_000:null;
  if(this.fixture())return at;
  if(at===null)await this.state.storage.deleteAlarm();else await this.state.storage.setAlarm(at);
  return at;
 }
 async alarm(){await this.runAlarm(this.now());}
 /**
 * The only sender. Marks are written before any outbound call, so a crash loses at most one reminder and never
 * doubles one; errors are swallowed so the alarm is always rescheduled.
 * @param {number} now
 */
 async runAlarm(now){
  const result={due:0,sent:0,failed:0,deleted:0,skipped:{duplicate:0,stale:0,paused:0,quiet:0,collapsed:0,capped:0}};
  try{
   const queue=this.state.storage.transactionSync(()=>{
    const rows=this.sql.exec('SELECT s.id, s.subscription_id, s.time, s.zone, s.weekdays, s.next_due, u.endpoint, u.p256dh, u.auth, u.zone AS device_zone, u.quiet_from, u.quiet_to, u.last_sent_at, u.paused FROM schedules s JOIN subscriptions u ON u.id = s.subscription_id WHERE s.next_due <= ? ORDER BY s.next_due',now).toArray();
    const today=new Date(now).toISOString().slice(0,10);let sends=Number(this.sql.exec('SELECT count FROM sends WHERE day = ?',today).toArray()[0]?.count??0);
    /** @type {Map<string,SendTarget>} */const chosen=new Map();
    for(const row of rows){
     result.due++;
     const schedule={time:String(row.time),zone:String(row.zone),weekdays:Number(row.weekdays)},due=Number(row.next_due),day=wallClock(due,schedule.zone).date;
     this.sql.exec('UPDATE schedules SET next_due = ? WHERE id = ?',nextDue(schedule,Math.max(now,due)+60_000)??now+86_400_000,row.id);
     if(this.sql.exec('SELECT 1 AS one FROM sent WHERE schedule_id = ? AND day = ?',row.id,day).toArray().length){result.skipped.duplicate++;continue;}
     this.sql.exec('INSERT INTO sent (schedule_id, day) VALUES (?, ?)',row.id,day);
     if(due<now-LIMITS.staleMs){result.skipped.stale++;continue;}
     if(Number(row.paused)){result.skipped.paused++;continue;}
     if(inQuietWindow(wallClock(now,String(row.device_zone)).time,String(row.quiet_from),String(row.quiet_to))){result.skipped.quiet++;continue;}
     const subscription=String(row.subscription_id);
     if(chosen.has(subscription)||(row.last_sent_at!==null&&now-Number(row.last_sent_at)<LIMITS.collapseMs)){result.skipped.collapsed++;continue;}
     if(sends>=LIMITS.sendsPerDay){result.skipped.capped++;continue;}
     sends++;chosen.set(subscription,{id:subscription,endpoint:String(row.endpoint),p256dh:String(row.p256dh),auth:String(row.auth)});
     this.sql.exec('UPDATE subscriptions SET last_sent_at = ? WHERE id = ?',now,subscription);
    }
    this.sql.exec('INSERT INTO sends (day, count) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET count = excluded.count',today,sends);
    return [...chosen.values()];
   });
   for(const target of queue){
    const outcome=await this.send(target,now);
    if(outcome==='sent'){result.sent++;this.sql.exec('UPDATE subscriptions SET failures = 0 WHERE id = ?',target.id);}
    else if(outcome==='gone'){result.deleted++;this.state.storage.transactionSync(()=>this.removeSubscription(target.id));}
    else{result.failed++;this.sql.exec('UPDATE subscriptions SET failures = failures + 1, paused = CASE WHEN failures + 1 >= ? THEN 1 ELSE paused END WHERE id = ?',LIMITS.pauseAfter,target.id);}
   }
   this.prune(now);
  }catch{/* never logged: the alarm below is what matters */}
  await this.scheduleAlarm(now);
  return result;
 }
 /** One message to one device. @param {SendTarget} target @param {number} now @returns {Promise<'sent'|'gone'|'failed'>} */
 async send(target,now){
  try{
   const origin=new URL(target.endpoint).origin;let token=this.tokens.get(origin);
   if(!token||token.until<=now){
    this.vapid??=importVapidKey(JSON.parse(/** @type {string} */(this.env.VAPID_PRIVATE_KEY)));const key=await this.vapid;
    token={header:(await vapidAuthorization({privateKey:key.privateKey,publicPoint:key.publicPoint,audience:origin,subject:/** @type {string} */(this.env.VAPID_SUBJECT),now})).header,until:now+LIMITS.tokenMs};
    this.tokens.set(origin,token);
   }
   const body=await encryptPush({plaintext:new TextEncoder().encode(PAYLOAD),uaPublic:fromB64url(target.p256dh),auth:fromB64url(target.auth)});
   const sent=await fetch(target.endpoint,{method:'POST',headers:{TTL:'1800',Urgency:'normal',Topic:'zigoals-reminder','Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream',Authorization:token.header},body,redirect:'manual',signal:AbortSignal.timeout(10_000)});
   await sent.body?.cancel().catch(()=>{});
   if(sent.status===404||sent.status===410)return 'gone';
   return sent.ok?'sent':'failed';
  }catch{return 'failed';}
 }
 /** Subscriptions not refreshed for 30 days, and marks older than two days, leave. @param {number} now */
 prune(now){
  const stale=now-LIMITS.refreshMs,twoDaysAgo=new Date(now-2*86_400_000).toISOString().slice(0,10);
  this.state.storage.transactionSync(()=>{
   this.sql.exec('DELETE FROM sent WHERE schedule_id IN (SELECT id FROM schedules WHERE subscription_id IN (SELECT id FROM subscriptions WHERE refreshed_at < ?))',stale);
   this.sql.exec('DELETE FROM schedules WHERE subscription_id IN (SELECT id FROM subscriptions WHERE refreshed_at < ?)',stale);
   this.sql.exec('DELETE FROM subscriptions WHERE refreshed_at < ?',stale);
   this.sql.exec('DELETE FROM sent WHERE day < ?',twoDaysAgo);
   this.sql.exec('DELETE FROM sends WHERE day < ?',twoDaysAgo);
  });
 }
}
