import {test,expect} from 'vitest';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ACCOUNT,createPrivateMiniflare,fixtureToken} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {stepUpProof,stepUpVerifier} from '../../apps/web/lib/vault/step-up';
import {verifierOf} from '../../workers/private-sync/step-up.mjs';
/**
 * Session Z-Cloud Part 5 (A6, ADR-019 C35): step-up with the recovery secret, in the real private-sync Worker. With the
 * owner's switch on and a verifier registered for the live epoch, the five actions that end data or access need the
 * proof; with it off, or for a vault without a verifier (every vault #32–#35 made), nothing changes; unlock, sync and
 * sessions never ask.
 */
async function runtime(required){
 const persist=await mkdtemp(join(tmpdir(),'zigoals-step-up-'));
 const mf=await createPrivateMiniflare({persist,bindings:{STEP_UP_REQUIRED:required}});
 const call=(path,body,{who='fixture',headers={}}={})=>mf.dispatchFetch('https://sync.test'+path,{method:body?'POST':'GET',headers:{origin:'https://app.test',authorization:'Bearer '+fixtureToken(who),'x-zigoals-account':ACCOUNT,'content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
 return {mf,call};
}
const status=async response=>{const value=response.status;await response.body?.cancel();return value;};
async function vaultWithSecret(r){
 for(const who of ['fixture','other'])expect(await status(await r.call('/v1/sessions',{action:'register',label:'Fictional '+who},{who}))).toBe(200);
 const vault=await createVault();
 expect(await status(await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest}))).toBe(200);
 const proof=await stepUpProof(vault.recovery,ACCOUNT,vault.manifest.vault,vault.manifest.epoch);
 return {vault,proof,verifier:await stepUpVerifier(proof)};
}
const revokeOthers={action:'revoke-others'};

test('the proof the app makes is the one the Worker checks, and the remembered root cannot make it',async()=>{
 const vault=await createVault(),proof=await stepUpProof(vault.recovery,ACCOUNT,vault.manifest.vault,1);
 expect(proof).toMatch(/^[a-f0-9]{64}$/);
 expect(await verifierOf(proof)).toBe(await stepUpVerifier(proof));
 // Bound to the account, the vault and the epoch; another secret gives another proof.
 expect(await stepUpProof(vault.recovery,'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',vault.manifest.vault,1)).not.toBe(proof);
 expect(await stepUpProof(vault.recovery,ACCOUNT,vault.manifest.vault,2)).not.toBe(proof);
 expect(await stepUpProof((await createVault()).recovery,ACCOUNT,vault.manifest.vault,1)).not.toBe(proof);
 // What a remembered device keeps (the vault's root) is a non-extractable HKDF key: nothing to make a proof from.
 expect(vault.key.extractable).toBe(false);expect([...vault.key.usages]).toEqual(['deriveKey']);
 await expect(stepUpProof('not-a-secret',ACCOUNT,vault.manifest.vault,1)).rejects.toThrow(/recovery secret/);
},30000);

test('switch on: once a verifier is registered, the five actions need the proof; unlock, sync and sessions never ask',async()=>{
 const r=await runtime('on');
 try{
  const {vault,proof,verifier}=await vaultWithSecret(r),step={'x-zigoals-step-up':proof};
  // No verifier yet (a vault #32–#35 made): today's behaviour, no proof asked.
  expect(await status(await r.call('/v1/sessions',revokeOthers))).toBe(200);
  // Registration: the first verifier for the live epoch is kept; the same again is fine; a different one is refused.
  expect(await status(await r.call('/v1/step-up',{action:'register',epoch:2,verifier}))).toBe(409);
  expect(await status(await r.call('/v1/step-up',{action:'register',epoch:1,verifier}))).toBe(200);
  expect(await status(await r.call('/v1/step-up',{action:'register',epoch:1,verifier}))).toBe(200);
  const other=await r.call('/v1/step-up',{action:'register',epoch:1,verifier:'0'.repeat(64)});expect(other.status).toBe(409);expect(await other.json()).toEqual({error:'STEP_UP_DIFFERENT'});
  // The Worker's own steps cannot be asked for from outside: its internal header is removed from every request.
  expect(await status(await r.call('/v1/step-up',{action:'next',epoch:2,verifier:'0'.repeat(64)},{headers:{'x-zigoals-step-up-internal':'1'}}))).toBe(400);
  expect(await status(await r.call('/v1/step-up',{action:'check',proof:null},{headers:{'x-zigoals-step-up-internal':'1'}}))).toBe(400);
  // Unlock and sync (what #35 needs) never ask: read, write, sessions, refresh.
  expect(await status(await r.call('/v1/vault'))).toBe(200);
  expect(await status(await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:1,changes:[]}))).toBe(200);
  expect(await status(await r.call('/v1/sessions'))).toBe(200);
  expect(await status(await r.call('/v1/sessions',{action:'register',label:'Fictional third'},{who:'third'}))).toBe(200);
  // Sign out all other devices, and one other session: refused without the proof or with a wrong one.
  const missing=await r.call('/v1/sessions',revokeOthers);expect(missing.status).toBe(403);expect(await missing.json()).toEqual({error:'STEP_UP_REQUIRED'});
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':'f'.repeat(64)}}))).toBe(403);
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':'not hex'}}))).toBe(403);
  const sessions=(await (await r.call('/v1/sessions')).json()).sessions,third=sessions.find(s=>s.label==='Fictional third');
  expect(await status(await r.call('/v1/sessions',{action:'revoke',id:third.id}))).toBe(403);
  expect(await status(await r.call('/v1/sessions',{action:'revoke',id:third.id},{headers:step}))).toBe(200);
  // A section, the cloud data: refused without, accepted with.
  const page=await (await r.call('/v1/vault')).json();
  const deletion={action:'delete-domain',domain:'health',confirm:'DELETE CLOUD HEALTH',operation:crypto.randomUUID(),revision:page.revision,generation:0};
  expect(await status(await r.call('/v1/domain',deletion))).toBe(403);
  expect(await status(await r.call('/v1/domain',deletion,{headers:step}))).toBe(200);
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:step}))).toBe(200);
  expect(await status(await r.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'}))).toBe(403);
  expect(await status(await r.call('/v1/vault'))).toBe(200);
  expect(await status(await r.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'},{headers:step}))).toBe(200);
  expect(await status(await r.call('/v1/vault'))).toBe(410);
 }finally{await r.mf.dispose();}
},60000);

test('a rotation begins only with the current secret\'s proof, and the new secret\'s verifier counts from the new epoch',async()=>{
 const r=await runtime('on');
 try{
  const {vault,proof,verifier}=await vaultWithSecret(r);
  expect(await status(await r.call('/v1/step-up',{action:'register',epoch:1,verifier}))).toBe(200);
  const next=await createVault(vault.manifest.vault,2),nextProof=await stepUpProof(next.recovery,ACCOUNT,vault.manifest.vault,2);
  const begin={action:'begin',operation:crypto.randomUUID(),base:1,manifest:next.manifest};
  expect(await status(await r.call('/v1/rotation',begin))).toBe(403);
  expect(await status(await r.call('/v1/rotation',begin,{headers:{'x-zigoals-step-up':nextProof}}))).toBe(403);
  expect(await status(await r.call('/v1/rotation',begin,{headers:{'x-zigoals-step-up':proof,'x-zigoals-step-up-next':await stepUpVerifier(nextProof)}}))).toBe(200);
  // While staged, the live epoch is still 1: the old secret is what counts.
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':nextProof}}))).toBe(403);
  // Staging and commit carry no proof (the begin had it); the vault has no records to stage.
  expect(await status(await r.call('/v1/rotation',{action:'commit',operation:begin.operation}))).toBe(200);
  expect((await (await r.call('/v1/vault')).json()).manifest.epoch).toBe(2);
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':proof}}))).toBe(403);
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':nextProof}}))).toBe(200);
  // Registering the new secret again is the same verifier; the old one is no longer accepted for the new epoch.
  expect(await status(await r.call('/v1/step-up',{action:'register',epoch:2,verifier:await stepUpVerifier(nextProof)}))).toBe(200);
  expect(await status(await r.call('/v1/step-up',{action:'register',epoch:2,verifier}))).toBe(409);
 }finally{await r.mf.dispose();}
},60000);

// The Gate B security read (ADR-019 C35 addendum): after a first rotation the live verifier sat only in the record's
// `next`, and staging a second rotation overwrote it, leaving the live epoch with none: the five actions then passed
// without a proof, and a session alone could register its own verifier and abort the rotation to keep it.
test('a second rotation keeps the live epoch covered while staged and after an abort; an aborted rotation\'s verifier never carries over',async()=>{
 const r=await runtime('on');
 try{
  const {vault,proof,verifier}=await vaultWithSecret(r);
  expect(await status(await r.call('/v1/step-up',{action:'register',epoch:1,verifier}))).toBe(200);
  const rotate=async(epoch,from,{withNext=true}={})=>{
   const next=await createVault(vault.manifest.vault,epoch),nextProof=await stepUpProof(next.recovery,ACCOUNT,vault.manifest.vault,epoch);
   const begin={action:'begin',operation:crypto.randomUUID(),base:(await (await r.call('/v1/vault')).json()).revision,manifest:next.manifest};
   expect(await status(await r.call('/v1/rotation',begin,{headers:{'x-zigoals-step-up':from,...(withNext?{'x-zigoals-step-up-next':await stepUpVerifier(nextProof)}:{})}}))).toBe(200);
   return {operation:begin.operation,nextProof};
  };
  // Rotation 1, committed: epoch 2, covered by the new secret.
  const first=await rotate(2,proof);
  expect(await status(await r.call('/v1/rotation',{action:'commit',operation:first.operation}))).toBe(200);
  // Rotation 2, staged: the live epoch (2) still needs its proof, and its verifier cannot be replaced.
  const second=await rotate(3,first.nextProof);
  expect(await status(await r.call('/v1/sessions',revokeOthers))).toBe(403);
  expect(await status(await r.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'}))).toBe(403);
  const taken=await r.call('/v1/step-up',{action:'register',epoch:2,verifier:'0'.repeat(64)});expect(taken.status).toBe(409);expect(await taken.json()).toEqual({error:'STEP_UP_DIFFERENT'});
  // Aborted: still covered by the live secret.
  expect(await status(await r.call('/v1/rotation',{action:'abort',operation:second.operation}))).toBe(200);
  expect(await status(await r.call('/v1/sessions',revokeOthers))).toBe(403);
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':first.nextProof}}))).toBe(200);
  // A rotation begun without a next verifier (an app before this one) does not inherit the aborted rotation's: the new
  // epoch has none until the person's next secret entry registers it (the recorded trust-on-first-use limit).
  const third=await rotate(3,first.nextProof,{withNext:false});
  expect(await status(await r.call('/v1/rotation',{action:'commit',operation:third.operation}))).toBe(200);
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':second.nextProof}}))).toBe(200);
  expect(await status(await r.call('/v1/step-up',{action:'register',epoch:3,verifier:await stepUpVerifier(third.nextProof)}))).toBe(200);
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':second.nextProof}}))).toBe(403);
  expect(await status(await r.call('/v1/sessions',revokeOthers,{headers:{'x-zigoals-step-up':third.nextProof}}))).toBe(200);
 }finally{await r.mf.dispose();}
},60000);

test('switch off, or empty: a registered verifier changes nothing (the rollback to #35)',async()=>{
 for(const setting of ['off','']){
  const r=await runtime(setting);
  try{
   const {verifier}=await vaultWithSecret(r);
   expect(await status(await r.call('/v1/step-up',{action:'register',epoch:1,verifier}))).toBe(200);
   expect(await status(await r.call('/v1/sessions',revokeOthers))).toBe(200);
   expect(await status(await r.call('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'}))).toBe(200);
  }finally{await r.mf.dispose();}
 }
},60000);
