// The push Worker (ADR-010) against the real worker.mjs in Miniflare (scripts/run11/push-fixture.mjs): verification,
// limits, the alarm as the only sender, the encrypted payload and the VAPID header, quiet hours, the collapse, the
// daily cap, 410 and 5xx handling, late alarms, deletion and pruning. The fixture clock drives the alarm; nothing
// here waits for real time.
import {expect,test} from 'vitest';
import {SUBJECT,decryptPush,deviceFixture,pushRuntime} from './push-fixture.mjs';
import {fromB64url,verifyVapid} from '../../workers/push-reminders/webpush.mjs';
import {LIMITS} from '../../workers/push-reminders/limits.mjs';

const ALL=127,BRUSSELS='Europe/Brussels';
// Monday 2026-10-05 07:00 in Brussels (05:00Z); 08:00 Brussels is 06:00Z.
const MONDAY_07=Date.UTC(2026,9,5,5,0),MONDAY_08=Date.UTC(2026,9,5,6,0);
const quiet={from:'22:00',to:'07:00'};
const subscribeBody=(device,schedules=[{time:'08:00',zone:BRUSSELS,weekdays:ALL}],zone=BRUSSELS,q=quiet)=>({action:'subscribe',endpoint:device.endpoint,p256dh:device.p256dh,auth:device.auth,zone,quiet:q,schedules});
const endpoint=(host,id)=>`https://${host}/push/${id}`;
async function subscribed(r,host='web.push.apple.com',schedules=undefined){
 const device=await deviceFixture(endpoint(host,crypto.randomUUID()));
 const res=await r.call('/v1/push',subscribeBody(device,schedules));expect(res.status,await res.clone().text()).toBe(200);
 return {device,...(await res.json())};
}

test('subscribe, schedule and GET: the rows, the next due instant, a replaced set, an unknown subscription',async()=>{
 const r=await pushRuntime();try{
  await r.clock(MONDAY_07);
  const {device,subscriptionId}=await subscribed(r);
  expect(await (await r.call('/v1/push')).json()).toEqual({subscriptions:1,schedules:1,nextDue:MONDAY_08});
  const again=await r.call('/v1/push',subscribeBody(device));
  expect(await again.json()).toMatchObject({subscriptionId,subscriptions:1});
  const replaced=await r.call('/v1/push',{action:'schedule',subscriptionId,zone:BRUSSELS,quiet,schedules:[{time:'07:30',zone:BRUSSELS,weekdays:ALL},{time:'12:00',zone:'UTC',weekdays:1}]});
  expect(await replaced.json()).toEqual({subscriptionId,schedules:2});
  expect(await (await r.call('/v1/push')).json()).toEqual({subscriptions:1,schedules:2,nextDue:Date.UTC(2026,9,5,5,30)});
  const unknown=await r.call('/v1/push',{action:'schedule',subscriptionId:crypto.randomUUID(),zone:BRUSSELS,quiet,schedules:[]});
  expect(unknown.status).toBe(404);expect(await unknown.json()).toEqual({error:'SUBSCRIPTION_UNKNOWN'});
  expect(r.deliveries).toHaveLength(0);
 }finally{await r.dispose();}
},60_000);

test('the alarm sends one encrypted message with the Web Push headers; the body decrypts to {"v":1}; the token verifies; nothing is sent twice',async()=>{
 const r=await pushRuntime();try{
  await r.clock(MONDAY_07);const {device}=await subscribed(r);
  expect(await r.clock(MONDAY_07,true)).toMatchObject({due:0,sent:0});
  const run=await r.clock(MONDAY_08,true);
  expect(run).toMatchObject({due:1,sent:1,failed:0,deleted:0});
  expect(r.deliveries).toHaveLength(1);
  const [delivery]=r.deliveries;
  expect(delivery.url).toBe(device.endpoint);expect(delivery.method).toBe('POST');
  expect(delivery.headers).toMatchObject({ttl:'1800',urgency:'normal',topic:'zigoals-reminder','content-encoding':'aes128gcm','content-type':'application/octet-stream'});
  const auth=delivery.headers.authorization.match(/^vapid t=([^,]+), k=(\S+)$/);
  expect(auth).not.toBeNull();expect(auth[2]).toBe(r.vapid.publicKey);
  const claims=await verifyVapid(auth[1],fromB64url(r.vapid.publicKey),MONDAY_08);
  expect(claims).toMatchObject({aud:'https://web.push.apple.com',sub:SUBJECT});expect(claims.exp*1000).toBeLessThanOrEqual(MONDAY_08+24*3600*1000);
  expect(await decryptPush({body:delivery.body,privateKey:device.privateKey,uaPublic:device.uaPublic,auth:device.authBytes})).toBe('{"v":1}');
  expect(delivery.body.length).toBeLessThan(200);
  // The same minute again: the mark holds. The next due instant is tomorrow.
  expect(await r.clock(MONDAY_08+30_000,true)).toMatchObject({due:0,sent:0});
  expect(await (await r.call('/v1/push')).json()).toMatchObject({nextDue:Date.UTC(2026,9,6,6,0)});
  expect(r.deliveries).toHaveLength(1);
 }finally{await r.dispose();}
},60_000);

test('quiet hours skip a reminder; two due rows for one device collapse into one send; a late alarm never sends stale rows',async()=>{
 const r=await pushRuntime();try{
  await r.clock(MONDAY_07);
  const night=await deviceFixture(endpoint('web.push.apple.com','night'));
  expect((await r.call('/v1/push',subscribeBody(night,[{time:'23:00',zone:BRUSSELS,weekdays:ALL}]))).status).toBe(200);
  const run=await r.clock(Date.UTC(2026,9,5,21,0),true);
  expect(run).toMatchObject({due:1,sent:0,skipped:{quiet:1}});expect(r.deliveries).toHaveLength(0);
  const two=await deviceFixture(endpoint('web.push.apple.com','two'));
  expect((await r.call('/v1/push',subscribeBody(two,[{time:'08:00',zone:BRUSSELS,weekdays:ALL},{time:'08:01',zone:BRUSSELS,weekdays:ALL}]))).status).toBe(200);
  // Both rows are due at 08:01; one message leaves.
  const collapsed=await r.clock(Date.UTC(2026,9,6,6,1),true);
  expect(collapsed).toMatchObject({due:2,sent:1,skipped:{collapsed:1}});expect(r.deliveries).toHaveLength(1);
  // The 60 s rule also holds across runs: a row due 30 s after the last send waits.
  const late=await deviceFixture(endpoint('web.push.apple.com','late'));
  expect((await r.call('/v1/push',subscribeBody(late,[{time:'09:00',zone:BRUSSELS,weekdays:ALL}]))).status).toBe(200);
  const stale=await r.clock(Date.UTC(2026,9,6,7,0)+LIMITS.staleMs+1,true);
  expect(stale).toMatchObject({due:1,sent:0,skipped:{stale:1}});expect(r.deliveries).toHaveLength(1);
 }finally{await r.dispose();}
},60_000);

test('at most 50 sends a day per account; the cap resets the next day',async()=>{
 const r=await pushRuntime();try{
  await r.clock(MONDAY_07);
  const schedules=Array.from({length:12},(_,i)=>({time:`08:${String(i).padStart(2,'0')}`,zone:'UTC',weekdays:ALL}));
  for(let n=0;n<5;n++)await subscribed(r,'web.push.apple.com',schedules);
  let sent=0,capped=0;
  for(let minute=0;minute<12;minute++){const run=await r.clock(Date.UTC(2026,9,5,8,minute),true);sent+=run.sent;capped+=run.skipped.capped;}
  expect(sent).toBe(LIMITS.sendsPerDay);expect(capped).toBe(10);expect(r.deliveries).toHaveLength(LIMITS.sendsPerDay);
  const next=await r.clock(Date.UTC(2026,9,6,8,0),true);
  expect(next).toMatchObject({sent:5,skipped:{capped:0}});
 }finally{await r.dispose();}
},90_000);

test('a 410 from the push service deletes the subscription; three 5xx answers pause it; a later success resets nothing it should not',async()=>{
 const r=await pushRuntime();try{
  await r.clock(MONDAY_07);
  const gone=await subscribed(r,'web.push.apple.com');
  r.state.status=410;
  expect(await r.clock(MONDAY_08,true)).toMatchObject({sent:0,deleted:1});
  expect(await (await r.call('/v1/push')).json()).toEqual({subscriptions:0,schedules:0,nextDue:null});
  expect((await r.call('/v1/push',{action:'unsubscribe',subscriptionId:gone.subscriptionId})).status).toBe(200);
  r.state.status=503;
  await subscribed(r,'updates.push.services.mozilla.com');
  // Subscribed at 08:00 Brussels on the Monday: due at once, then once a day; the third failure pauses it.
  for(let day=0;day<LIMITS.pauseAfter;day++)expect(await r.clock(Date.UTC(2026,9,5+day,6,0),true)).toMatchObject({sent:0,failed:1});
  r.state.status=201;
  expect(await r.clock(Date.UTC(2026,9,8,6,0),true)).toMatchObject({sent:0,failed:0,skipped:{paused:1}});
  expect(r.deliveries).toHaveLength(1+LIMITS.pauseAfter);
 }finally{await r.dispose();}
},60_000);

test('refusals: limits 409, an endpoint off the list 400, bad bodies 400, a missing or invalid bearer 401, a wrong account 409, a wrong origin 403, routes',async()=>{
 const r=await pushRuntime();try{
  await r.clock(MONDAY_07);
  for(let n=0;n<LIMITS.subscriptions;n++)await subscribed(r,'push.test');
  const sixth=await r.call('/v1/push',subscribeBody(await deviceFixture(endpoint('push.test','sixth'))));
  expect(sixth.status).toBe(409);expect(await sixth.json()).toEqual({error:'SUBSCRIPTION_LIMIT'});
  const many=Array.from({length:LIMITS.schedules+1},(_,i)=>({time:`0${Math.floor(i/60)}:${String(i%60).padStart(2,'0')}`,zone:'UTC',weekdays:ALL}));
  const tooMany=await r.call('/v1/push',subscribeBody(await deviceFixture(endpoint('push.test','many')),many));
  expect(tooMany.status).toBe(409);expect(await tooMany.json()).toEqual({error:'SCHEDULE_LIMIT'});
  for(const bad of ['https://evil.example/push/x','http://web.push.apple.com/push/x','https://user:pw@web.push.apple.com/push/x','https://notpush.apple.com.evil.example/x','https://web.push.apple.com/x#frag']){
   const res=await r.call('/v1/push',subscribeBody(await deviceFixture(bad)));
   expect(res.status,bad).toBe(400);expect(await res.json()).toEqual({error:'ENDPOINT_NOT_ALLOWED'});
  }
  const device=await deviceFixture(endpoint('push.test','bodies'));
  for(const body of [{...subscribeBody(device),extra:1},{...subscribeBody(device),zone:'Mars/Olympus'},{...subscribeBody(device),quiet:{from:'22:00',to:'7:00'}},{...subscribeBody(device),schedules:[{time:'24:00',zone:'UTC',weekdays:ALL}]},{...subscribeBody(device),schedules:[{time:'08:00',zone:'UTC',weekdays:128}]},{...subscribeBody(device),schedules:[{time:'08:00',zone:'UTC',weekdays:1},{time:'08:00',zone:'UTC',weekdays:1}]},{...subscribeBody(device),p256dh:'AAAA'},{...subscribeBody(device),auth:device.auth.slice(1)},{action:'nothing'},{action:'fixture',now:1,alarm:false,extra:true}]){
   const res=await r.call('/v1/push',body);expect(res.status,JSON.stringify(body)).toBe(400);expect(await res.json()).toEqual({error:'INVALID_PUSH_REQUEST'});
  }
  expect((await r.call('/v1/push',subscribeBody(device),{headers:{'content-type':'text/plain'}})).status).toBe(415);
  expect((await r.call('/v1/push',undefined,{token:null})).status).toBe(401);
  expect((await r.call('/v1/push',undefined,{token:'invalid'})).status).toBe(401);
  const wrongAccount=await r.call('/v1/push',undefined,{headers:{'x-zigoals-account':'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}});
  expect(wrongAccount.status).toBe(409);expect(await wrongAccount.json()).toEqual({error:'ACCOUNT_CHANGED'});
  expect((await r.call('/v1/push',undefined,{headers:{origin:'https://other.test'}})).status).toBe(403);
  expect((await r.call('/v1/other')).status).toBe(404);
  expect((await r.call('/v1/push',undefined,{method:'PUT'})).status).toBe(404);
  const key=await r.call('/v1/push/key',undefined,{token:null});
  expect(key.status).toBe(200);expect(await key.json()).toEqual({publicKey:r.vapid.publicKey});
  expect((await r.call('/v1/push/key',{action:'x'})).status).toBe(405);
  expect(r.deliveries).toHaveLength(0);
 }finally{await r.dispose();}
},60_000);

test('delete-all leaves no rows; unsubscribe is idempotent; a subscription not refreshed for 30 days is pruned',async()=>{
 const r=await pushRuntime();try{
  await r.clock(MONDAY_07);
  const a=await subscribed(r),b=await subscribed(r);
  expect(await (await r.call('/v1/push')).json()).toMatchObject({subscriptions:2,schedules:2});
  expect(await (await r.call('/v1/push',{action:'unsubscribe',subscriptionId:a.subscriptionId})).json()).toEqual({deleted:true});
  expect(await (await r.call('/v1/push',{action:'unsubscribe',subscriptionId:a.subscriptionId})).json()).toEqual({deleted:true});
  expect(await (await r.call('/v1/push')).json()).toMatchObject({subscriptions:1,schedules:1});
  expect(await (await r.call('/v1/push',{action:'delete-all'})).json()).toEqual({deleted:true});
  expect(await (await r.call('/v1/push')).json()).toEqual({subscriptions:0,schedules:0,nextDue:null});
  expect((await r.call('/v1/push',{action:'delete-all',confirm:'x'})).status).toBe(400);
  await subscribed(r);expect(b.subscriptionId).toBeDefined();
  await r.clock(MONDAY_07+LIMITS.refreshMs+1,true);
  expect(await (await r.call('/v1/push')).json()).toEqual({subscriptions:0,schedules:0,nextDue:null});
  expect(r.deliveries).toHaveLength(0);
 }finally{await r.dispose();}
},60_000);

test('the hourly request cap answers 429 and opens again in the next hour',async()=>{
 const r=await pushRuntime();try{
  const hour=Date.UTC(2026,9,5,9,0);await r.clock(hour);
  let refused=0;
  for(let n=0;n<LIMITS.requestsPerHour+2;n++){const res=await r.call('/v1/push');if(res.status===429)refused++;else expect(res.status).toBe(200);}
  // The fixture call that set the clock was counted in the real hour, so the fixture hour holds exactly these GETs.
  expect(refused).toBe(2);
  const next=await r.call('/v1/push',{action:'fixture',now:hour+3_600_000,alarm:false});
  expect(next.status).toBe(200);
  expect((await r.call('/v1/push')).status).toBe(200);
 }finally{await r.dispose();}
},60_000);

test('without the provider, the VAPID key or the subject the Worker answers 503; without the fixture flag the fixture action is refused',async()=>{
 for(const omit of ['AUTH_ORIGIN','VAPID_PRIVATE_KEY','VAPID_SUBJECT','APP_ORIGIN']){
  const r=await pushRuntime({omit:[omit]});try{const res=await r.call('/v1/push');expect(res.status,omit).toBe(503);expect(await res.json()).toEqual({error:'HOSTED_CONFIGURATION_REQUIRED'});}finally{await r.dispose();}
 }
 const broken=await pushRuntime({bindings:{PUSH_ALLOWED_HOSTS:'not a host'}});try{expect((await broken.call('/v1/push')).status).toBe(503);}finally{await broken.dispose();}
 const real=await pushRuntime({fixture:false});try{
  const res=await real.call('/v1/push',{action:'fixture',now:MONDAY_07,alarm:true});expect(res.status).toBe(400);
  const {device}=await subscribed(real);expect(device.endpoint).toContain('web.push.apple.com');
  expect(await (await real.call('/v1/push')).json()).toMatchObject({subscriptions:1,schedules:1});
 }finally{await real.dispose();}
},60_000);
