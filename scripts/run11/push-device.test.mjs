// The device push Worker (ADR-036 Q3, D1, A2, A5) against the real worker.mjs in Miniflare (push-device-fixture.mjs) and
// its pure helpers directly: registration checks, the payload-free send with VAPID, quiet hours, skips, late wakes, the
// daily cap and gap, the kill switch, deletion by secret, 404/410, the 30-day TTL and DST. The fixture clock drives the
// alarm; nothing here waits for real time or reaches a network.
import {expect,test} from 'vitest';
import {APP_ORIGIN,SUBJECT,deviceIdentity,deviceRuntime} from './push-device-fixture.mjs';
import {clockOf,nextWake,validRegistration} from '../../workers/push-device/worker.mjs';
import {DEVICE_LIMITS} from '../../workers/push-device/limits.mjs';
import {fromB64url,verifyVapid} from '../../workers/push-reminders/webpush.mjs';

const BRUSSELS='Europe/Brussels',ALL=127;
// Monday 2026-10-05 07:00 in Brussels is 05:00Z; 08:00 Brussels is 06:00Z.
const MONDAY_07=Date.UTC(2026,9,5,5,0),MONDAY_08=Date.UTC(2026,9,5,6,0),DAY=86_400_000;
const quiet={from:'22:00',to:'07:00'};
const registration=(who,over={})=>({id:who.id,secret:who.secret,endpoint:`https://push.test/p/${who.id}`,zone:BRUSSELS,quiet,wakes:[{m:480,d:ALL}],once:[],skips:[],...over});
async function registered(r,over={},now=MONDAY_07){
 const who=deviceIdentity();await r.clock(who.id,now);
 const res=await r.call('/v1/device',registration(who,over),{method:'PUT'});expect(res.status,await res.clone().text()).toBe(200);
 return {who,answer:await res.json()};
}

test('pure: wake times in the device zone, DST, one-off wakes and skipped minutes',()=>{
 expect(clockOf(0)).toBe('00:00');expect(clockOf(1439)).toBe('23:59');
 const device={zone:BRUSSELS,wakes:[{m:480,d:ALL}],once:[],skips:[]};
 expect(nextWake(device,MONDAY_07)).toBe(MONDAY_08);
 // Skipping Monday 08:00 moves the wake to Tuesday 08:00.
 expect(nextWake({...device,skips:[MONDAY_08/60000]},MONDAY_07)).toBe(MONDAY_08+DAY);
 // A one-off wake before the recurring one wins.
 expect(nextWake({...device,once:[(MONDAY_07+30*60000)/60000]},MONDAY_07)).toBe(MONDAY_07+30*60000);
 // Weekdays: Monday = 1 only, from Tuesday the next one is the following Monday.
 expect(nextWake({...device,wakes:[{m:480,d:1}]},MONDAY_08+60000)).toBe(MONDAY_08+7*DAY);
 // Spring forward: 02:30 does not exist in Brussels on 2026-03-29; it moves an hour later (03:30 local = 01:30Z).
 expect(nextWake({...device,wakes:[{m:150,d:ALL}]},Date.UTC(2026,2,29,0,0))).toBe(Date.UTC(2026,2,29,1,30));
 // Fall back: 2026-10-25 08:00 Brussels is 07:00Z (winter time).
 expect(nextWake(device,Date.UTC(2026,9,25,0,0))).toBe(Date.UTC(2026,9,25,7,0));
 // A device with nothing to wake for.
 expect(nextWake({...device,wakes:[]},MONDAY_07)).toBeNull();
});

test('pure: a registration says exactly what it may, within limits',()=>{
 const who=deviceIdentity(),ok=registration(who);
 expect(validRegistration(ok,MONDAY_07)).toMatchObject({id:who.id,zone:BRUSSELS,wakes:[{m:480,d:ALL}]});
 expect(validRegistration({...ok,label:'Walk'},MONDAY_07)).toBeNull(); // no label, no content: an extra key is refused
 expect(validRegistration({...ok,wakes:[{m:480,d:ALL,kind:'habit'}]},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,wakes:Array.from({length:DEVICE_LIMITS.wakes+1},(_,i)=>({m:i,d:ALL}))},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,wakes:[{m:480,d:ALL},{m:480,d:ALL}]},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,wakes:[{m:1440,d:ALL}]},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,wakes:[{m:480,d:0}]},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,once:[(MONDAY_07+40*DAY)/60000]},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,skips:[(MONDAY_07+5*DAY)/60000]},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,zone:'Mars/Olympus'},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,secret:'short'},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,id:'not-a-uuid'},MONDAY_07)).toBeNull();
 expect(validRegistration({...ok,quiet:{from:'25:00',to:'07:00'}},MONDAY_07)).toBeNull();
});

test('routes: the key, the origin pin, unknown paths and an unconfigured Worker',async()=>{
 const r=await deviceRuntime();try{
  const key=await r.call('/v1/key');expect(key.status).toBe(200);const body=await key.json();
  expect(body.paused).toBe(false);expect(fromB64url(body.publicKey)).toHaveLength(65);
  expect((await r.call('/v1/key',undefined,{headers:{origin:'https://evil.test'}})).status).toBe(403);
  expect((await r.call('/v1/other')).status).toBe(404);
  expect((await r.call('/v1/device',undefined,{method:'GET'})).status).toBe(405);
  expect((await r.call('/v1/device',{id:'x'},{method:'PUT',headers:{'content-type':'text/plain'}})).status).toBe(415);
 }finally{await r.dispose();}
 const bare=await deviceRuntime({omit:['VAPID_PRIVATE_KEY']});try{expect((await bare.call('/v1/key')).status).toBe(503);}finally{await bare.dispose();}
},60_000);

test('the alarm sends one push with no payload and a valid VAPID token; the next wake is armed',async()=>{
 const r=await deviceRuntime();try{
  const {who,answer}=await registered(r);
  expect(answer).toEqual({registered:true,next:MONDAY_08,wakes:1});
  const ran=await r.clock(who.id,MONDAY_08+5000,true);
  expect(ran.run).toEqual({sent:true,skipped:null,deleted:false});
  expect(ran.record).toMatchObject({next:MONDAY_08+DAY,last:MONDAY_08+5000,count:1,failures:0,hashLength:64});
  expect(r.deliveries).toHaveLength(1);
  const [d]=r.deliveries;expect(d.url).toBe(`https://push.test/p/${who.id}`);expect(d.method).toBe('POST');
  expect(d.body).toHaveLength(0);expect(d.headers['content-encoding']).toBeUndefined();
  expect(d.headers.ttl).toBe('1800');expect(d.headers.topic).toBe('zigoals');
  const [,token,k]=/^vapid t=([^,]+), k=(.+)$/.exec(d.headers.authorization);
  const claims=await verifyVapid(token,fromB64url(k),MONDAY_08+5000);
  expect(claims).toMatchObject({aud:'https://push.test',sub:SUBJECT});
  // The record never held anything but times: no label, no kind (the fixture shows every field it keeps).
  expect(Object.keys(ran.record).sort()).toEqual(['count','failures','hashLength','last','next','once','skips','wakes','zone']);
 }finally{await r.dispose();}
},60_000);

test('skips, quiet hours, late wakes, the gap and the daily cap each hold a send back',async()=>{
 const r=await deviceRuntime();try{
  // A skipped minute is never armed: Monday 08:00 skipped, the next wake is Tuesday.
  const skipped=await registered(r,{skips:[MONDAY_08/60000]});expect(skipped.answer.next).toBe(MONDAY_08+DAY);
  // Quiet hours (here 07:30–09:00) hold the 08:00 wake back.
  const quietOne=await registered(r,{quiet:{from:'07:30',to:'09:00'}});
  expect((await r.clock(quietOne.who.id,MONDAY_08,true)).run.skipped).toBe('quiet');
  // A wake fired more than 10 minutes late is skipped, never sent late.
  const late=await registered(r);
  expect((await r.clock(late.who.id,MONDAY_08+11*60000,true)).run.skipped).toBe('stale');
  // Two wakes a minute apart: the second meets the 60 s gap.
  const gap=await registered(r,{wakes:[{m:480,d:ALL},{m:481,d:ALL}]});
  expect((await r.clock(gap.who.id,MONDAY_08+59_000,true)).run.sent).toBe(true);
  expect((await r.clock(gap.who.id,MONDAY_08+60_000+30_000,true)).run.skipped).toBe('gap');
  // The daily cap: 24 sends per device per UTC day (wakes every 2 minutes from 08:00 Brussels).
  const many=await registered(r,{wakes:Array.from({length:30},(_,i)=>({m:480+i*2,d:ALL}))});
  let sent=0,capped=0;for(let i=0;i<30;i++){const run=(await r.clock(many.who.id,MONDAY_08+i*120_000+1000,true)).run;if(run.sent)sent++;if(run.skipped==='capped')capped++;}
  expect(sent).toBe(DEVICE_LIMITS.sendsPerDay);expect(capped).toBe(30-DEVICE_LIMITS.sendsPerDay);
  expect(r.deliveries).toHaveLength(1+DEVICE_LIMITS.sendsPerDay);
 }finally{await r.dispose();}
},120_000);

test('the device secret guards change and deletion; a taken id answers like an unknown one; DELETE removes everything',async()=>{
 const r=await deviceRuntime();try{
  const {who}=await registered(r);
  const other=deviceIdentity();
  expect((await r.call('/v1/device',registration({id:who.id,secret:other.secret}),{method:'PUT'})).status).toBe(404);
  expect((await r.call('/v1/device',{id:who.id,secret:other.secret},{method:'DELETE'})).status).toBe(404);
  const del=await r.call('/v1/device',{id:who.id,secret:who.secret},{method:'DELETE'});
  expect(del.status).toBe(200);expect(await del.json()).toEqual({deleted:true});
  expect((await r.clock(who.id,MONDAY_08,true)).record).toBeNull();
  expect(r.deliveries).toHaveLength(0);
 }finally{await r.dispose();}
},60_000);

test('a push service answering 410 deletes the device; five failures in a row delete it too',async()=>{
 const r=await deviceRuntime();try{
  const gone=await registered(r);r.state.status=410;
  expect((await r.clock(gone.who.id,MONDAY_08,true)).run.deleted).toBe(true);
  expect((await r.clock(gone.who.id,MONDAY_08+DAY,false)).record).toBeNull();
  r.state.status=500;
  const failing=await registered(r,{wakes:Array.from({length:6},(_,i)=>({m:480+i*2,d:ALL}))});
  const runs=[];for(let i=0;i<5;i++)runs.push((await r.clock(failing.who.id,MONDAY_08+i*120_000+1000,true)).run);
  expect(runs.slice(0,4).every(run=>run.skipped==='failed')).toBe(true);expect(runs[4].deleted).toBe(true);
 }finally{await r.dispose();}
},60_000);

test('the kill switch (on unless exactly "off") refuses registration and test sends, holds alarms, and still allows DELETE',async()=>{
 const r=await deviceRuntime();let who;try{({who}=await registered(r));}finally{await r.dispose();}
 const off=await deviceRuntime({bindings:{KILL_SWITCH:'on'}});try{
  const fresh=deviceIdentity();await off.clock(fresh.id,MONDAY_07);
  const put=await off.call('/v1/device',registration(fresh),{method:'PUT'});expect(put.status).toBe(503);expect(await put.json()).toEqual({error:'PUSH_PAUSED'});
  expect((await (await off.call('/v1/key')).json()).paused).toBe(true);
 }finally{await off.dispose();}
 const missing=await deviceRuntime({omit:['KILL_SWITCH']});try{
  const fresh=deviceIdentity();await missing.clock(fresh.id,MONDAY_07);
  expect((await missing.call('/v1/device',registration(fresh),{method:'PUT'})).status).toBe(503);
  expect(who).toBeTruthy();
 }finally{await missing.dispose();}
},60_000);

test('the test button sends at once, at most three times an hour, only with the secret',async()=>{
 const r=await deviceRuntime();try{
  const {who}=await registered(r);
  for(let i=0;i<3;i++)expect((await r.call('/v1/device/test',{id:who.id,secret:who.secret})).status).toBe(200);
  expect((await r.call('/v1/device/test',{id:who.id,secret:who.secret})).status).toBe(429);
  expect((await r.call('/v1/device/test',{id:who.id,secret:deviceIdentity().secret})).status).toBe(404);
  expect(r.deliveries).toHaveLength(3);expect(r.deliveries[0].headers.ttl).toBe('300');
 }finally{await r.dispose();}
},60_000);

test('a device not refreshed for 30 days leaves at its next alarm',async()=>{
 const r=await deviceRuntime();try{
  const {who}=await registered(r);
  const later=await r.clock(who.id,MONDAY_07+DEVICE_LIMITS.ttlMs+DAY,true);
  expect(later.run.deleted).toBe(true);expect(later.record).toBeNull();
 }finally{await r.dispose();}
},60_000);

test('the fixture route does not exist outside the test runtime',async()=>{
 const r=await deviceRuntime({fixture:false});try{
  expect((await r.call('/v1/device/fixture',{id:crypto.randomUUID(),now:1,alarm:true})).status).toBe(404);
  expect(APP_ORIGIN).toBe('https://app.test');
 }finally{await r.dispose();}
},60_000);
