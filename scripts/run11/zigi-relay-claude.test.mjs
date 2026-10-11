// Session Z-Cloud Part 6 (ADR-019 C40): "ZIGoals AI · powered by Claude" for friends, the relay on Claude Sonnet 5.5 in
// Miniflare with a MOCK Anthropic provider (zigi-relay-fixture.mjs): the body Z-Local's adapter sends (no thinking
// field, the effort, the cached system block, one retry without `output_config` when a model rejects it), the models
// the relay accepts, and the per-person budgets in messages and dollars, daily and monthly, settled from each reply's
// own usage with cache writes and reads at their prices. Fictional accounts and a fake key; nothing leaves the machine.
import {expect,test} from 'vitest';
import {ANTHROPIC,INVITED,OTHER,anthropicSse,messageEnd,messageStart,relayRuntime,textBlock} from './zigi-relay-fixture.mjs';
import {costMicros,estimateCost} from '../../workers/zigi-relay/pricing.mjs';

const CLAUDE={ZIGI_UPSTREAM_URL:ANTHROPIC,ZIGI_PROVIDER_NAME:'Anthropic',ZIGI_MODEL:'claude-sonnet-5-5',ZIGI_DAILY_TOKENS:'2000000',ZIGI_GLOBAL_DAILY_TOKENS:'20000000'};
const ask=(text='How many minutes did I meditate this month?',extra={})=>({messages:[{role:'system',content:'You are ZIGi.'},{role:'user',content:text}],max_tokens:4096,...extra});
const DAY=Date.UTC(2026,9,10,12),NEXT_DAY=DAY+86_400_000,NEXT_MONTH=Date.UTC(2026,10,2,12);
const remaining=async r=>(await (await r.call('/v1/entitlement')).json()).remaining;
const reply=(usage)=>()=>anthropicSse(messageStart(usage.input,{cacheWrite:usage.cacheWrite,cacheRead:usage.cacheRead}),...textBlock(0,'Ten minutes.'),...messageEnd('end_turn',usage.output));

test('the body Claude gets: Sonnet 5.5, no thinking field, the quick effort or "Think deeper", the system prompt cached, no forced tool choice',async()=>{
 const r=await relayRuntime({bindings:CLAUDE});try{
  r.upstream.reply=reply({input:40,cacheWrite:0,cacheRead:0,output:5});
  await (await r.call('/v1/chat',{body:ask()})).text();
  await (await r.call('/v1/chat',{body:ask('Think about my month',{reasoning_effort:'high'})})).text();
  const [quick,deep]=r.upstream.requests.map(q=>q.body);
  expect(quick).toMatchObject({model:'claude-sonnet-5-5',stream:true,output_config:{effort:'low'},cache_control:{type:'ephemeral'},system:[{type:'text',text:'You are ZIGi.',cache_control:{type:'ephemeral'}}]});
  expect(deep.output_config).toEqual({effort:'high'});
  for(const body of [quick,deep]){expect(body).not.toHaveProperty('thinking');expect(body).not.toHaveProperty('tool_choice');}
 }finally{await r.dispose();}
},60_000);

test('a model that rejects output_config gets the same request once more without it; any other 400 is not retried',async()=>{
 const r=await relayRuntime({bindings:CLAUDE});try{
  r.upstream.reply=(body,n)=>n===1?Response.json({type:'error',error:{type:'invalid_request_error',message:'output_config: Extra inputs are not permitted'}},{status:400}):reply({input:40,cacheWrite:0,cacheRead:0,output:5})();
  const res=await r.call('/v1/chat',{body:ask()});expect(res.status).toBe(200);expect(await res.text()).toContain('Ten minutes.');
  expect(r.upstream.requests).toHaveLength(2);expect(r.upstream.requests[1].body).not.toHaveProperty('output_config');
  expect(r.upstream.requests[1].body).toMatchObject({model:'claude-sonnet-5-5',messages:r.upstream.requests[0].body.messages});
  r.upstream.reply=()=>Response.json({type:'error',error:{type:'invalid_request_error',message:'messages: roles must alternate'}},{status:400});
  const refused=await r.call('/v1/chat',{body:ask()});expect(refused.status).toBe(502);expect(await refused.json()).toEqual({error:'UPSTREAM_REFUSED',status:400});
  expect(r.upstream.requests).toHaveLength(3);
 }finally{await r.dispose();}
},60_000);

test('only Claude Sonnet 5.5 or Claude Haiku 5.5 on Anthropic\'s address; any other model, or a money budget that is not an amount, fails closed',async()=>{
 for(const bindings of [{...CLAUDE,ZIGI_MODEL:'claude-opus-5-5'},{...CLAUDE,ZIGI_MODEL:'claude-fable-5-1'},{...CLAUDE,ZIGI_MONTHLY_USD:'ten'},{...CLAUDE,ZIGI_MONTHLY_REQUESTS:'0'}]){
  const r=await relayRuntime({bindings});try{
   expect((await r.call('/v1/chat',{body:ask()})).status).toBe(503);expect(r.upstream.requests).toHaveLength(0);
  }finally{await r.dispose();}
 }
 const haiku=await relayRuntime({bindings:{...CLAUDE,ZIGI_MODEL:'claude-haiku-5-5'}});try{
  haiku.upstream.reply=reply({input:40,cacheWrite:0,cacheRead:0,output:5});
  expect((await haiku.call('/v1/chat',{body:ask()})).status).toBe(200);expect(haiku.upstream.requests[0].body.model).toBe('claude-haiku-5-5');
 }finally{await haiku.dispose();}
},90_000);

test('dollars a day and a month per person: reserved at the dearest, settled from the reply\'s usage with cache writes and reads at their prices',async()=>{
 const r=await relayRuntime({bindings:{...CLAUDE,ZIGI_DAILY_USD:'0.05',ZIGI_MONTHLY_USD:'0.05',ZIGI_DAILY_REQUESTS:'10'}});try{
  await r.clock(DAY);
  const usage={input:1000,cacheWrite:2000,cacheRead:8000,output:300},cost=costMicros('claude-sonnet-5-5',usage);
  // 1,000 × $2 + 300 × $10 + 2,000 × $2.50 + 8,000 × $0.10 per million: $0.0108.
  expect(cost).toBe(10_800);expect(estimateCost('claude-sonnet-5-5',usage)).toBeCloseTo(0.0108,10);
  expect(await remaining(r)).toEqual({requests:10,tokens:2_000_000,usd:0.05,month:{usd:0.05}});
  r.upstream.reply=reply(usage);
  expect((await r.call('/v1/chat',{body:ask()})).status).toBe(200);
  await expect.poll(()=>remaining(r)).toEqual({requests:9,tokens:2_000_000-11_300,usd:0.0392,month:{usd:0.0392}});
  // The next one would reserve about $0.041 (the prompt at the cache-write price plus 4,096 output tokens): over today's $0.05.
  const over=await r.call('/v1/chat',{body:ask()});expect(over.status).toBe(429);expect((await over.json()).error).toBe('ACCOUNT_DAILY_USD');
  expect(r.upstream.requests).toHaveLength(1);
  // Another invited person has an allowance of their own.
  expect((await r.call('/v1/chat',{account:OTHER,body:ask()})).status).toBe(200);
  // A new day: today's money is back, the month's is not ($0.0392 left of $0.05, less than the reservation).
  await r.clock(NEXT_DAY);
  const month=await r.call('/v1/chat',{body:ask()});expect(month.status).toBe(429);expect((await month.json()).error).toBe('ACCOUNT_MONTHLY_USD');
  // A new month: both are back.
  await r.clock(NEXT_MONTH);expect((await r.call('/v1/chat',{body:ask()})).status).toBe(200);
 }finally{await r.dispose();}
},90_000);

test('messages a month per person, on top of messages a day; the relay\'s own dollars a day for everyone',async()=>{
 const r=await relayRuntime({bindings:{...CLAUDE,ZIGI_MONTHLY_REQUESTS:'3',ZIGI_DAILY_REQUESTS:'2',ZIGI_GLOBAL_DAILY_USD:'0.1'}});try{
  r.upstream.reply=reply({input:100,cacheWrite:0,cacheRead:0,output:10});
  await r.clock(DAY);
  for(let i=0;i<2;i++)expect((await r.call('/v1/chat',{body:ask()})).status).toBe(200);
  const daily=await r.call('/v1/chat',{body:ask()});expect(daily.status).toBe(429);expect((await daily.json()).error).toBe('ACCOUNT_DAILY_REQUESTS');
  await r.clock(NEXT_DAY);expect((await r.call('/v1/chat',{body:ask()})).status).toBe(200);
  const monthly=await r.call('/v1/chat',{body:ask()});expect(monthly.status).toBe(429);expect((await monthly.json()).error).toBe('ACCOUNT_MONTHLY_REQUESTS');
  await expect.poll(()=>remaining(r)).toMatchObject({requests:1,month:{requests:0}});
  // The relay's own $0.10 a day: two reservations of about $0.041 fit, a third does not, whoever asks.
  await r.clock(NEXT_MONTH);
  r.upstream.reply=()=>new Response(new ReadableStream({start(){}}),{status:200,headers:{'content-type':'text/event-stream'}});
  const held=[r.call('/v1/chat',{body:ask()}),r.call('/v1/chat',{account:OTHER,body:ask()})];
  await expect.poll(()=>r.upstream.requests.length).toBe(5);
  const global=await r.call('/v1/chat',{account:OTHER,body:ask()});expect(global.status).toBe(429);expect((await global.json()).error).toBe('GLOBAL_DAILY_USD');
  for(const pending of held)void pending.then(res=>res.body?.cancel()).catch(()=>{});
 }finally{await r.dispose();}
},90_000);

test('the kill switch is on unless it says "off", and only invited accounts are served',async()=>{
 const paused=await relayRuntime({bindings:{...CLAUDE,ZIGI_KILL_SWITCH:'on'}});try{
  expect(await (await paused.call('/v1/entitlement')).json()).toEqual({entitled:false,reason:'paused'});
  expect((await paused.call('/v1/chat',{body:ask()})).status).toBe(503);expect(paused.upstream.requests).toHaveLength(0);
 }finally{await paused.dispose();}
 const r=await relayRuntime({bindings:CLAUDE});try{
  expect((await r.call('/v1/chat',{account:'33333333-3333-4333-8333-333333333333',body:ask()})).status).toBe(403);
  expect((await r.call('/v1/chat',{account:INVITED,body:ask()})).status).toBe(200);
 }finally{await r.dispose();}
},60_000);
