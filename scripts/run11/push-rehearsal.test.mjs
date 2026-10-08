// Push reminders end to end (Session X Part 8, ADR-010): the app's real /api/push route (lib/server/push-route.ts) in
// this process, private sync and the push Worker in Miniflare, wired together as on the acceptance stack: the route
// confirms every session with private sync's registry and forwards to the push Worker; the Worker's real alarm (not
// the fixture clock) encrypts and delivers to a fixture push service. Then: a schedule change, a revoked session,
// unsubscribe, "Sign out all other devices" (delete-all), account deletion (delete-all from a device without a record),
// two accounts that never see each other's data, the route refusing the Worker's test control, and retention on the
// fixture clock. Fictional accounts, a VAPID key made here and a fixture push service; nothing leaves the machine.
// The real alarm fires on the next whole minute, so this file takes up to about a minute and a half.
import {afterAll,beforeAll,expect,test} from 'vitest';
import {pushRequest} from '../../apps/web/lib/server/push-route.ts';
import {ACCOUNT,APP_ORIGIN,decryptPush,deviceFixture,fixtureToken,pushRuntime} from './push-fixture.mjs';
import {privateRuntime} from './private-runtime.mjs';

const SYNC_ORIGIN='https://sync-rehearsal.workers.dev',PUSH_ORIGIN='https://push-rehearsal.workers.dev',OTHER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const clock=(/** @type {number} */ms)=>{const d=new Date(ms);return `${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`;};
/** @type {Awaited<ReturnType<typeof privateRuntime>>} */let sync;
/** @type {Awaited<ReturnType<typeof pushRuntime>>} */let push;
/** The app route's outbound calls, to the two Workers in Miniflare (the timeout signal and cache mode stay here). @type {typeof fetch} */
const fetcher=async(input,init={})=>{
 const url=new URL(String(input)),rest={.../** @type {RequestInit} */(init)};delete rest.signal;delete rest.cache;
 if(url.origin===SYNC_ORIGIN)return sync.mf.dispatchFetch('https://sync.test'+url.pathname,/** @type {any} */(rest));
 if(url.origin===PUSH_ORIGIN)return push.mf.dispatchFetch('https://push.test'+url.pathname,/** @type {any} */(rest));
 throw Error('The route reached '+url.origin);
};
const config=()=>({syncOrigin:SYNC_ORIGIN,pushOrigin:PUSH_ORIGIN,pushPublicKey:push.vapid.publicKey});
/** One /api/push call as the browser makes it: the app's origin, the session cookie, the account header. @param {unknown} body @param {{alias?:string,account?:string}} [who] */
const route=async(body,{alias='fixture',account=ACCOUNT}={})=>{
 const res=await pushRequest(new Request(APP_ORIGIN+'/api/push',{method:'POST',headers:{origin:APP_ORIGIN,'content-type':'application/json','x-zigoals-account':account,cookie:`__Host-zigoals_session=${fixtureToken(alias,account)}`},body:JSON.stringify(body)}),config(),fetcher);
 return {status:res.status,body:await res.json()};
};
const summary=async(/** @type {string} */account=ACCOUNT)=>(await push.mf.dispatchFetch('https://push.test/v1/push',{headers:{origin:APP_ORIGIN,authorization:'Bearer '+fixtureToken('fixture',account),'x-zigoals-account':account}})).json();
const QUIET={from:'00:00',to:'00:00'};
beforeAll(async()=>{sync=await privateRuntime();push=await pushRuntime({fixture:false});});
afterAll(async()=>{await push?.dispose();await sync?.mf.dispose();});

test('subscribe through the app route, the real alarm delivers one encrypted reminder, then a schedule change, a revoked session, unsubscribe, delete-all and account deletion',async()=>{
 const pk=await pushRequest(new Request(APP_ORIGIN+'/api/push'),config(),fetcher);
 expect(await pk.json()).toEqual({publicKey:push.vapid.publicKey});
 // Two signed-in devices of the same account, registered with private sync like Settings does.
 expect((await sync.call('/v1/sessions',{action:'register',label:'Phone'},'fixture')).status).toBe(200);
 const laptop=await (await sync.call('/v1/sessions',{action:'register',label:'Laptop'},'laptop')).json();
 // A reminder due at the next whole minute (UTC), all week; quiet hours that never overlap it (from == to: none).
 const due=Math.ceil((Date.now()+2000)/60_000)*60_000,device=await deviceFixture('https://push.test/device/phone');
 const subscribed=await route({action:'subscribe',endpoint:device.endpoint,p256dh:device.p256dh,auth:device.auth,zone:'UTC',quiet:QUIET,schedules:[{time:clock(due),zone:'UTC',weekdays:127}]});
 expect(subscribed.status).toBe(200);expect(subscribed.body).toMatchObject({schedules:1,subscriptions:1});
 const id=subscribed.body.subscriptionId;
 expect(await summary()).toEqual({subscriptions:1,schedules:1,nextDue:due});
 // The Worker's own alarm (no fixture clock): one delivery, readable only with the device's keys, and nothing in it.
 await expect.poll(()=>push.deliveries.length,{timeout:90_000,interval:500}).toBe(1);
 const [sent]=push.deliveries;
 expect(sent.url).toBe(device.endpoint);
 expect(sent.headers).toMatchObject({ttl:'1800',urgency:'normal',topic:'zigoals-reminder','content-encoding':'aes128gcm'});
 expect(sent.headers.authorization).toMatch(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]{87}$/);
 expect(await decryptPush({body:sent.body,privateKey:device.privateKey,uaPublic:device.uaPublic,auth:device.authBytes})).toBe('{"v":1}');
 // The next one is tomorrow at the same time.
 expect((await summary()).nextDue).toBe(due+86_400_000);
 // A schedule change goes through and moves the next reminder.
 const moved=await route({action:'schedule',subscriptionId:id,zone:'UTC',quiet:QUIET,schedules:[{time:clock(due+3_600_000),zone:'UTC',weekdays:127}]});
 expect(moved.status).toBe(200);expect((await summary()).nextDue).toBe(due+3_600_000);
 // A session private sync no longer lists gets nothing: revoked from the phone, the laptop is refused at the route.
 expect((await route({action:'delete-all'},{alias:'laptop'})).status).toBe(200);
 expect((await sync.call('/v1/sessions',{action:'revoke',id:laptop.id},'fixture')).status).toBe(200);
 expect(await route({action:'delete-all'},{alias:'laptop'})).toEqual({status:401,body:{error:'SIGN_IN_REQUIRED'}});
 // The laptop's delete-all above ran before its revocation: the account's push data was already gone. Subscribe again.
 const again=await route({action:'subscribe',endpoint:device.endpoint,p256dh:device.p256dh,auth:device.auth,zone:'UTC',quiet:QUIET,schedules:[{time:clock(due+3_600_000),zone:'UTC',weekdays:127}]});
 expect(again.status).toBe(200);
 // Unsubscribe: this device's subscription and schedules leave; no alarm is left for them.
 expect((await route({action:'unsubscribe',subscriptionId:again.body.subscriptionId})).status).toBe(200);
 expect(await summary()).toEqual({subscriptions:0,schedules:0,nextDue:null});
 // "Sign out all other devices" and account deletion both send delete-all (lib/push/device.ts): everything goes, even
 // when the deleting device holds no record of its own (Session X Part 8).
 const tablet=await deviceFixture('https://push.test/device/tablet');
 expect((await route({action:'subscribe',endpoint:tablet.endpoint,p256dh:tablet.p256dh,auth:tablet.auth,zone:'UTC',quiet:QUIET,schedules:[{time:'09:00',zone:'UTC',weekdays:127}]})).status).toBe(200);
 expect((await summary()).subscriptions).toBe(1);
 expect(await route({action:'delete-all'})).toEqual({status:200,body:{deleted:true}});
 expect(await summary()).toEqual({subscriptions:0,schedules:0,nextDue:null});
 expect(push.deliveries).toHaveLength(1);
},150_000);

test('two accounts never see each other\'s push data; the route refuses the Worker\'s test control and anything outside its four actions',async()=>{
 expect((await sync.call('/v1/sessions',{action:'register',label:'Phone'},'fixture')).status).toBe(200);
 const mine=await deviceFixture('https://push.test/device/mine');
 expect((await route({action:'subscribe',endpoint:mine.endpoint,p256dh:mine.p256dh,auth:mine.auth,zone:'Europe/Brussels',quiet:{from:'22:00',to:'07:00'},schedules:[{time:'08:00',zone:'Europe/Brussels',weekdays:31}]})).status).toBe(200);
 expect(await summary(OTHER)).toEqual({subscriptions:0,schedules:0,nextDue:null});
 expect((await summary()).subscriptions).toBe(1);
 // Another account's token for this account's header: private sync refuses the mismatch before the push Worker is asked.
 const crossed=await pushRequest(new Request(APP_ORIGIN+'/api/push',{method:'POST',headers:{origin:APP_ORIGIN,'content-type':'application/json','x-zigoals-account':ACCOUNT,cookie:`__Host-zigoals_session=${fixtureToken('fixture',OTHER)}`},body:JSON.stringify({action:'delete-all'})}),config(),fetcher);
 expect(crossed.status).not.toBe(200);expect((await summary()).subscriptions).toBe(1);
 for(const body of [{action:'fixture',now:0,alarm:true},{action:'delete-all',extra:1},{action:'subscribe'}])expect((await route(body)).status,JSON.stringify(body)).toBe(400);
 expect(await route({action:'delete-all'})).toEqual({status:200,body:{deleted:true}});
},60_000);

test('retention on the fixture clock: a subscription not refreshed for 30 days is deleted with its schedules; one refreshed stays',async()=>{
 const r=await pushRuntime();try{
  const DAY=86_400_000,start=Date.UTC(2026,9,8,6,0);
  const direct=(/** @type {unknown} */body)=>r.call('/v1/push',body);
  await r.clock(start);
  const old=await deviceFixture('https://push.test/device/old'),kept=await deviceFixture('https://push.test/device/kept');
  const add=async(/** @type {Awaited<ReturnType<typeof deviceFixture>>} */d)=>(await (await direct({action:'subscribe',endpoint:d.endpoint,p256dh:d.p256dh,auth:d.auth,zone:'UTC',quiet:QUIET,schedules:[{time:'07:00',zone:'UTC',weekdays:127}]})).json()).subscriptionId;
  await add(old);const keptId=await add(kept);
  expect((await (await r.call('/v1/push')).json()).subscriptions).toBe(2);
  // Day 29: the kept device refreshes its schedule (the app does this daily while it is used).
  await r.clock(start+29*DAY);
  expect((await direct({action:'schedule',subscriptionId:keptId,zone:'UTC',quiet:QUIET,schedules:[{time:'07:00',zone:'UTC',weekdays:127}]})).status).toBe(200);
  // Day 31: an alarm run prunes the subscription last refreshed 31 days ago, with its schedule.
  await r.clock(start+31*DAY,true);
  expect(await (await r.call('/v1/push')).json()).toMatchObject({subscriptions:1,schedules:1});
 }finally{await r.dispose();}
},60_000);
