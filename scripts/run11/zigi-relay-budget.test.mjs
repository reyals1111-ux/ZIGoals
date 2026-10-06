// ZIGoals hosted, the relay (Session V Part 17): the pure parts, without a runtime. The daily budget decisions, the
// circuit breaker's transitions, the body the provider gets (rebuilt from the messages and tool definitions only), the
// usage line, and the switches that keep the relay closed until the owner opens it on purpose.
import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {BREAKER,admitDaily,breakerAdmit,breakerSettle,closedBreaker,dailyPolicy,dayOf,remainingFor,reserveFor} from '../../workers/zigi-relay/budget.mjs';
import {configured,invited,lastBoundary,metered,paused,upstreamBody,usageIn} from '../../workers/zigi-relay/relay.mjs';
import {LIMITS} from '../../workers/zigi-relay/limits.mjs';

const OPENAI=new URL('https://api.openai.com/v1/chat/completions'),OTHER=new URL('https://api.example.test/v1/chat/completions');
const ENV={AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'public',APP_ORIGIN:'https://app.test',ZIGI_UPSTREAM_URL:OPENAI.href,ZIGI_UPSTREAM_KEY:'sk-test-FAKE',ZIGI_PROVIDER_NAME:'OpenAI',ZIGI_MODEL:'gpt-6-luna',ZIGI_DAILY_REQUESTS:'40',ZIGI_DAILY_TOKENS:'150000',ZIGI_GLOBAL_DAILY_TOKENS:'1500000'};

test('daily budgets: per account requests and tokens, then the relay\'s own total; what is left is the smaller of the two',()=>{
 const policy=/** @type {NonNullable<ReturnType<typeof dailyPolicy>>} */(dailyPolicy(ENV));
 expect(policy).toEqual({accountRequests:40,accountTokens:150000,globalTokens:1500000});
 expect(admitDaily(policy,{requests:0,tokens:0},{tokens:0},5000)).toBeNull();
 expect(admitDaily(policy,{requests:40,tokens:0},{tokens:0},1)).toBe('ACCOUNT_DAILY_REQUESTS');
 expect(admitDaily(policy,{requests:1,tokens:149_000},{tokens:0},1001)).toBe('ACCOUNT_DAILY_TOKENS');
 expect(admitDaily(policy,{requests:1,tokens:0},{tokens:1_499_500},501)).toBe('GLOBAL_DAILY_TOKENS');
 expect(remainingFor(policy,{requests:3,tokens:1000},{tokens:1_400_000})).toEqual({requests:37,tokens:100000});
 expect(reserveFor(31,1000)).toBe(1008);
 expect(dayOf(Date.UTC(2026,9,6,23,59))).toBe('2026-10-06');
 // A missing, zero, negative or decimal budget leaves the relay unconfigured.
 for(const bad of ['', '0', '-5', '1.5', '1e9', 'abc'])expect(dailyPolicy({...ENV,ZIGI_DAILY_TOKENS:bad}),bad).toBeNull();
});

test('the breaker: five failures in a minute open it; one probe after the cool-down; a failed probe doubles the wait up to ten minutes; a success closes it',()=>{
 let b=closedBreaker(),now=1_000_000;
 for(let i=0;i<4;i++){expect(breakerAdmit(b,now).ok).toBe(true);b=breakerSettle(b,BREAKER,'failure',now);now+=1000;}
 expect(b.phase).toBe('closed');
 // Failures older than the window no longer count.
 expect(breakerSettle(b,BREAKER,'failure',now+BREAKER.windowMs+10_000).phase).toBe('closed');
 b=breakerSettle(b,BREAKER,'failure',now);
 expect(b).toMatchObject({phase:'open',trips:1,retryAt:now+30_000});
 expect(breakerAdmit(b,now+29_999).ok).toBe(false);
 const probe=breakerAdmit(b,now+30_000);expect(probe).toMatchObject({ok:true,breaker:{phase:'half-open',probe:true}});
 expect(breakerAdmit(probe.breaker,now+30_001).ok).toBe(false);
 b=breakerSettle(probe.breaker,BREAKER,'failure',now+31_000);
 expect(b).toMatchObject({phase:'open',trips:2,retryAt:now+31_000+60_000});
 // A neutral end (the provider refused the request itself) frees the probe without deciding.
 const again=breakerAdmit(b,now+91_000).breaker;
 expect(breakerSettle(again,BREAKER,'neutral',now+91_500)).toMatchObject({phase:'half-open',probe:false});
 expect(breakerSettle(again,BREAKER,'ok',now+92_000)).toEqual(closedBreaker());
 // The wait never exceeds ten minutes, however many probes fail.
 const old=/** @type {ReturnType<typeof closedBreaker>} */({...b,trips:9}),at=old.retryAt;
 expect(breakerSettle(breakerAdmit(old,at).breaker,BREAKER,'failure',at).retryAt-at).toBe(BREAKER.maxCooldownMs);
});

test('the provider gets the messages and tool definitions only; the model, the output cap, the usage chunk and OpenAI\'s store:false are the relay\'s',()=>{
 const tool={type:'function',function:{name:'habit_stats',description:'Figures for one habit',parameters:{type:'object',properties:{habit:{type:'string',description:'A habit'}},required:['habit']}},strict:true,extra:1};
 const body=upstreamBody({model:'someone-elses-model',temperature:2,n:4,user:'person@example.test',max_completion_tokens:99999,stream:false,messages:[{role:'system',content:'You are ZIGi.',name:'x'},{role:'user',content:'How many minutes did I meditate?'},{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'habit_stats',arguments:'{"habit":"Meditate"}'}}]},{role:'tool',tool_call_id:'call_1',content:'{"minutes":120}'}],tools:[tool]},ENV,OPENAI);
 expect(body).toEqual({model:'gpt-6-luna',stream:true,stream_options:{include_usage:true},max_completion_tokens:LIMITS.maxOutputTokens,store:false,
  messages:[{role:'system',content:'You are ZIGi.'},{role:'user',content:'How many minutes did I meditate?'},{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'habit_stats',arguments:'{"habit":"Meditate"}'}}]},{role:'tool',tool_call_id:'call_1',content:'{"minutes":120}'}],
  tools:[{type:'function',function:{name:'habit_stats',description:'Figures for one habit',parameters:tool.function.parameters}}]});
 // Another OpenAI-compatible upstream takes max_tokens and no store field; a smaller cap is kept.
 expect(upstreamBody({messages:[{role:'user',content:'hi'}],max_tokens:300},ENV,OTHER)).toEqual({model:'gpt-6-luna',stream:true,stream_options:{include_usage:true},max_tokens:300,messages:[{role:'user',content:'hi'}]});
 for(const bad of [null,[],{},{messages:[]},{messages:'hi'},{messages:[{role:'admin',content:'x'}]},{messages:[{role:'user',content:5}]},{messages:[{role:'tool',content:'x'}]},{messages:[{role:'user',content:'x'}],tools:[{type:'function',function:{name:'bad name'}}]},{messages:[{role:'user',content:'x'}],tools:'x'},{messages:Array.from({length:LIMITS.messages+1},()=>({role:'user',content:'x'}))}])
  expect(upstreamBody(bad,ENV,OPENAI),JSON.stringify(bad)?.slice(0,60)).toBeNull();
});

test('the usage line, the switches and the invitations',()=>{
 expect(usageIn('data: {"choices":[],"usage":{"prompt_tokens":100,"completion_tokens":20}}')).toBe(120);
 expect(usageIn('data: {"choices":[{"delta":{"content":"usage"}}],"usage":null}')).toBeNull();
 expect(usageIn('data: [DONE]')).toBeNull(); expect(usageIn(': keep-alive')).toBeNull(); expect(usageIn('data: {"usage":{"prompt_tokens":"9"}}')).toBeNull();
 expect(configured(ENV)).toBe(true);
 for(const [key,value] of [['AUTH_PUBLIC_KEY',''],['ZIGI_UPSTREAM_KEY',''],['ZIGI_UPSTREAM_URL','http://api.openai.com/v1/chat/completions'],['ZIGI_UPSTREAM_URL','https://user:pass@api.openai.com/v1/chat/completions'],['ZIGI_MODEL',''],['ZIGI_PROVIDER_NAME',''],['ZIGI_GLOBAL_DAILY_TOKENS','0'],['AUTH_ORIGIN','https://evil.test']])
  expect(configured({...ENV,[key]:value}),`${key}=${value}`).toBe(false);
 // Paused unless the switch says exactly "off".
 expect(paused({})).toBe(true); expect(paused({ZIGI_KILL_SWITCH:'on'})).toBe(true); expect(paused({ZIGI_KILL_SWITCH:'OFF'})).toBe(true); expect(paused({ZIGI_KILL_SWITCH:'off'})).toBe(false);
 expect([...invited({ZIGI_ALLOWLIST:'11111111-1111-4111-8111-111111111111, not-an-id\n22222222-2222-4222-8222-22222222222A'})]).toEqual(['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-22222222222a']);
 expect(invited({}).size).toBe(0);
});

test('privacy by construction: no console call and no storage of a message anywhere in the relay; its template is paused, quiet and placeholder-only',()=>{
 for(const file of ['worker.mjs','relay.mjs','budget.mjs','limits.mjs']){
  const source=readFileSync(new URL(`../../workers/zigi-relay/${file}`,import.meta.url),'utf8');
  expect(source,file).not.toMatch(/console\./);
  expect(source,file).not.toMatch(/\.put\(|caches\.|\bKV\b|\bR2\b|\bD1\b/);
 }
 const config=JSON.parse(readFileSync(new URL('../../workers/zigi-relay/wrangler.local.jsonc',import.meta.url),'utf8'));
 expect(config.observability).toEqual({enabled:false});
 expect(config.workers_dev).toBe(false); expect(config.preview_urls).toBe(false);
 expect(config.vars.ZIGI_KILL_SWITCH).toBe('on');
 expect(config.vars.AUTH_ORIGIN).toBe('https://unconfigured.supabase.co');
 for(const secret of ['AUTH_PUBLIC_KEY','ZIGI_UPSTREAM_KEY','ZIGI_ALLOWLIST'])expect(Object.keys(config.vars)).not.toContain(secret);
 expect(config.routes).toBeUndefined(); expect(config.route).toBeUndefined();
 // The budget object's tables hold counts and account ids only.
 const budget=readFileSync(new URL('../../workers/zigi-relay/budget.mjs',import.meta.url),'utf8');
 const columns=(budget.match(/CREATE TABLE IF NOT EXISTS \w+ \(.*?\)'/g)??[]).flatMap(table=>table.slice(table.indexOf('(')+1).replace(/,\s*PRIMARY KEY \([^)]*\)/,'').replace(/\)'$/,'').split(',').map(c=>c.trim().split(/\s+/)[0]).filter(name=>name&&name!=='PRIMARY'));
 expect(new Set(columns)).toEqual(new Set(['day','account','requests','tokens','id','at','state']));
});

/** A stream from pieces: strings are sent as they are, a function errors the stream at that point. */
const source=(/** @type {(string|Uint8Array|Error)[]} */pieces)=>{let i=0;return new ReadableStream({async pull(c){const next=pieces[i++];if(next===undefined){c.close();return;}if(next instanceof Error){c.error(next);return;}c.enqueue(typeof next==='string'?new TextEncoder().encode(next):next);}});};
const run=async(/** @type {(string|Uint8Array|Error)[]} */pieces)=>{
 /** @type {{used:number|null,outcome:string}[]} */const settled=[];
 const text=await new Response(metered(source(pieces),new AbortController(),(used,outcome)=>settled.push({used,outcome}))).text();
 return {text,settled};
};
const event=(/** @type {unknown} */data)=>`data: ${JSON.stringify(data)}\n\n`;

test('the metered stream: whole events only, in any pieces; the usage settles it; a break or an oversize reply ends with an error event at an event boundary',async()=>{
 const reply=event({choices:[{delta:{content:'Ten minutes'}}]})+event({choices:[],usage:{prompt_tokens:300,completion_tokens:12}})+'data: [DONE]\n\n';
 // Split anywhere, even inside an event and inside a multi-byte character, it arrives whole.
 const accented=reply.replace('Ten','Tén'),bytes=new TextEncoder().encode(accented),at=bytes.indexOf(0xc3)+1;
 const pieces=[bytes.slice(0,at),bytes.slice(at,at+30),bytes.slice(at+30)];
 const split=await run(pieces);
 expect(split.text).toBe(accented);expect(split.settled).toEqual([{used:312,outcome:'ok'}]);
 expect(pieces.some(p=>{try{new TextDecoder('utf-8',{fatal:true}).decode(p);return false;}catch{return true;}})).toBe(true);
 expect((await run([reply])).settled).toEqual([{used:312,outcome:'ok'}]);
 expect(lastBoundary('data: a\r\n\r\ndata: b\n\ndata: c')).toBe('data: a\r\n\r\ndata: b\n\n'.length);
 // A reply that breaks off: what arrived whole is kept, then an error event; the provider failed.
 const broken=await run([event({choices:[{delta:{content:'Half a'}}]}),event({choices:[{delta:{content:'sent'}}]}).slice(0,20),new Error('connection reset')]);
 expect(broken.text).toBe(event({choices:[{delta:{content:'Half a'}}]})+'data: {"error":{"code":502,"message":"The provider\'s reply broke off."}}\n\n');
 expect(broken.settled).toEqual([{used:null,outcome:'failure'}]);
 // Longer than the cap: cut at an event boundary with an error event; no usage arrived, so the reservation stands.
 const big=event({choices:[{delta:{content:'y'.repeat(200_000)}}]});
 const long=await run(Array.from({length:12},()=>big));
 const lines=long.text.trimEnd().split('\n\n');
 expect(lines.at(-1)).toBe('data: {"error":{"code":413,"message":"The reply was longer than ZIGoals hosted allows."}}');
 expect(lines.slice(0,-1).every(line=>line===big.trimEnd())).toBe(true);
 expect(long.text.length).toBeLessThanOrEqual(LIMITS.responseBytes+200);
 expect(long.settled).toEqual([{used:null,outcome:'neutral'}]);
 // One event longer than an event may be ends the reply too.
 expect((await run([`data: ${'z'.repeat(LIMITS.eventBytes+10)}`])).text).toContain('"code":413');
 // The person stopping the reply: settled once, neutrally, with no usage reported.
 /** @type {{used:number|null,outcome:string}[]} */const stopped=[];
 const reader=metered(source([event({choices:[{delta:{content:'a'}}]}),event({choices:[{delta:{content:'b'}}]})]),new AbortController(),(used,outcome)=>stopped.push({used,outcome})).getReader();
 await reader.read();await reader.cancel();
 expect(stopped).toEqual([{used:null,outcome:'neutral'}]);
});
