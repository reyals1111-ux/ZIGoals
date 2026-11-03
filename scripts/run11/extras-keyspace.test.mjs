import {test,expect} from 'vitest';
import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {privateRuntime} from './private-runtime.mjs';
import {createVault} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize} from '../../apps/web/lib/vault/cloud-sync';
import {extrasHeadsSchema,extrasSectionCloudSchema,openSection,sealSection,sectionText,syncExtras} from '../../apps/web/lib/vault/extras-sync';

// Session AB-Cloud Part 2 ([TIER 3] (sync), ADR-023 C1): the encrypted extras sections in the real private-sync Worker
// (Miniflare, fixture identities, the same Durable Object as the vault). Their keyspace is separate: the vault's own reads,
// writes and compaction (today's client, unchanged) never see or remove them; the account erase does; a Health deletion
// removes the Health section with it.
const TEXT=sectionText({'zigoals:goal-extras:v1':{version:1,goals:{},areas:[]}});
async function setup(){
 const r=await privateRuntime();
 await r.call('/v1/sessions',{action:'register',label:'Extras fixture'});
 const vault=await createVault();
 expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);
 const json=async(path,body,token)=>{const res=await r.call(path,body,token);return {status:res.status,body:await res.json()};};
 const put=async(section,base,{text=TEXT,generation=0,epoch=vault.manifest.epoch,operation=crypto.randomUUID()}={})=>json('/v1/extras',{protocol:1,action:'put',vault:vault.manifest.vault,operation,section,base,generation,epoch,parts:await sealSection(vault.key,vault.manifest,section,base+1,text)});
 return {r,vault,json,put};
}
const EMPTY={revision:0,generation:0,epoch:null,parts:0};
/** The vault object's own stored keys with a prefix, read from Miniflare's persisted SQLite file (no request, so no lazy step runs). */
async function storedKeys(persist,prefix){
 const dir=join(persist,'do','run11-private-sync-PrivateVault'),keys=[];
 for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sqlite')&&f!=='metadata.sqlite')){const db=new DatabaseSync(join(dir,file),{readOnly:true});try{keys.push(...db.prepare('SELECT key FROM _cf_KV WHERE key LIKE ?').all(`${prefix}%`).map(row=>row.key));}finally{db.close();}}
 return keys.sort();
}
test('each section is written by compare-and-swap, replayed by its operation id, listed by its head and read back sealed',async()=>{
 const {r,vault,json,put}=await setup();
 try{
  expect(await json('/v1/extras')).toEqual({status:200,body:{protocol:1,sections:{goals:EMPTY,life:EMPTY,habits:EMPTY,health:EMPTY}}});
  const operation=crypto.randomUUID();
  expect(await put('goals',0,{operation})).toEqual({status:200,body:{revision:1,generation:0}});
  const sealed=await sealSection(vault.key,vault.manifest,'goals',1,TEXT);
  expect((await json('/v1/extras',{protocol:1,action:'put',vault:vault.manifest.vault,operation,section:'goals',base:0,generation:0,epoch:vault.manifest.epoch,parts:sealed})).body).toEqual({error:'OPERATION_REUSED'});
  expect(await put('goals',0)).toEqual({status:409,body:{error:'REVISION_CONFLICT',revision:1}});
  expect((await put('goals',1,{epoch:vault.manifest.epoch+1})).body).toEqual({error:'EPOCH_RETIRED'});
  expect((await put('goals',1,{generation:3})).body).toEqual({error:'EXTRAS_DELETED',generation:0});
  for(const bad of [{parts:[]},{parts:[{version:2}]},{parts:Array.from({length:17},()=>sealed[0])},{extra:true},{section:'portfolio'},{section:'vault'}]){
   const res=await json('/v1/extras',{protocol:1,action:'put',vault:vault.manifest.vault,operation:crypto.randomUUID(),section:'goals',base:1,generation:0,epoch:vault.manifest.epoch,parts:sealed,...bad});
   expect(res,JSON.stringify(bad).slice(0,40)).toEqual({status:400,body:{error:'INVALID_EXTRAS_REQUEST'}});
  }
  expect((await json('/v1/extras?section=nope')).status).toBe(400);
  // Sections are independent: another section's revision starts at its own zero.
  expect(await put('life',0)).toEqual({status:200,body:{revision:1,generation:0}});
  const heads=extrasHeadsSchema.parse((await json('/v1/extras')).body);
  expect(heads.sections.goals).toEqual({revision:1,generation:0,epoch:vault.manifest.epoch,parts:1});
  const read=extrasSectionCloudSchema.parse((await json('/v1/extras?section=goals')).body);
  expect(await openSection(vault.key,vault.manifest,read)).toBe(TEXT);
  // A part is bound to its section: the goals parts presented as the life section do not open.
  await expect(openSection(vault.key,vault.manifest,{...read,section:'life'})).rejects.toThrow();
 }finally{await r.mf.dispose();}
},60000);
test('today\'s vault client never sees the extras, and its sync and compaction leave them in place',async()=>{
 const {r,vault,json,put}=await setup();
 try{
  await put('goals',0);await put('health',0);
  const transport={read:async cursor=>(await r.call('/v1/vault'+(cursor?'?cursor='+encodeURIComponent(cursor):''))).json(),readRows:async ids=>(await r.call('/v1/vault?ids='+ids.join(','))).json(),write:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();},compact:async op=>{const res=await r.call('/v1/vault',op);expect(res.status).toBe(200);return res.json();}};
  let state={version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null};const journal={read:async()=>structuredClone(state),write:async value=>{state=structuredClone(value);}};
  for(const settings of ['{"a":1}','{"a":2}','{"a":3}'])await(await synchronize(transport,journal,vault.key,vault.manifest,{settings},()=>{},()=>{})).commit();
  const listed=await transport.read(null);
  expect(listed.records.every(row=>['finance','habits','health','settings'].includes(row.domain))).toBe(true);
  expect(JSON.stringify(listed)).not.toContain('extras');
  expect((await cloudSnapshot(transport,vault.key,vault.manifest)).data).toEqual({settings:'{"a":3}'});
  const after=extrasSectionCloudSchema.parse((await json('/v1/extras?section=goals')).body);
  expect(after.revision).toBe(1);expect(await openSection(vault.key,vault.manifest,after)).toBe(TEXT);
 }finally{await r.mf.dispose();}
},60000);
test('writes wait for a staged rotation; a deletion counts a generation; a Health deletion removes the Health section; the account erase removes them all',async()=>{
 const {r,vault,json,put}=await setup();
 try{
  await put('goals',0);
  const next=await createVault(vault.manifest.vault,vault.manifest.epoch+1);
  expect((await json('/v1/rotation',{action:'begin',operation:crypto.randomUUID(),base:1,manifest:next.manifest})).status).toBe(200);
  expect((await put('goals',1)).body).toEqual({error:'ROTATION_IN_PROGRESS'});
  const staged=(await json('/v1/rotation')).body.rotation;
  expect((await json('/v1/rotation',{action:'abort',operation:staged.operation})).status).toBe(200);
  expect((await json('/v1/extras',{protocol:1,action:'delete',vault:vault.manifest.vault,operation:crypto.randomUUID(),section:'goals',base:1,generation:0})).body).toEqual({revision:2,generation:1});
  expect((await json('/v1/extras?section=goals')).body).toEqual({protocol:1,section:'goals',revision:2,generation:1,epoch:null,parts:[]});
  expect((await put('goals',2,{generation:1})).status).toBe(200);
  // Health: written under Health generation 0; the person deletes Health from the cloud; the section goes with it.
  expect((await put('health',0)).status).toBe(200);
  const vaultHead=await (await r.call('/v1/vault')).json();
  expect((await r.call('/v1/domain',{action:'delete-domain',domain:'health',confirm:'DELETE CLOUD HEALTH',operation:crypto.randomUUID(),revision:vaultHead.revision,generation:0})).status).toBe(200);
  // Gate B (security read, finding 3): gone in the deletion's own transaction, before any extras request.
  expect(await storedKeys(r.persist,'extras-part:health:')).toEqual([]);
  expect(await storedKeys(r.persist,'extras-part:goals:')).toEqual(['extras-part:goals:0']);
  expect((await json('/v1/extras')).body.sections.health).toEqual({revision:2,generation:1,epoch:null,parts:0});
  expect((await json('/v1/extras?section=health')).body.parts).toEqual([]);
  // A new upload under the new Health generation is kept (the person turned Health sync on again).
  expect((await put('health',2,{generation:1})).body).toEqual({revision:3,generation:1});
  expect((await json('/v1/extras')).body.sections.health.parts).toBe(1);
  expect((await json('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'})).status).toBe(200);
  expect(await json('/v1/extras')).toEqual({status:410,body:{error:'ACCOUNT_DELETED'}});
 }finally{await r.mf.dispose();}
},60000);
test('AK 8.10 (AFL8): the Checklist section is listed only when asked for by name, written and read like the four, and goes with the account erase',async()=>{
 const {r,vault,json,put}=await setup();
 try{
  // An older client reads the heads strictly: the default list stays exactly the four.
  expect(await json('/v1/extras')).toEqual({status:200,body:{protocol:1,sections:{goals:EMPTY,life:EMPTY,habits:EMPTY,health:EMPTY}}});
  expect(await json('/v1/extras?with=checklist')).toEqual({status:200,body:{protocol:1,sections:{goals:EMPTY,life:EMPTY,habits:EMPTY,health:EMPTY,checklist:EMPTY}}});
  for(const bad of ['portfolio','goals','Checklist','']) expect((await json('/v1/extras?with='+encodeURIComponent(bad))).status,bad).toBe(400);
  expect(await put('checklist',0)).toEqual({status:200,body:{revision:1,generation:0}});
  expect((await json('/v1/extras?with=checklist')).body.sections.checklist).toEqual({revision:1,generation:0,epoch:vault.manifest.epoch,parts:1});
  expect(Object.keys((await json('/v1/extras')).body.sections)).toEqual(['goals','life','habits','health']);
  const read=extrasSectionCloudSchema.parse((await json('/v1/extras?section=checklist')).body);
  expect(await openSection(vault.key,vault.manifest,read)).toBe(TEXT);
  await expect(openSection(vault.key,vault.manifest,{...read,section:'goals'})).rejects.toThrow();
  expect(await storedKeys(r.persist,'extras-part:checklist:')).toEqual(['extras-part:checklist:0']);
  expect((await json('/v1/account',{action:'delete-cloud-data',confirm:'DELETE CLOUD DATA'})).status).toBe(200);
  expect(await storedKeys(r.persist,'extras-part:checklist:')).toEqual([]);
 }finally{await r.mf.dispose();}
},60000);

test('receipts are kept for the newest 64 writes across sections (FIX_PLAN B5 horizon)',async()=>{
 const {r,vault,json,put}=await setup();
 try{
  const first=crypto.randomUUID();
  expect((await put('goals',0,{operation:first})).status).toBe(200);
  let revision={goals:1,life:0};
  for(let i=0;i<64;i++){const section=i%2?'goals':'life';const res=await put(section,revision[section]);expect(res.status).toBe(200);revision[section]=res.body.revision;}
  // The first operation's receipt was pruned: replaying it now is a stale base, refused as a conflict, never applied twice.
  const sealed=await sealSection(vault.key,vault.manifest,'goals',1,TEXT);
  expect((await json('/v1/extras',{protocol:1,action:'put',vault:vault.manifest.vault,operation:first,section:'goals',base:0,generation:0,epoch:vault.manifest.epoch,parts:sealed})).body).toMatchObject({error:'REVISION_CONFLICT'});
 }finally{await r.mf.dispose();}
},120000);
void syncExtras;
