import {test,expect} from 'vitest';
import {cp,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {privateRuntime} from './private-runtime.mjs';
import {createVault,openRecord,sealRecord} from '../../apps/web/lib/vault/crypto';
import {cloudSnapshot,synchronize,OlderVaultError,OlderCloudError} from '../../apps/web/lib/vault/cloud-sync';

/**
 * Session Y Part 5, FIX_PLAN B3 and owner edit 3 (ADR-018 Y22), against the real private-sync Worker in Miniflare: a
 * device that synced with a rotated vault (epoch 2) meets a vault made again at epoch 1. "Delete cloud data" is terminal
 * for an account (every later call answers 410 ACCOUNT_DELETED, lifecycle-recovery.test.mjs), so the one way the same
 * account's cloud goes back is a restore from an older backup (the owner's recovery runbook); here the Worker's storage
 * is copied before enrolment and restored later, and another device enrols again. The older vault is refused with
 * nothing applied or written; the device's records are untouched; the way out (the panel's "Re-link this device": the
 * journal set aside, a fresh one) syncs with the new vault through the existing paths. The same holds at an equal epoch
 * (neither vault rotated), where the refusal is the older revision.
 */
const empty=()=>({version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null});
const journalOf=(state=empty())=>({state,read:async function(){return structuredClone(this.state);},write:async function(value){this.state=structuredClone(value);}});
function transportOf(r){
 return {read:async cursor=>{const res=await r.call('/v1/vault'+(cursor?'?cursor='+encodeURIComponent(cursor):''));expect(res.status).toBe(200);return res.json();},
  write:async op=>{const res=await r.call('/v1/vault',op);if(res.status===409)throw Error('Cloud changed.');expect(res.status).toBe(200);return res.json();}};
}
async function enrol(r,vault){expect((await r.call('/v1/vault',{protocol:1,vault:vault.manifest.vault,operation:crypto.randomUUID(),base:0,changes:[],manifest:vault.manifest})).status).toBe(200);}
/** Rotation as the panel does it: every row re-sealed under the next epoch's key with the same id and revision. */
async function rotate(r,from,to){
 const page=await(await r.call('/v1/vault')).json(),operation=crypto.randomUUID();
 expect((await r.call('/v1/rotation',{action:'begin',operation,base:page.revision,manifest:to.manifest})).status).toBe(200);
 const rows=await Promise.all(page.records.map(async row=>{const at={vault:from.manifest.vault,domain:row.domain,object:row.id,revision:row.revision};return {...row,epoch:to.manifest.epoch,envelope:await sealRecord(to.key,{...at,epoch:to.manifest.epoch},await openRecord(from.key,{...at,epoch:from.manifest.epoch},row.envelope))};}));
 expect((await r.call('/v1/rotation',{action:'stage',operation,rows})).status).toBe(200);
 expect((await r.call('/v1/rotation',{action:'commit',operation})).status).toBe(200);
}
/** The Worker's storage copied while it is stopped (a backup), and the restore of that copy. */
async function backup(r){await r.mf.dispose();const copy=await mkdtemp(join(tmpdir(),'zigoals-y-b3-backup-'));await cp(r.persist,copy,{recursive:true});return {copy,r:await privateRuntime(r.persist)};}
async function restore(r,copy){await r.mf.dispose();return privateRuntime(copy);}

test('restore, re-enrol, refuse, recover: a rotated device meets a vault made again at epoch 1',async()=>{
 let r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Older-vault fixture'});let saved;({copy:saved,r}=await backup(r));let transport=transportOf(r);
  const mine={settings:'{"fixture":"device A"}'},theirs={settings:'{"fixture":"device B, after the restore"}'};
  // Device A enrols, syncs, then the vault is rotated and A syncs again: A's journal is at epoch 2.
  const first=await createVault();await enrol(r,first);const a=journalOf();
  await(await synchronize(transport,a,first.key,first.manifest,mine,()=>{},()=>{})).commit();
  const second=await createVault(first.manifest.vault,2);await rotate(r,first,second);
  await(await synchronize(transport,a,second.key,second.manifest,mine,()=>{},()=>{})).commit();
  expect(a.state).toMatchObject({epoch:2,base:mine});expect(a.state.headRevision).toBeGreaterThan(0);
  // The cloud is restored from the backup taken before enrolment; device B finds no vault and makes one (epoch 1).
  r=await restore(r,saved);transport=transportOf(r);expect((await(await r.call('/v1/vault')).json()).manifest).toBeNull();
  const remade=await createVault();await enrol(r,remade);
  await(await synchronize(transport,journalOf(),remade.key,remade.manifest,theirs,()=>{},()=>{})).commit();
  const before=await(await r.call('/v1/vault')).json(),kept=structuredClone(a.state);
  // Device A unlocks the new vault with its secret: refused, nothing read into the journal, nothing written.
  await expect(synchronize(transport,a,remade.key,remade.manifest,mine,()=>{},()=>{})).rejects.toThrow(OlderVaultError);
  expect(a.state).toEqual(kept);expect(await(await r.call('/v1/vault')).json()).toEqual(before);
  // The way out: the journal set aside (the panel keeps it in the recovery archive), a fresh one; A's own records are
  // never replaced: with records the existing review is asked for, an empty section takes the cloud's.
  const archived=structuredClone(a.state),relinked=journalOf();
  await expect(synchronize(transport,relinked,remade.key,remade.manifest,mine,()=>{},()=>{})).rejects.toThrow('Unlinked');
  expect(relinked.state).toEqual(empty());expect(await(await r.call('/v1/vault')).json()).toEqual(before);
  const pulled=await synchronize(transport,relinked,remade.key,remade.manifest,{},()=>{},()=>{});await pulled.commit();
  expect(pulled.data).toEqual(theirs);expect(relinked.state).toMatchObject({epoch:1,base:theirs});expect(archived).toEqual(kept);
  // And sync goes on normally from there.
  const next={settings:'{"fixture":"device A, re-linked"}'};
  await(await synchronize(transport,relinked,remade.key,remade.manifest,next,()=>{},()=>{})).commit();
  expect((await cloudSnapshot(transport,remade.key,remade.manifest)).data).toEqual(next);
 }finally{await r.mf.dispose();}
},60000);

test('at an equal epoch the same restore is refused as an older revision, with the same way out',async()=>{
 let r=await privateRuntime();try{
  await r.call('/v1/sessions',{action:'register',label:'Equal-epoch fixture'});let saved;({copy:saved,r}=await backup(r));let transport=transportOf(r);
  const mine={settings:'{"fixture":"device A"}'},theirs={settings:'{"fixture":"device B"}'};
  const first=await createVault();await enrol(r,first);const a=journalOf();
  for(const n of [1,2,3])await(await synchronize(transport,a,first.key,first.manifest,{settings:`{"fixture":"device A","n":${n}}`},()=>{},()=>{})).commit();
  r=await restore(r,saved);transport=transportOf(r);const remade=await createVault();await enrol(r,remade);
  await(await synchronize(transport,journalOf(),remade.key,remade.manifest,theirs,()=>{},()=>{})).commit();
  const kept=structuredClone(a.state),before=await(await r.call('/v1/vault')).json();
  await expect(synchronize(transport,a,remade.key,remade.manifest,mine,()=>{},()=>{})).rejects.toThrow(OlderCloudError);
  expect(a.state).toEqual(kept);expect(await(await r.call('/v1/vault')).json()).toEqual(before);
  const relinked=journalOf(),pulled=await synchronize(transport,relinked,remade.key,remade.manifest,{},()=>{},()=>{});await pulled.commit();
  expect(pulled.data).toEqual(theirs);
 }finally{await r.mf.dispose();}
},60000);
