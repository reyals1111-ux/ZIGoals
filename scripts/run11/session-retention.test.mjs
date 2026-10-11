import {test,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {ACCOUNT,fixtureAlias,fixtureToken} from './private-runtime.mjs';
import {doProbe,doProbeWorker} from './do-probe.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');

// Session U Part 5 (FIX_PLAN C7 for sessions, FINDINGS Q-PRIV-03): 90 days after a revocation, private sync deletes the
// revoked session's record and keeps only a dateless tombstone for its family, by the vault's alarm or on the next session
// request. The real private-sync and lifecycle Workers in Miniflare with SQLite storage; the fixture clock moves by
// restarting on the same storage (ISOLATED_FIXTURE, which activation-check refuses in every owner config); a test-only
// subclass adds a row-listing route. Nothing reaches a network.
const root=new URL('../../',import.meta.url).pathname,DAY=86400000,T0=Date.UTC(2026,9,5,9);
const syncCode=(await build({stdin:{contents:"import worker,{PrivateVault as Base} from './worker.mjs';export default worker;export class PrivateVault extends Base{constructor(state,env){super(state,env);this.rowsState=state;}async fetch(request){if(new URL(request.url).pathname==='/test/rows')return Response.json(Object.fromEntries(await this.rowsState.storage.list()));return super.fetch(request);}}",resolveDir:root+'workers/private-sync',loader:'js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;
const lifecycleCode=(await build({entryPoints:[root+'workers/private-sync/lifecycle.mjs'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;
const upstream=async request=>{if(new URL(request.url).hostname!=='fixture.supabase.co')throw Error('Fixture refused external destination');return Response.json(fixtureAlias(request)==='invalid'?{}:{id:ACCOUNT},{status:fixtureAlias(request)==='invalid'?401:200});};
const hashOf=token=>createHash('sha256').update('Bearer '+token).digest('hex');
const familyOf=token=>JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).session_id;
async function at(persist,time,sweepMs){
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  {name:'run11-private-sync',modules:true,script:syncCode,compatibilityDate:'2026-09-13',durableObjects:{VAULTS:{className:'PrivateVault',useSQLite:true}},serviceBindings:{LIFECYCLE:{name:'run11-lifecycle',entrypoint:'LifecycleService'}},bindings:{AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'public-fixture',APP_ORIGIN:'https://app.test',ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(time),...(sweepMs?{LOCAL_SWEEP_MS:String(sweepMs)}:{})},outboundService:upstream},
  {name:'run11-lifecycle',modules:true,script:lifecycleCode,compatibilityDate:'2026-09-13',durableObjects:{LIFECYCLES:{className:'LifecycleAuthority',useSQLite:true}},bindings:{RECOVERY_MODE:'serve',AUTH_ORIGIN:'https://fixture.supabase.co'},outboundService:upstream},
  doProbeWorker({className:'PrivateVault',scriptName:'run11-private-sync',name:'vault-probe'}),
 ],durableObjectsPersist:persist}),resourcePersistencePath:persist});
 const call=(token,body)=>mf.dispatchFetch('https://sync.test/v1/sessions',{method:body?'POST':'GET',headers:{origin:'https://app.test',authorization:'Bearer '+token,'x-zigoals-account':ACCOUNT,'content-type':'application/json'},...(body?{body:JSON.stringify(body.action==='refresh'?{...body,previous:body.previous}:body)}:{})}).then(async r=>({status:r.status,body:await r.json()}));
 const rows=async()=>{const ns=await doProbe(mf,'vault-probe');return (await ns.get(ns.idFromName(ACCOUNT)).fetch('https://internal/test/rows')).json();};
 return {mf,call,rows};
}
const until=async(check,ms=10000)=>{for(const end=Date.now()+ms;;){if(await check())return;if(Date.now()>end)throw Error('condition not reached');await new Promise(r=>setTimeout(r,100));}};
async function revokedFixture(persist,sweepMs){
 const keep=fixtureToken('keep'),gone=fixtureToken('gone');
 const r=await at(persist,T0,sweepMs);
 expect((await r.call(keep,{action:'register',label:'Kept browser'})).body).toMatchObject({registered:true});
 expect((await r.call(gone,{action:'register',label:'Lost phone'})).body).toMatchObject({registered:true});
 const listed=(await r.call(keep)).body.sessions,lost=listed.find(s=>s.label==='Lost phone');
 expect((await r.call(keep,{action:'revoke',id:lost.id})).body).toEqual({revoked:1,currentRevoked:false});
 const rows=await r.rows();
 expect(rows['session:'+hashOf(gone)]).toMatchObject({active:false,label:'Lost phone',revokedAt:new Date(T0).toISOString()});
 expect(rows['family:'+familyOf(gone)]).toEqual({active:false,revokedAt:new Date(T0).toISOString()});
 expect(rows['revoked-sweep-at']).toBe(T0+90*DAY);expect(rows['session-count']).toBe(2);
 return {r,keep,gone};
}
const swept=(rows,keep,gone)=>{
 expect(rows).not.toHaveProperty('session:'+hashOf(gone));expect(rows['family:'+familyOf(gone)]).toEqual({active:false});
 expect(rows).not.toHaveProperty('revoked-sweep-at');expect(rows['session-count']).toBe(2);
 expect(rows['session:'+hashOf(keep)]).toMatchObject({active:true,label:'Kept browser'});expect(rows['family:'+familyOf(keep)]).toMatchObject({active:true});
 expect(JSON.stringify(rows)).not.toContain('Lost phone');
};

test('the alarm deletes a revoked session 90 days after its revocation, with no request; its family can never come back',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-session-retention-alarm-'));
 const {r,keep,gone}=await revokedFixture(persist,200);
 // Day 89: the alarm runs (its spacing is shortened under the fixture flag) and keeps the record.
 await r.mf.dispose();let next=await at(persist,T0+89*DAY,200);
 await new Promise(resolve=>setTimeout(resolve,800));
 expect((await next.rows())['session:'+hashOf(gone)]).toMatchObject({active:false});
 // Day 91: the alarm alone sweeps it.
 await next.mf.dispose();next=await at(persist,T0+91*DAY,200);
 try{
  await until(async()=>!('session:'+hashOf(gone) in await next.rows()));
  swept(await next.rows(),keep,gone);
  // The revoked family stays revoked: neither its old token nor a refreshed one is ever accepted again.
  expect(await next.call(gone)).toMatchObject({status:401,body:{error:'SESSION_REVOKED'}});
  expect(await next.call(gone,{action:'register',label:'Lost phone again'})).toMatchObject({status:401,body:{error:'SESSION_REVOKED'}});
  const refreshed=fixtureToken('gone-refreshed',ACCOUNT,'gone');
  expect(await next.call(refreshed,{action:'refresh',previous:gone})).toMatchObject({status:401,body:{error:'SESSION_REVOKED'}});
  expect((await next.call(keep)).body.sessions.map(s=>s.label)).toEqual(['Kept browser']);
 }finally{await next.mf.dispose();}
},120000);

test('without the alarm, the next session request sweeps; before day 90 nothing is deleted',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'run11-session-retention-request-'));
 const {r,keep,gone}=await revokedFixture(persist);
 await r.mf.dispose();let next=await at(persist,T0+90*DAY-1);
 expect((await next.call(keep)).status).toBe(200);expect((await next.rows())['session:'+hashOf(gone)]).toMatchObject({active:false});
 await next.mf.dispose();next=await at(persist,T0+90*DAY);
 try{expect((await next.call(keep)).status).toBe(200);swept(await next.rows(),keep,gone);}finally{await next.mf.dispose();}
},120000);
