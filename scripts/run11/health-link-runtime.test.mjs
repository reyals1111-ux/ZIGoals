// The health-link Worker (Session W Part 8) against the real Worker in Miniflare (health-link-fixture.mjs): who may use
// it (a verified session, the app's origin, the kill switch), each provider's token exchange with the secret held only
// here and the redirect address from APP_ORIGIN, named data requests only, the budgets and the breaker, revoking, and no
// code or token in any log line. MOCK providers; the budget object's fixture clock drives the days.
import {createHmac} from 'node:crypto';
import {expect,test} from 'vitest';
import {ACCOUNT,APP_ORIGIN,OTHER,PROBE_LINE,SECRETS,linkRuntime} from './health-link-fixture.mjs';

const NOON=Date.UTC(2026,9,7,12,0);
const form=(/** @type {string} */body)=>Object.fromEntries(new URLSearchParams(body));

test('only /health answers until the account provider and budgets are set; routes and methods are fixed',async()=>{
 const r=await linkRuntime({omit:['AUTH_PUBLIC_KEY']});try{
  expect(await (await r.call('/health',{token:null})).json()).toEqual({ok:true});
  for(const path of ['/v1/config','/v1/token']){const res=await r.call(path,path==='/v1/token'?{body:{provider:'oura',code:'CODE'}}:{});expect(res.status,path).toBe(503);expect(await res.json()).toEqual({error:'HEALTH_LINK_CONFIGURATION_REQUIRED'});}
  expect((await r.call('/v1/token')).status).toBe(405);
  expect((await r.call('/v1/anything')).status).toBe(404);
  expect(r.providers.requests).toHaveLength(0);
 }finally{await r.dispose();}
},60_000);
test('a verified session, the app\'s origin and the account it names; the kill switch pauses everything but "off"',async()=>{
 const r=await linkRuntime();try{
  const refused=async(/** @type {any} */options,/** @type {number} */status,/** @type {string} */error)=>{const res=await r.call('/v1/token',{body:{provider:'oura',code:'CODE-1'},...options});expect(res.status,JSON.stringify(options)).toBe(status);expect(await res.json()).toEqual({error});};
  await refused({token:null},401,'SIGN_IN_REQUIRED');
  await refused({headers:{'x-zigoals-account':OTHER}},409,'ACCOUNT_CHANGED');
  await refused({headers:{origin:'https://elsewhere.test'}},403,'ORIGIN_DENIED');
  await refused({headers:{'content-type':'text/plain'}},415,'JSON_REQUIRED');
  expect(r.providers.requests).toHaveLength(0);
 }finally{await r.dispose();}
 for(const options of [{bindings:{HEALTH_LINK_KILL_SWITCH:'on'}},{omit:['HEALTH_LINK_KILL_SWITCH']},{bindings:{HEALTH_LINK_KILL_SWITCH:'Off'}}]){
  const p=await linkRuntime(options);try{const res=await p.call('/v1/config');expect(res.status,JSON.stringify(options)).toBe(503);expect(await res.json()).toEqual({error:'HEALTH_LINK_PAUSED'});}finally{await p.dispose();}
 }
},90_000);
test('config: only the providers with both a client id and a secret, and the redirect address from APP_ORIGIN',async()=>{
 const r=await linkRuntime({omit:['POLAR_CLIENT_SECRET','STRAVA_CLIENT_ID']});try{
  expect(await (await r.call('/v1/config')).json()).toEqual({redirectUri:`${APP_ORIGIN}/app/health`,providers:[{id:'oura',clientId:'fixture-oura'},{id:'withings',clientId:'fixture-withings'}]});
  const off=await r.call('/v1/token',{body:{provider:'polar',code:'CODE-1'}});expect(off.status).toBe(404);expect(await off.json()).toEqual({error:'PROVIDER_NOT_CONFIGURED'});
 }finally{await r.dispose();}
},60_000);
test('the token exchange, provider by provider: the secret goes only to the provider, the redirect address is the Worker\'s own, Oura\'s verifier passes through',async()=>{
 const r=await linkRuntime();try{
  const oura=await r.call('/v1/token',{body:{provider:'oura',code:'CODE-OURA',verifier:'v'.repeat(64),redirect_uri:'https://evil.test/steal'}});
  expect(await oura.json()).toMatchObject({accessToken:'FAKE-ACCESS-AAAA',refreshToken:'FAKE-REFRESH-BBBB'});
  expect(form(r.providers.requests[0].body)).toEqual({grant_type:'authorization_code',code:'CODE-OURA',redirect_uri:`${APP_ORIGIN}/app/health`,client_id:'fixture-oura',client_secret:SECRETS.OURA_CLIENT_SECRET,code_verifier:'v'.repeat(64)});
  r.providers.reply=()=>Response.json({status:0,body:{access_token:'FAKE-WITHINGS-ACC',refresh_token:'FAKE-WITHINGS-REF',expires_in:10800,userid:'363',scope:'user.activity,user.metrics'}});
  expect(await (await r.call('/v1/token',{body:{provider:'withings',code:'CODE-W'}})).json()).toMatchObject({accessToken:'FAKE-WITHINGS-ACC',userId:'363',scope:'user.activity,user.metrics'});
  expect(form(r.providers.requests[1].body)).toMatchObject({action:'requesttoken',client_id:'fixture-withings',client_secret:SECRETS.WITHINGS_CLIENT_SECRET,grant_type:'authorization_code',code:'CODE-W'});
  r.providers.reply=()=>Response.json({access_token:'FAKE-POLAR-ACCESS',token_type:'bearer',expires_in:31535999,x_user_id:10101010});
  expect(await (await r.call('/v1/token',{body:{provider:'polar',code:'CODE-P'}})).json()).toMatchObject({accessToken:'FAKE-POLAR-ACCESS',userId:'10101010'});
  expect(r.providers.requests[2].headers.authorization).toBe(`Basic ${Buffer.from(`fixture-polar:${SECRETS.POLAR_CLIENT_SECRET}`).toString('base64')}`);
  expect(r.providers.requests[2].body).not.toContain(SECRETS.POLAR_CLIENT_SECRET);
  r.providers.reply=()=>Response.json({access_token:'FAKE-STRAVA-ACCESS',refresh_token:'FAKE-STRAVA-REFRESH',expires_at:1791000000});
  expect(await (await r.call('/v1/refresh',{body:{provider:'strava',refreshToken:'FAKE-STRAVA-OLD-REF'}})).json()).toEqual({accessToken:'FAKE-STRAVA-ACCESS',refreshToken:'FAKE-STRAVA-REFRESH',expiresAt:new Date(1791000000*1000).toISOString()});
  expect(form(r.providers.requests[3].body)).toMatchObject({grant_type:'refresh_token',refresh_token:'FAKE-STRAVA-OLD-REF',client_id:'12345'});
  r.providers.reply=()=>Response.json({error:'invalid_grant'},{status:400});
  const expired=await r.call('/v1/refresh',{body:{provider:'oura',refreshToken:'FAKE-USED-REFRESH'}});
  expect(expired.status).toBe(409);expect(await expired.json()).toEqual({error:'RECONNECT_REQUIRED'});
  // Withings answers 200 with its own status: "too many requests" (601) is a pause that keeps the link; an
  // authentication failure (100) or invalid parameters (201–213) mean connect again.
  for(const [status,code,error] of /** @type {const} */([[601,429,'PROVIDER_BUSY'],[100,409,'RECONNECT_REQUIRED'],[203,409,'RECONNECT_REQUIRED'],[2555,502,'PROVIDER_REFUSED']])){
   r.providers.reply=()=>Response.json({status,body:{}});
   const res=await r.call('/v1/refresh',{body:{provider:'withings',refreshToken:'FAKE-WITHINGS-REF'}});
   expect(res.status,String(status)).toBe(code);expect((await res.json()).error).toBe(error);
  }
 }finally{await r.dispose();}
},60_000);
test('data: only named requests with checked parameters; the provider\'s JSON comes back; its errors in the app\'s words',async()=>{
 const r=await linkRuntime();try{
  const token='FAKE-ACCESS-TOKEN-1';
  r.providers.reply=({url})=>Response.json({data:[{day:'2026-10-06',steps:8000}],next_token:null,asked:url.search});
  const ok=await r.call('/v1/data',{body:{provider:'oura',accessToken:token,request:'oura.daily_activity',params:{start_date:'2026-09-07',end_date:'2026-10-07'}}});
  expect(await ok.json()).toEqual({data:{data:[{day:'2026-10-06',steps:8000}],next_token:null,asked:'?start_date=2026-09-07&end_date=2026-10-07'}});
  expect(r.providers.requests[0]).toMatchObject({method:'GET',url:'https://api.ouraring.com/v2/usercollection/daily_activity?start_date=2026-09-07&end_date=2026-10-07'});
  expect(r.providers.requests[0].headers.authorization).toBe(`Bearer ${token}`);
  for(const body of [{provider:'oura',accessToken:token,request:'oura.personal_info'},{provider:'oura',accessToken:token,request:'strava.activities'},{provider:'oura',accessToken:token,request:'oura.sleep',params:{start_date:'yesterday'}},{provider:'oura',accessToken:token,request:'oura.sleep',params:{path:'/v2/admin'}}]){
   const res=await r.call('/v1/data',{body});expect(res.status,JSON.stringify(body)).toBe(400);
  }
  expect(r.providers.requests).toHaveLength(1);
  r.providers.reply=()=>Response.json({status:401,error:'invalid token'});
  const w=await r.call('/v1/data',{body:{provider:'withings',accessToken:token,request:'withings.activity',params:{startdateymd:'2026-09-07',enddateymd:'2026-10-07'}}});
  expect(w.status).toBe(401);expect(await w.json()).toEqual({error:'TOKEN_EXPIRED'});
  expect(form(r.providers.requests[1].body)).toEqual({action:'getactivity',data_fields:'steps,calories,totalcalories',startdateymd:'2026-09-07',enddateymd:'2026-10-07'});
  for(const [status,code,error] of /** @type {const} */([[100,401,'TOKEN_EXPIRED'],[601,429,'PROVIDER_BUSY']])){
   r.providers.reply=()=>Response.json({status,body:{}});
   const res=await r.call('/v1/data',{body:{provider:'withings',accessToken:token,request:'withings.sleep',params:{startdateymd:'2026-09-07',enddateymd:'2026-09-13'}}});
   expect(res.status,String(status)).toBe(code);expect((await res.json()).error).toBe(error);
  }
  expect(form(r.providers.requests.at(-1)?.body??'')).toEqual({action:'getsummary',data_fields:'total_sleep_time,asleepduration,deepsleepduration,lightsleepduration,remsleepduration,wakeupduration,sleep_latency',startdateymd:'2026-09-07',enddateymd:'2026-09-13'});
  const paged=await r.call('/v1/data',{body:{provider:'withings',accessToken:token,request:'withings.sleep',params:{startdateymd:'2026-09-07',enddateymd:'2026-09-13',offset:'20'}}});
  expect(paged.status).toBe(400);
  r.providers.reply=()=>new Response('{"message":"Rate Limit Exceeded","quote":"FAKE-ACCESS-TOKEN-1"}',{status:429});
  const busy=await r.call('/v1/data',{body:{provider:'strava',accessToken:token,request:'strava.activities',params:{after:'1788000000',page:'1'}}});
  expect(busy.status).toBe(429);expect(await busy.text()).not.toContain('FAKE-ACCESS-TOKEN-1');
 }finally{await r.dispose();}
},60_000);
test('budgets: per account and provider, then for the provider overall, by UTC day; the breaker opens after repeated failures',async()=>{
 const r=await linkRuntime();try{
  await r.clock(NOON);
  r.providers.reply=()=>Response.json({data:[]});
  const ask=(/** @type {string} */account=ACCOUNT)=>r.call('/v1/data',{account,body:{provider:'oura',accessToken:'FAKE-ACCESS-TOKEN-1',request:'oura.sleep'}});
  for(let i=0;i<6;i++)expect((await ask()).status).toBe(200);
  const over=await ask();expect(over.status).toBe(429);expect(await over.json()).toEqual({error:'ACCOUNT_DAILY_REQUESTS'});
  for(let i=0;i<4;i++)expect((await ask(OTHER)).status).toBe(200);
  const global=await ask(OTHER);expect(global.status).toBe(429);expect(await global.json()).toEqual({error:'GLOBAL_DAILY_REQUESTS'});
  await r.clock(NOON+86_400_000);
  r.providers.reply=()=>new Response('down',{status:503});
  for(let i=0;i<5;i++)expect((await ask()).status).toBe(502);
  const paused=await ask();expect(paused.status).toBe(503);expect((await paused.json()).error).toBe('PROVIDER_PAUSED');
  const strava=await r.call('/v1/data',{body:{provider:'strava',accessToken:'FAKE-ACCESS-TOKEN-1',request:'strava.activities'}});
  expect(strava.status).toBe(502);
 }finally{await r.dispose();}
},60_000);
test('revoking each provider\'s documented way (Oura, Polar\'s user deletion, Strava\'s /oauth/revoke, Withings\' signed nonce); Polar registration; no code or token in any log',async()=>{
 const r=await linkRuntime();try{
  r.providers.reply=()=>new Response(null,{status:200});
  expect(await (await r.call('/v1/revoke',{body:{provider:'oura',accessToken:'FAKE-ACCESS-TOKEN-1'}})).json()).toEqual({ok:true});
  expect(r.providers.requests[0]).toMatchObject({method:'GET',url:'https://api.ouraring.com/oauth/revoke?access_token=FAKE-ACCESS-TOKEN-1'});
  expect(await (await r.call('/v1/revoke',{body:{provider:'polar',accessToken:'FAKE-ACCESS-TOKEN-1',userId:'10101010'}})).json()).toEqual({ok:true});
  expect(r.providers.requests[1]).toMatchObject({method:'DELETE',url:'https://www.polaraccesslink.com/v3/users/10101010'});
  expect(await (await r.call('/v1/revoke',{body:{provider:'strava',accessToken:'FAKE-ACCESS-TOKEN-1'}})).json()).toEqual({ok:true});
  expect(r.providers.requests[2]).toMatchObject({method:'POST',url:'https://www.strava.com/oauth/revoke'});
  expect(r.providers.requests[2].headers.authorization).toBe(`Basic ${Buffer.from(`12345:${SECRETS.STRAVA_CLIENT_SECRET}`).toString('base64')}`);
  expect(form(r.providers.requests[2].body)).toEqual({token:'FAKE-ACCESS-TOKEN-1',token_type_hint:'access_token'});
  // Withings: without the user id there is nothing to sign; with it, a fresh nonce, then the signed revoke.
  expect(await (await r.call('/v1/revoke',{body:{provider:'withings',accessToken:'FAKE-ACCESS-TOKEN-1'}})).json()).toEqual({ok:false,reason:'NOT_OFFERED'});
  expect(r.providers.requests).toHaveLength(3);
  r.providers.reply=({body})=>Response.json(form(body).action==='getnonce'?{status:0,body:{nonce:'NONCE-FIXTURE-1'}}:{status:0,body:{}});
  expect(await (await r.call('/v1/revoke',{body:{provider:'withings',accessToken:'FAKE-ACCESS-TOKEN-1',userId:'363'}})).json()).toEqual({ok:true});
  const sign=(/** @type {string} */text)=>createHmac('sha256',SECRETS.WITHINGS_CLIENT_SECRET).update(text).digest('hex');
  const nonce=form(r.providers.requests[3].body),revoke=form(r.providers.requests[4].body);
  expect(r.providers.requests[3].url).toBe('https://wbsapi.withings.net/v2/signature');
  expect(nonce).toEqual({action:'getnonce',client_id:'fixture-withings',timestamp:expect.stringMatching(/^\d{10}$/),signature:sign(`getnonce,fixture-withings,${nonce.timestamp}`)});
  expect(r.providers.requests[4].url).toBe('https://wbsapi.withings.net/v2/oauth2');
  expect(revoke).toEqual({action:'revoke',client_id:'fixture-withings',nonce:'NONCE-FIXTURE-1',signature:sign('revoke,fixture-withings,NONCE-FIXTURE-1'),userid:'363'});
  for(const request of r.providers.requests.slice(3))expect(request.body).not.toContain(SECRETS.WITHINGS_CLIENT_SECRET);
  r.providers.reply=()=>new Response(null,{status:409});
  expect(await (await r.call('/v1/register',{body:{provider:'polar',accessToken:'FAKE-ACCESS-TOKEN-1',memberId:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'}})).json()).toEqual({ok:true});
  expect(JSON.parse(r.providers.requests[5].body)).toEqual({'member-id':'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'});
  await r.call('/v1/token',{body:{provider:'oura',code:'CODE-SECRET-LOG'}});
  await r.probe();
  expect(r.logs).toContain(PROBE_LINE);
  for(const line of r.logs)for(const secret of ['FAKE-ACCESS','CODE-SECRET-LOG',...Object.values(SECRETS)])expect(line).not.toContain(secret);
 }finally{await r.dispose();}
},60_000);
