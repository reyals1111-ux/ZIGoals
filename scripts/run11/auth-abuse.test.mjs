import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const script=async()=>(await build({entryPoints:[new URL('../../workers/auth-abuse/worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']})).outputFiles[0].text;
async function admission(extra={}){
 const code=await script(),persist=await mkdtemp(join(tmpdir(),'run11-auth-'));let mf;
 const start=(time,key='fixture-secret-00000000000000000000')=>{mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(r,e){return e.GATE.fetch(r)}}',serviceBindings:{GATE:{name:'gate',entrypoint:'AdmissionService'}}},{name:'gate',modules:true,script:code,compatibilityDate:'2026-09-13',durableObjects:{ADMISSION:{className:'AdmissionAuthority',useSQLite:true}},bindings:{AUTH_ADMISSION_KEY:key,ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(time),...extra},outboundService:()=>{throw Error('No network authorized');}}]}),resourcePersistencePath:persist});};
 const raw=(action='send',email='fiction@example.invalid',ip='192.0.2.1')=>mf.dispatchFetch('https://gate.test/',{method:'POST',body:JSON.stringify({action,email,ip})});
 const call=(...args)=>raw(...args).then(r=>r.status);
 return {restart:async(time,key)=>{await mf?.dispose();start(time,key);},call,raw,close:()=>mf?.dispose()};
}

test('durable auth admission binds email and IP, survives restart, expires safely and fails closed',async()=>{
 const a=await admission(),now=Date.now();
 try{
  await a.restart(now);expect(await a.call()).toBe(200);expect(await a.call('send','FICTION@example.invalid','192.0.2.2')).toBe(429);
  await a.restart(now+1000);expect(await a.call()).toBe(429);
  for(let i=0;i<10;i++)expect(await a.call('verify')).toBe(200);expect(await a.call('verify')).toBe(429);
  // Unchanged: 30 sends per IP per hour. Ten emails, three rounds past each 60 s cooldown.
  const emails=Array.from({length:10},(_,i)=>`round${i}@example.invalid`);
  for(let round=0;round<3;round++){await a.restart(now+2000+round*61000);for(const email of emails)expect(await a.call('send',email,'198.51.100.7')).toBe(200);}
  expect(await a.call('send',emails[0],'198.51.100.7')).toBe(429);
  await a.restart(now+86400001);expect(await a.call()).toBe(200);
  await a.restart(now+86400002,'');expect(await a.call()).toBe(503);
  expect(await a.call('send','fiction@example.invalid','')).toBe(400);
 }finally{await a.close();}
},60000);

test('one IP group can touch only a bounded number of distinct emails, and IPv6 groups code requests by /48',async()=>{
 const a=await admission(),now=Date.now();
 try{
  await a.restart(now);
  for(let i=0;i<10;i++)expect(await a.call('send',`spray${i}@example.invalid`,`2001:db8:1:2::${(i+1).toString(16)}`)).toBe(200);
  // Another address in the same /64 is the same group; the cap is per group.
  expect(await a.call('send','spray10@example.invalid','2001:db8:1:2:ffff:ffff:ffff:ffff')).toBe(429);
  expect(await a.call('send','spray10@example.invalid','2001:0db8:0001:0002::0abc')).toBe(429);
  // A known email from that group still counts normally. Session Z-Cloud Part 5 (A5): another /64 of the same /48 is the
  // same group for code requests; a different /48 is independent.
  await a.restart(now+61000);expect(await a.call('send','spray0@example.invalid','2001:db8:1:2::99')).toBe(200);
  expect(await a.call('send','spray10@example.invalid','2001:db8:1:3::1')).toBe(429);
  expect(await a.call('send','spray10@example.invalid','2001:db8:1:ffff::1')).toBe(429);
  expect(await a.call('send','spray10@example.invalid','2001:db8:2:3::1')).toBe(200);
  // IPv4-mapped IPv6 is the IPv4 address.
  for(let i=0;i<10;i++)expect(await a.call('send',`mapped${i}@example.invalid`,'192.0.2.50')).toBe(200);
  expect(await a.call('send','mapped10@example.invalid','::ffff:192.0.2.50')).toBe(429);
  expect(await a.call('send','bad@example.invalid','2001:db8::1::2')).toBe(400);
 }finally{await a.close();}
},60000);

test('failed code verifications are capped per email per day on top of the 10-minute limit',async()=>{
 const a=await admission(),now=Date.now(),ip=n=>`203.0.113.${n}`;
 try{
  await a.restart(now);
  // Stay within 10 attempts per 10 minutes, but fail 20 times across the day.
  for(let window=0;window<2;window++){await a.restart(now+window*600001);for(let i=0;i<10;i++){expect(await a.call('verify','target@example.invalid',ip(window))).toBe(200);expect(await a.call('verify-failed','target@example.invalid',ip(window))).toBe(200);}}
  await a.restart(now+3*600001);expect(await a.call('verify','target@example.invalid',ip(9))).toBe(429);
  expect(await a.call('verify','other@example.invalid',ip(9))).toBe(200);
  await a.restart(now+86400000+3*600001);expect(await a.call('verify','target@example.invalid',ip(9))).toBe(200);
 }finally{await a.close();}
},60000);

test('filling the admission table cannot stop sign-in for new users and keeps code-guessing limits',async()=>{
 // Tiny shards (fixture only) so the fill is fast: 32 shards per dimension, 3 records each. Session Z-Cloud Part 5 (A5):
 // the day's ceiling on code emails is lifted here (fixture only), so this test still measures the table alone; the
 // ceiling has its own test above.
 const a=await admission({LOCAL_SHARD_CAPACITY:'3',LOCAL_DAILY_SENDS:'1000000'}),now=Date.now();
 try{
  await a.restart(now);
  // Lock a victim's code attempts first.
  for(let i=0;i<10;i++)expect(await a.call('verify','victim@example.invalid','198.51.100.200')).toBe(200);
  expect(await a.call('verify','victim@example.invalid','198.51.100.201')).toBe(429);
  // Fill attempt: 400 IP groups each touching 10 new emails, far above total capacity (192).
  const statuses=[];for(let n=0;n<400;n++)for(let i=0;i<10;i++)statuses.push(await a.call('send',`fill${n}-${i}@example.invalid`,`10.${n>>8}.${n&255}.1`));
  expect(statuses.every(s=>s===200||s===429)).toBe(true);
  // New users on new IPs can still request codes.
  for(let i=0;i<20;i++)expect(await a.call('send',`newcomer${i}@example.invalid`,`172.16.${i}.1`)).toBe(200);
  // The victim's code-attempt limit survived the fill: verification records are never evicted.
  expect(await a.call('verify','victim@example.invalid','172.31.0.1')).toBe(429);
 }finally{await a.close();}
},180000);

// Session Z-Cloud Part 5 (A5, ADR-019): one ceiling on code emails per UTC day across every address and network.
test('code requests stop at 60 a UTC day across addresses and networks, and only requests that passed their own limits count',async()=>{
 const a=await admission(),midnight=Date.UTC(2026,9,11),now=midnight-3600000;
 const raw=(email,ip)=>a.raw('send',email,ip);
 try{
  await a.restart(now);
  // N+1 from distinct /64s inside one /48: the /48 is one group, so its distinct-email cap (10) applies, not the ceiling.
  for(let i=0;i<10;i++)expect(await a.call('send',`home${i}@example.invalid`,`2001:db8:aa:${(i+1).toString(16)}::1`)).toBe(200);
  const home=await raw('home10@example.invalid','2001:db8:aa:ff::1');expect(home.status).toBe(429);expect((await home.json()).error).toBe('TRY_LATER');
  // Across /48s and IPv4 networks: 50 more fill the day's 60.
  for(let i=0;i<50;i++)expect(await a.call('send',`spread${i}@example.invalid`,i%2?`2001:db8:${(0x100+i).toString(16)}::1`:`198.51.${i}.1`)).toBe(200);
  const over=await raw('late@example.invalid','203.0.113.77');
  expect(over.status).toBe(429);expect((await over.json()).error).toBe('DAILY_LIMIT');expect(over.headers.get('retry-after')).toBe('3600');
  // A request its own IP or email refused never used up the day: the refused /48 above counted nothing.
  expect(await a.call('send','home10@example.invalid','2001:db8:aa:ff::2')).toBe(429);
  // Codes already sent can still be verified while sending is paused.
  expect(await a.call('verify','home0@example.invalid','2001:db8:aa:1::1')).toBe(200);
  // The ceiling holds across a restart and ends at the next UTC midnight.
  await a.restart(midnight-1000);const late=await a.raw('send','later@example.invalid','192.0.2.99');expect(late.status).toBe(429);expect((await late.json()).error).toBe('DAILY_LIMIT');
  await a.restart(midnight+1);expect(await a.call('send','tomorrow@example.invalid','192.0.2.100')).toBe(200);
 }finally{await a.close();}
},120000);

test('code verification keeps grouping IPv6 by /64',async()=>{
 const a=await admission(),now=Date.now();
 try{
  await a.restart(now);
  for(let i=0;i<20;i++)expect(await a.call('verify',`check${i}@example.invalid`,`2001:db8:9:1::${(i+1).toString(16)}`)).toBe(200);
  expect(await a.call('verify','check20@example.invalid','2001:db8:9:1::ff')).toBe(429);
  expect(await a.call('verify','check20@example.invalid','2001:db8:9:2::1')).toBe(200);
 }finally{await a.close();}
},60000);
