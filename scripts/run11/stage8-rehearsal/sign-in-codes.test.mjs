// Stage 8 rows A1–A4 at the app route (Session L rehearsal): the real route handler, the real admission Worker and
// the real private-sync Worker in Miniflare, with a stand-in provider that issues one single-use code per send.
// What this cannot show: the real provider's own code rules and real email delivery (Stage 8, with real inboxes).
import {test,expect} from 'vitest';
import {accountHandler,admissionWorker,codeProvider,privateWorkers} from './harness.mjs';

const origin='https://app.test',email='a1@example.invalid';
const post=body=>new Request(origin+'/api/private-account',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
const sessionCookie=response=>response.headers.getSetCookie().find(c=>c.startsWith('__Host-zigoals_session='));

test('wrong, expired and reused codes are refused without a session, and the send cooldown is enforced by the admission Worker',async()=>{
 const workers=await privateWorkers({origin}),admission=await admissionWorker(),provider=codeProvider({ttl:5*60_000}),start=Date.now();
 const handle=accountHandler({mf:workers.mf,provider,admit:admission.admit});
 try{
  await admission.at(start);
  // A4: the first send reaches the provider; a second one inside 60 s is refused before it.
  expect((await handle(post({action:'send',email}))).status).toBe(200);
  const early=await handle(post({action:'send',email}));
  expect(early.status).toBe(429);expect((await early.json()).error).toBe('TRY_LATER');
  expect(provider.sends).toEqual([email]);
  const first=provider.latest(email);
  // A1: a wrong code.
  const wrong=await handle(post({action:'verify',email,code:'000000'}));
  expect(wrong.status).toBe(400);expect((await wrong.json()).error).toBe('AUTH_FAILED');expect(sessionCookie(wrong)).toBeUndefined();
  // A2: the right code once it has expired.
  provider.advance(5*60_000+1);
  const expired=await handle(post({action:'verify',email,code:first}));
  expect(expired.status).toBe(400);expect(sessionCookie(expired)).toBeUndefined();
  // After the cooldown a new code can be requested, and it signs in.
  await admission.at(start+61_000);
  expect((await handle(post({action:'send',email}))).status).toBe(200);
  const second=provider.latest(email);expect(second).not.toBe(first);
  const ok=await handle(post({action:'verify',email,code:second}));
  expect(ok.status).toBe(200);expect(await ok.json()).toEqual({signedIn:true,accountId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'});
  expect(sessionCookie(ok)).toMatch(/^__Host-zigoals_session=[^;]+;/);
  // A3: the same code a second time.
  const reused=await handle(post({action:'verify',email,code:second}));
  expect(reused.status).toBe(400);expect(sessionCookie(reused)).toBeUndefined();
  expect(provider.refusals).toEqual(['invalid','expired','reused']);
  expect(provider.accepted).toEqual([email]);
 }finally{await admission.close();await workers.mf.dispose();}
},60000);
