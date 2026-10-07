// ZIGoals hosted, the relay (Session V Part 17), against the real Worker in Miniflare (zigi-relay-fixture.mjs): who may
// use it (a verified session, the app's origin, an invitation, the kill switch), the stream passed through as the MOCK
// provider sends it, the body the provider gets, the budgets per account and for the whole relay reconciled from the
// usage the stream reports, the circuit breaker, the size caps, and no message or reply in any log line. The budget
// object's fixture clock drives the days and the cool-downs; nothing here waits for real time.
import {expect,test} from 'vitest';
import {APP_ORIGIN,INVITED,OTHER,PROBE_LINE,RELAY_KEY,STRANGER,UPSTREAM,delta,relayRuntime,sse,usage} from './zigi-relay-fixture.mjs';

const NOON=Date.UTC(2026,9,6,12,0);
const ask=(text='How many minutes did I meditate this month?',extra={})=>({messages:[{role:'system',content:'You are ZIGi.'},{role:'user',content:text}],max_completion_tokens:1000,...extra});

test('only /health answers until every value is set; the routes and methods are fixed',async()=>{
 const r=await relayRuntime({omit:['ZIGI_UPSTREAM_KEY']});try{
  expect(await (await r.call('/health',{token:null})).json()).toEqual({ok:true});
  for(const path of ['/v1/entitlement','/v1/chat']){
   const res=await r.call(path,path==='/v1/chat'?{body:ask()}:{});
   expect(res.status,path).toBe(503);expect(await res.json()).toEqual({error:'HOSTED_CONFIGURATION_REQUIRED'});
  }
  expect((await r.call('/v1/chat')).status).toBe(405);
  expect((await r.call('/v1/other')).status).toBe(404);
  expect(r.upstream.requests).toHaveLength(0);
 }finally{await r.dispose();}
},60_000);

test('a verified session, the app\'s origin and the account it names: anything else is refused before the provider is called',async()=>{
 const r=await relayRuntime();try{
  const refused=async(/** @type {Parameters<typeof r.call>[1]} */options,status,error)=>{const res=await r.call('/v1/chat',{body:ask(),...options});expect(res.status,JSON.stringify(options)).toBe(status);expect(await res.json()).toEqual({error});};
  await refused({token:null},401,'SIGN_IN_REQUIRED');
  await refused({token:'invalid'},401,'SIGN_IN_REQUIRED');
  await refused({headers:{'x-zigoals-account':OTHER}},409,'ACCOUNT_CHANGED');
  await refused({headers:{origin:'https://elsewhere.test'}},403,'ORIGIN_DENIED');
  await refused({headers:{'content-type':'text/plain'}},415,'JSON_REQUIRED');
  expect(r.upstream.requests).toHaveLength(0);
 }finally{await r.dispose();}
},60_000);

test('invite only: an account that is not on the list is told so and never reaches the provider',async()=>{
 const r=await relayRuntime();try{
  expect(await (await r.call('/v1/entitlement',{account:STRANGER})).json()).toEqual({entitled:false,reason:'not-invited'});
  const res=await r.call('/v1/chat',{account:STRANGER,body:ask()});
  expect(res.status).toBe(403);expect(await res.json()).toEqual({error:'NOT_INVITED'});
  expect(await (await r.call('/v1/entitlement')).json()).toEqual({entitled:true,provider:'OpenAI',model:'gpt-6-luna',remaining:{requests:5,tokens:20000}});
  expect(r.upstream.requests).toHaveLength(0);
 }finally{await r.dispose();}
},60_000);

test('the kill switch: anything but "off" pauses the relay, for everyone',async()=>{
 for(const options of [{bindings:{ZIGI_KILL_SWITCH:'on'}},{omit:['ZIGI_KILL_SWITCH']},{bindings:{ZIGI_KILL_SWITCH:'Off'}}]){
  const r=await relayRuntime(options);try{
   expect(await (await r.call('/v1/entitlement')).json(),JSON.stringify(options)).toEqual({entitled:false,reason:'paused'});
   const res=await r.call('/v1/chat',{body:ask()});
   expect(res.status).toBe(503);expect(await res.json()).toEqual({error:'HOSTED_PAUSED'});
   expect(r.upstream.requests).toHaveLength(0);
  }finally{await r.dispose();}
 }
},60_000);

test('streaming passthrough: the provider\'s stream arrives as it is; the provider gets the relay\'s model, cap and usage chunk, and the tools as definitions only',async()=>{
 const r=await relayRuntime();try{
  const stream=sse(delta('Ten'),delta(' minutes a day.'),usage(310,12)),expected=await stream.clone().text();
  r.upstream.reply=()=>stream;
  const tool={type:'function',function:{name:'habit_stats',description:'Figures for one habit',parameters:{type:'object',properties:{habit:{type:'string',description:'A habit'}},required:['habit']}}};
  const res=await r.call('/v1/chat',{body:ask(undefined,{model:'something-else',max_completion_tokens:50_000,temperature:2,tools:[tool]})});
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(await res.text()).toBe(expected);
  expect(r.upstream.requests).toHaveLength(1);
  const [sent]=r.upstream.requests;
  expect(sent.headers.authorization).toBe(`Bearer ${RELAY_KEY}`);
  expect(sent.body).toEqual({model:'gpt-6-luna',stream:true,stream_options:{include_usage:true},max_completion_tokens:4096,store:false,messages:ask().messages,tools:[tool]});
  // Nothing about the person beyond the conversation: no account, session or address goes to the provider.
  expect(JSON.stringify(sent)).not.toContain(INVITED);expect(Object.keys(sent.headers)).not.toContain('x-zigoals-account');expect(Object.keys(sent.headers)).not.toContain('cookie');
 }finally{await r.dispose();}
},60_000);

test('budgets: requests per account, tokens per account and for the whole relay, reconciled from the reported usage; a new UTC day starts over',async()=>{
 const r=await relayRuntime({bindings:{ZIGI_DAILY_REQUESTS:'3',ZIGI_DAILY_TOKENS:'10000',ZIGI_GLOBAL_DAILY_TOKENS:'12000'}});try{
  await r.clock(NOON);
  const left=async(/** @type {string} */account=INVITED)=>(await (await r.call('/v1/entitlement',{account})).json()).remaining;
  r.upstream.reply=()=>sse(delta('ok'),usage(100,20));
  expect(await (await r.call('/v1/chat',{body:ask('hi')})).text()).toContain('"usage"');
  // The reservation (the input estimate plus the cap of 1000) became the 120 tokens the provider reported.
  await expect.poll(()=>left()).toEqual({requests:2,tokens:9880});
  r.upstream.reply=()=>sse(delta('long'),usage(5000,4000));
  await (await r.call('/v1/chat',{body:ask('a long one')})).text();
  await expect.poll(()=>left()).toEqual({requests:1,tokens:880});
  // Reserving another 1000+ tokens would pass this account's 10,000 for today.
  const tokens=await r.call('/v1/chat',{body:ask('hi')});
  expect(tokens.status).toBe(429);expect(await tokens.json()).toMatchObject({error:'ACCOUNT_DAILY_TOKENS',remaining:{requests:1,tokens:880}});
  // Another account: the relay's own 12,000 for today is nearly spent (9,120 by the first account).
  const global=await r.call('/v1/chat',{account:OTHER,body:ask('hi',{max_completion_tokens:4000})});
  expect(global.status).toBe(429);expect(await global.json()).toMatchObject({error:'GLOBAL_DAILY_TOKENS'});
  expect(await left(OTHER)).toEqual({requests:3,tokens:2880});
  // Requests per account, on the next day (counts start over at midnight UTC).
  await r.clock(NOON+86_400_000);
  r.upstream.reply=()=>sse(delta('ok'),usage(10,1));
  for(let i=0;i<3;i++)expect((await r.call('/v1/chat',{body:ask('hi',{max_completion_tokens:100})})).status).toBe(200);
  const requests=await r.call('/v1/chat',{body:ask('hi',{max_completion_tokens:100})});
  expect(requests.status).toBe(429);expect(await requests.json()).toMatchObject({error:'ACCOUNT_DAILY_REQUESTS',remaining:{requests:0}});
  expect(r.upstream.requests).toHaveLength(5);
 }finally{await r.dispose();}
},90_000);

test('the circuit breaker: five provider failures open it; the provider is not called while it is open; a probe after the cool-down; a success closes it',async()=>{
 const r=await relayRuntime({bindings:{ZIGI_DAILY_REQUESTS:'100'}});try{
  // The breaker as the budget object holds it, read through the fixture clock (settling happens after each answer).
  const phase=async(/** @type {number} */now)=>(await r.clock(now)).breaker.phase;
  await r.clock(NOON);
  r.upstream.reply=()=>new Response('{"error":{"message":"overloaded"}}',{status:503});
  for(let i=0;i<5;i++){const res=await r.call('/v1/chat',{body:ask()});expect(res.status).toBe(502);expect(await res.json()).toEqual({error:'UPSTREAM_UNAVAILABLE',status:503});}
  await expect.poll(()=>phase(NOON)).toBe('open');
  const open=await r.call('/v1/chat',{body:ask()});
  expect(open.status).toBe(503);expect(await open.json()).toEqual({error:'UPSTREAM_PAUSED',retryAfterSeconds:30});
  expect(r.upstream.requests).toHaveLength(5);
  // After the 30 s cool-down one probe goes through; it fails, so the next wait is 60 s.
  expect((await r.call('/v1/chat',{body:ask()})).status).toBe(503);
  await r.clock(NOON+31_000);
  expect((await r.call('/v1/chat',{body:ask()})).status).toBe(502);
  await expect.poll(()=>phase(NOON+31_000)).toBe('open');
  await r.clock(NOON+31_000+59_000);
  expect((await r.call('/v1/chat',{body:ask()})).status).toBe(503);
  expect(r.upstream.requests).toHaveLength(6);
  await r.clock(NOON+31_000+61_000);
  r.upstream.reply=()=>sse(delta('back'),usage(10,2));
  const probe=await r.call('/v1/chat',{body:ask()});
  expect(probe.status).toBe(200);expect(await probe.text()).toContain('back');
  await expect.poll(()=>phase(NOON+31_000+61_000)).toBe('closed');
  // A request the provider refuses as invalid (400) is not a provider failure: it never opens the breaker.
  r.upstream.reply=()=>new Response('{}',{status:400});
  for(let i=0;i<6;i++){const res=await r.call('/v1/chat',{body:ask()});expect(res.status).toBe(502);expect(await res.json()).toEqual({error:'UPSTREAM_REFUSED',status:400});}
  await expect.poll(()=>phase(NOON+31_000+61_000)).toBe('closed');
  expect(await phase(NOON+31_000+61_000)).toBe('closed');
 }finally{await r.dispose();}
},90_000);

test('size caps: a request over 1 MiB is refused unread; a reply over 2 MiB ends with an error event',async()=>{
 const r=await relayRuntime({bindings:{ZIGI_DAILY_TOKENS:'10000000',ZIGI_GLOBAL_DAILY_TOKENS:'10000000'}});try{
  const big=await r.call('/v1/chat',{body:ask('x'.repeat(1_100_000))});
  expect(big.status).toBe(413);expect(await big.json()).toEqual({error:'REQUEST_TOO_LARGE'});
  expect(r.upstream.requests).toHaveLength(0);
  const words='y'.repeat(60_000);
  r.upstream.reply=()=>sse(...Array.from({length:40},()=>delta(words)),usage(1,1));
  const text=await (await r.call('/v1/chat',{body:ask()})).text();
  expect(text.length).toBeLessThan(2_200_000);
  expect(text.trimEnd().split('\n').at(-1)).toBe('data: {"error":{"code":413,"message":"The reply was longer than ZIGoals hosted allows."}}');
  // A malformed body is refused. (A reply that breaks off is tested on the stream itself, zigi-relay-budget.test.mjs:
  // Miniflare's outbound bridge ends a broken body as if it were complete.)
  const malformed=await r.call('/v1/chat',{body:'{"messages":'});
  expect(malformed.status).toBe(400);
 }finally{await r.dispose();}
},90_000);

test('nothing is logged: no question, reply, account or key in any log line (the capture itself works)',async()=>{
 const r=await relayRuntime();try{
  const QUESTION='SENTINEL_QUESTION_51c0 how much did I eat',REPLY='SENTINEL_REPLY_9e2d about two meals';
  r.upstream.reply=()=>sse(delta(REPLY),usage(20,5));
  expect(await (await r.call('/v1/chat',{body:ask(QUESTION)})).text()).toContain(REPLY);
  await r.call('/v1/chat',{account:STRANGER,body:ask(QUESTION)});
  r.upstream.reply=()=>new Response('{"error":{"message":"SENTINEL_PROVIDER_ERROR"}}',{status:500});
  await r.call('/v1/chat',{body:ask(QUESTION)});
  await r.probe();
  await expect.poll(()=>r.logs.some(line=>line.includes(PROBE_LINE))).toBe(true);
  for(const line of r.logs)for(const secret of [QUESTION,REPLY,'SENTINEL_PROVIDER_ERROR',INVITED,STRANGER,RELAY_KEY,APP_ORIGIN,UPSTREAM])expect(line).not.toContain(secret);
 }finally{await r.dispose();}
},60_000);
