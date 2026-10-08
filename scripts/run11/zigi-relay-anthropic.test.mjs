// ZIGoals hosted, the relay's Anthropic upstream (Session X Part 9): the translation alone (anthropic.mjs), then the real
// Worker in Miniflare with a MOCK Anthropic provider (zigi-relay-fixture.mjs): the request the provider gets (headers,
// system, turns, photos, tools, the output cap, thinking off), the stream the app gets (its Chat Completions chunks,
// tool calls, finish reasons, usage and [DONE]), the budgets settled from Anthropic's usage exactly (input with cache,
// the last cumulative output), a broken or failed reply, and no message, reply or key in any log line.
// Fictional accounts and a fake key only; nothing leaves the machine.
import {expect,test} from 'vitest';
import {ANTHROPIC_MESSAGES,anthropicBody,anthropicStream} from '../../workers/zigi-relay/anthropic.mjs';
import {ANTHROPIC,APP_ORIGIN,INVITED,PROBE_LINE,RELAY_KEY,anthropicSse,anthropicSseByRead,messageEnd,messageStart,relayRuntime,textBlock,toolBlock} from './zigi-relay-fixture.mjs';

const env=/** @type {any} */({ZIGI_MODEL:'claude-haiku-5-5'});
const PHOTO='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAwS2OUAAAAABJRU5ErkJggg==';
const chat=[
 {role:'system',content:'You are ZIGi.'},
 {role:'assistant',content:'Hello! Ask me about your goals.'},
 {role:'user',content:[{type:'text',text:'What is in this photo, and how far is my trip goal?'},{type:'image_url',image_url:{url:`data:image/png;base64,${PHOTO}`}}]},
 {role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'goals_progress',arguments:'{"goal":"Trip"}'}},{id:'call_2',type:'function',function:{name:'wealth_summary',arguments:''}}]},
 {role:'tool',tool_call_id:'call_1',content:'Trip: 40 %'},
 {role:'tool',tool_call_id:'call_2',content:[{type:'text',text:'Net worth: not known'}]},
 {role:'user',content:'And next month?'},
];
const tools=[{type:'function',function:{name:'goals_progress',description:'A goal\'s progress',parameters:{type:'object',properties:{goal:{type:'string'}},required:['goal']}}},{type:'function',function:{name:'wealth_summary'}}];

test('the Messages API request: one system text, the greeting before the first question left out, photos as base64, tool calls and results paired, tools as input schemas, thinking off',()=>{
 expect(ANTHROPIC_MESSAGES).toBe(ANTHROPIC);
 expect(anthropicBody(chat,tools,env,1000)).toEqual({
  model:'claude-haiku-5-5',max_tokens:1000,stream:true,system:'You are ZIGi.',thinking:{type:'disabled'},
  messages:[
   {role:'user',content:[{type:'text',text:'What is in this photo, and how far is my trip goal?'},{type:'image',source:{type:'base64',media_type:'image/png',data:PHOTO}}]},
   {role:'assistant',content:[{type:'tool_use',id:'call_1',name:'goals_progress',input:{goal:'Trip'}},{type:'tool_use',id:'call_2',name:'wealth_summary',input:{}}]},
   {role:'user',content:[{type:'tool_result',tool_use_id:'call_1',content:'Trip: 40 %'},{type:'tool_result',tool_use_id:'call_2',content:'Net worth: not known'},{type:'text',text:'And next month?'}]},
  ],
  tools:[{name:'goals_progress',description:'A goal\'s progress',input_schema:{type:'object',properties:{goal:{type:'string'}},required:['goal']}},{name:'wealth_summary',input_schema:{type:'object',properties:{}}}],
 });
 // The owner's choice for models that reject "disabled" (ZIGI_THINKING=model-default): no thinking parameter at all.
 expect(anthropicBody(chat,tools,{...env,ZIGI_THINKING:'model-default'},1000)).not.toHaveProperty('thinking');
});

test('a chat that cannot be expressed exactly is refused, never guessed: a photo by address, unreadable tool arguments, an odd tool id, no question',()=>{
 const refused=[
  [{role:'user',content:[{type:'image_url',image_url:{url:'https://elsewhere.test/a.png'}}]}],
  [{role:'user',content:[{type:'image_url',image_url:{url:'data:image/svg+xml;base64,PHN2Zz4='}}]}],
  [{role:'user',content:'hi'},{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'x',arguments:'{not json'}}]}],
  [{role:'user',content:'hi'},{role:'assistant',content:null,tool_calls:[{id:'call 1',type:'function',function:{name:'x',arguments:'{}'}}]}],
  [{role:'user',content:'hi'},{role:'assistant',content:null,tool_calls:[{id:'call_1',type:'function',function:{name:'x',arguments:'[1]'}}]}],
  [{role:'system',content:'Only a system text.'}],
  [{role:'user',content:[{type:'input_audio',input_audio:{}}]}],
 ];
 for(const messages of refused)expect(anthropicBody(/** @type {any} */(messages),undefined,env,1000),JSON.stringify(messages)).toBeNull();
});

test('the stream becomes the app\'s chunks: text, tool calls by index, the finish reason, usage with cache, [DONE]; ping, thinking and unknown events are skipped',()=>{
 const t=anthropicStream('claude-haiku-5-5');
 const events=[messageStart(300,{cacheWrite:20,cacheRead:80}),{type:'ping'},{type:'content_block_start',index:0,content_block:{type:'thinking',thinking:''}},{type:'content_block_delta',index:0,delta:{type:'thinking_delta',thinking:'HIDDEN_THOUGHT'}},{type:'content_block_stop',index:0},...textBlock(1,'Let me look.'),...toolBlock(2,'toolu_1','goals_progress',['','{"goal":','"Trip"}']),{type:'something_new',index:9},...messageEnd('tool_use',42)];
 const out=events.map(e=>t.event(`event: ${e.type}\ndata: ${JSON.stringify(e)}`)).join('');
 expect(out).not.toContain('HIDDEN_THOUGHT');
 const lines=out.trim().split('\n\n').map(l=>l.slice('data: '.length));
 expect(lines.at(-1)).toBe('[DONE]');
 const chunks=lines.slice(0,-1).map(l=>JSON.parse(l));
 expect(chunks.every(c=>c.object==='chat.completion.chunk'&&c.model==='claude-haiku-5-5'&&c.id==='msg_mock')).toBe(true);
 expect(chunks.map(c=>c.choices[0]?.delta??null)).toEqual([
  {role:'assistant',content:''},
  {content:'Let me look.'},
  {tool_calls:[{index:0,id:'toolu_1',type:'function',function:{name:'goals_progress',arguments:''}}]},
  {tool_calls:[{index:0,function:{arguments:'{"goal":'}}]},
  {tool_calls:[{index:0,function:{arguments:'"Trip"}'}}]},
  {},
  null,
 ]);
 expect(chunks.at(-2).choices[0].finish_reason).toBe('tool_calls');
 expect(chunks.at(-1).usage).toEqual({prompt_tokens:400,completion_tokens:42,total_tokens:442});
 expect(t.used()).toBe(442);expect(t.failed()).toBeNull();
 for(const [stop,finish] of [['end_turn','stop'],['max_tokens','length'],['stop_sequence','stop'],['refusal','content_filter']]){
  const s=anthropicStream('m');s.event(`data: ${JSON.stringify(messageStart(1))}`);
  const tail=messageEnd(stop,2).map(e=>s.event(`data: ${JSON.stringify(e)}`)).join('');
  expect(JSON.parse(tail.split('\n\n')[0].slice(6)).choices[0].finish_reason,stop).toBe(finish);
 }
});

test('usage is known only from a message_delta (its counts are cumulative: the last wins); a broken reply reports none; an error event is the relay\'s words',()=>{
 const t=anthropicStream('m');
 t.event(`data: ${JSON.stringify(messageStart(500))}`);
 expect(t.used()).toBeNull();// message_start's own output count (1) never settles a reply
 t.event(`data: ${JSON.stringify({type:'message_delta',delta:{stop_reason:null},usage:{output_tokens:10}})}`);
 t.event(`data: ${JSON.stringify({type:'message_delta',delta:{stop_reason:'end_turn'},usage:{input_tokens:520,output_tokens:30}})}`);
 expect(t.used()).toBe(550);
 const e=anthropicStream('m');
 const said=e.event(`event: error\ndata: ${JSON.stringify({type:'error',error:{type:'overloaded_error',message:'SENTINEL_PROVIDER_TEXT'}})}`);
 expect(said).not.toContain('SENTINEL_PROVIDER_TEXT');
 expect(JSON.parse(said.slice(6))).toEqual({error:{code:503,message:'The provider is busy right now. Try again in a moment.'}});
 expect(e.failed()).toBe('busy');expect(e.used()).toBeNull();
 const f=anthropicStream('m');
 expect(JSON.parse(f.event(`data: ${JSON.stringify({type:'error',error:{type:'api_error',message:'x'}})}`).slice(6)).error.code).toBe(502);
 expect(f.failed()).toBe('failed');
});

const ANTHROPIC_VARS={ZIGI_UPSTREAM_URL:ANTHROPIC,ZIGI_PROVIDER_NAME:'Anthropic',ZIGI_MODEL:'claude-haiku-5-5'};
const ask=(text='How many minutes did I meditate this month?')=>({messages:[{role:'system',content:'You are ZIGi.'},{role:'user',content:text}],max_completion_tokens:9000});

test('Miniflare: the real Worker sends Anthropic its headers and request, and the app gets its usual stream',async()=>{
 const r=await relayRuntime({bindings:ANTHROPIC_VARS});try{
  r.upstream.reply=()=>anthropicSse(messageStart(310),...textBlock(0,'Ten minutes a day.'),...messageEnd('end_turn',12));
  expect(await (await r.call('/v1/entitlement')).json()).toEqual({entitled:true,provider:'Anthropic',model:'claude-haiku-5-5',remaining:{requests:5,tokens:20000}});
  const res=await r.call('/v1/chat',{body:{...ask(),tools}});
  expect(res.status).toBe(200);expect(res.headers.get('content-type')).toBe('text/event-stream; charset=utf-8');
  const text=await res.text();
  expect(text).toContain('"content":"Ten minutes a day."');expect(text).toContain('"finish_reason":"stop"');
  expect(text).toContain('"usage":{"prompt_tokens":310,"completion_tokens":12,"total_tokens":322}');expect(text.trimEnd().endsWith('data: [DONE]')).toBe(true);
  const [sent]=r.upstream.requests;
  expect(sent.headers['x-api-key']).toBe(RELAY_KEY);expect(sent.headers['anthropic-version']).toBe('2023-06-01');
  expect(sent.headers.authorization).toBeUndefined();
  // The relay's output cap wins over the app's 9000 (LIMITS.maxOutputTokens); thinking off; the tools as schemas.
  expect(sent.body).toMatchObject({model:'claude-haiku-5-5',max_tokens:4096,stream:true,system:'You are ZIGi.',thinking:{type:'disabled'},messages:[{role:'user',content:[{type:'text',text:'How many minutes did I meditate this month?'}]}]});
  expect(sent.body.tools.map((/** @type {any} */t)=>t.name)).toEqual(['goals_progress','wealth_summary']);
  expect(sent.body).not.toHaveProperty('stream_options');expect(sent.body).not.toHaveProperty('max_completion_tokens');
 }finally{await r.dispose();}
},60_000);

test('Miniflare: the budgets settle from Anthropic\'s usage exactly: input with both cache counts, plus the last cumulative output',async()=>{
 const r=await relayRuntime({bindings:ANTHROPIC_VARS});try{
  r.upstream.reply=()=>anthropicSse(messageStart(1000,{cacheWrite:200,cacheRead:300}),...textBlock(0,'ok'),{type:'message_delta',delta:{stop_reason:null},usage:{output_tokens:40}},...messageEnd('end_turn',120));
  await (await r.call('/v1/chat',{body:ask()})).text();
  const left=async()=>(await (await r.call('/v1/entitlement')).json()).remaining;
  await expect.poll(left).toEqual({requests:4,tokens:20000-(1000+200+300+120)});
 }finally{await r.dispose();}
},60_000);

test('Miniflare: one event per read, with a lone ping and the usage delta apart from message_stop: the reply arrives whole and settles',async()=>{
 // Session X P2.7 (security review, finding 1): events the app does not need (ping, a block's start and stop, the usage
 // delta) hand nothing on, so a read holding only those must not end the pull, or the reply stalls for good.
 const r=await relayRuntime({bindings:ANTHROPIC_VARS});try{
  r.upstream.reply=()=>anthropicSseByRead(messageStart(500),{type:'ping'},...textBlock(0,'Two short walks.'),{type:'ping'},...messageEnd('end_turn',30));
  const res=await r.call('/v1/chat',{body:ask()});
  const text=await Promise.race([res.text(),new Promise((_,reject)=>setTimeout(()=>reject(Error('the reply stalled')),10_000))]);
  expect(text).toContain('"content":"Two short walks."');expect(text).toContain('"usage":{"prompt_tokens":500,"completion_tokens":30,"total_tokens":530}');
  expect(/** @type {string} */(text).trimEnd().endsWith('data: [DONE]')).toBe(true);
  await expect.poll(async()=>(await (await r.call('/v1/entitlement')).json()).remaining).toEqual({requests:4,tokens:20000-530});
 }finally{await r.dispose();}
},60_000);

test('Miniflare: an Anthropic prompt estimated above 90,000 tokens is refused before the provider and reserves nothing (Session X P2.7)',async()=>{
 // Anthropic prices prompts above 100,000 input tokens higher; Japanese text counts a token a character at least.
 const r=await relayRuntime({bindings:ANTHROPIC_VARS});try{
  const res=await r.call('/v1/chat',{body:ask('こ'.repeat(95_000))});
  expect(res.status).toBe(413);expect(await res.json()).toEqual({error:'REQUEST_TOO_LARGE'});
  expect(r.upstream.requests).toHaveLength(0);
  expect((await (await r.call('/v1/entitlement')).json()).remaining).toEqual({requests:5,tokens:20000});
 }finally{await r.dispose();}
},60_000);

test('Miniflare: an error event fails the reply in the relay\'s words and counts for the breaker; a reply that breaks off keeps its reservation',async()=>{
 const r=await relayRuntime({bindings:ANTHROPIC_VARS});try{
  r.upstream.reply=()=>anthropicSse(messageStart(100),{type:'error',error:{type:'overloaded_error',message:'SENTINEL_PROVIDER_ERROR'}});
  const text=await (await r.call('/v1/chat',{body:ask()})).text();
  expect(text).toContain('"code":503');expect(text).not.toContain('SENTINEL_PROVIDER_ERROR');
  await expect.poll(async()=>(await r.clock(Date.now())).breaker.failures.length).toBe(1);
  // No message_delta: nothing reported, so the whole reservation (input estimate plus the 4096 cap) stays spent.
  r.upstream.reply=()=>anthropicSse(messageStart(100),...textBlock(0,'half a repl'));
  await (await r.call('/v1/chat',{body:ask('x')})).text();
  const left=(await (await r.call('/v1/entitlement')).json()).remaining;
  expect(left.requests).toBe(3);expect(left.tokens).toBeLessThanOrEqual(20000-2*4096);
 }finally{await r.dispose();}
},60_000);

test('Miniflare: ZIGI_THINKING must be off, model-default or absent (anything else fails closed); a refused chat never reaches Anthropic; no log line holds a message, reply or key',async()=>{
 const bad=await relayRuntime({bindings:{...ANTHROPIC_VARS,ZIGI_THINKING:'on'}});try{
  expect((await bad.call('/v1/chat',{body:ask()})).status).toBe(503);expect(bad.upstream.requests).toHaveLength(0);
 }finally{await bad.dispose();}
 const r=await relayRuntime({bindings:{...ANTHROPIC_VARS,ZIGI_THINKING:'model-default'}});try{
  const res=await r.call('/v1/chat',{body:{messages:[{role:'user',content:[{type:'image_url',image_url:{url:'https://elsewhere.test/a.png'}}]}]}});
  expect(res.status).toBe(400);expect(await res.json()).toEqual({error:'INVALID_CHAT_REQUEST'});expect(r.upstream.requests).toHaveLength(0);
  const QUESTION='SENTINEL_QUESTION_ABOUT_SLEEP',REPLY='SENTINEL_REPLY_TEXT';
  r.upstream.reply=()=>anthropicSse(messageStart(10),...textBlock(0,REPLY),...messageEnd('end_turn',3));
  expect(await (await r.call('/v1/chat',{body:ask(QUESTION)})).text()).toContain(REPLY);
  expect(r.upstream.requests.at(-1)?.body).not.toHaveProperty('thinking');
  await r.probe();
  await expect.poll(()=>r.logs.some(line=>line.includes(PROBE_LINE))).toBe(true);
  for(const line of r.logs)for(const secret of [QUESTION,REPLY,INVITED,RELAY_KEY,APP_ORIGIN,ANTHROPIC])expect(line).not.toContain(secret);
 }finally{await r.dispose();}
},60_000);
