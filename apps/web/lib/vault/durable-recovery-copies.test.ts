import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {z} from 'zod';
import {VaultDatabase} from './database';
import {enableDurableStore,restoreDurableStore,updateDurableStore} from './local';

// QA-02 for modules in transactional storage (IndexedDB): each restore commits a recovery copy of the replaced data in
// the same transaction. After a confirmed restore only that newest copy of the module is kept; nothing is removed when
// the replaced store was invalid, the restore failed, or the cleanup itself failed.
const schema=z.object({schemaVersion:z.literal(1),rows:z.array(z.object({id:z.string(),value:z.string()}))});
const HEALTH='zigoals:health:v1',HABITS='zigoals:habits:v1';
const raw=(value:string)=>JSON.stringify({schemaVersion:1,rows:[{id:'a',value}]});
function storage(){const m=new Map<string,string>();return {map:m,get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage&{map:Map<string,string>};}
// The stable code a UI maps (storage-errors.ts), read directly so this file also runs against the code before the fix.
const storageErrorCode=(error:unknown)=>(error as {code?:unknown})?.code;
const empty=()=>({schemaVersion:1 as const,rows:[]});
let db:VaultDatabase;
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_k:string,f:()=>unknown)=>f()}});db=new VaultDatabase(crypto.randomUUID());});
afterEach(()=>{db.close();vi.restoreAllMocks();vi.unstubAllGlobals();});
async function durable(key:string,initial:string){const s=storage();s.setItem(key,initial);await enableDurableStore(s,key,schema,empty,db);return s;}
const refuse=(method:'put'|'delete')=>{const original=IDBObjectStore.prototype[method];vi.spyOn(IDBObjectStore.prototype,method).mockImplementation(function(this:IDBObjectStore,...args:unknown[]){if(this.name==='recovery')throw new DOMException('The quota has been exceeded.','QuotaExceededError');return (original as (...a:unknown[])=>IDBRequest).apply(this,args);});};

test('successive restores keep one recovery copy per module: the data the last restore replaced',async()=>{
 const s=await durable(HEALTH,raw('original'));
 expect(await db.recovery('local',HEALTH)).toEqual([raw('original')]);
 await restoreDurableStore(s,HEALTH,schema,raw('first'),db);
 await restoreDurableStore(s,HEALTH,schema,raw('second'),db);
 await restoreDurableStore(s,HEALTH,schema,raw('third'),db);
 expect(await db.recovery('local',HEALTH)).toEqual([raw('second')]);
 expect((await db.read('local',HEALTH))?.data).toEqual(JSON.parse(raw('third')));
});

test('older browser-storage copies of the same module go too; other modules and spaces keep theirs',async()=>{
 const s=await durable(HEALTH,raw('original')),habits=await durable(HABITS,raw('habits'));
 s.setItem(`${HEALTH}:recovery:from-before-the-move`,raw('older'));s.setItem(`${HABITS}:recovery:other-module`,raw('keep'));
 await db.commit('account:11111111-1111-4111-8111-111111111111',HEALTH,0,JSON.parse(raw('other space')),crypto.randomUUID(),raw('other space copy'));
 await restoreDurableStore(s,HEALTH,schema,raw('first'),db);
 expect([...s.map.keys()].filter(k=>k.includes(':recovery:'))).toEqual([`${HABITS}:recovery:other-module`]);
 expect(await db.recovery('local',HABITS)).toEqual([raw('habits')]);
 expect(await db.recovery('account:11111111-1111-4111-8111-111111111111',HEALTH)).toEqual([raw('other space copy')]);
 expect(habits.getItem(HABITS)).not.toBeNull();
});

test('an invalid current store is replaced, but no older copy is deleted',async()=>{
 const s=await durable(HEALTH,raw('original'));
 const current=await db.read('local',HEALTH);await db.commit('local',HEALTH,current!.revision,{schemaVersion:1,rows:[{id:'a',value:5}]},crypto.randomUUID(),raw('copy before invalid'));
 await restoreDurableStore(s,HEALTH,schema,raw('restored'),db);
 expect((await db.recovery('local',HEALTH)).sort()).toEqual([raw('original'),raw('copy before invalid'),JSON.stringify({schemaVersion:1,rows:[{id:'a',value:5}]})].sort());
});

test('a newer stored version is refused as NEWER_VERSION and every copy stays',async()=>{
 const s=await durable(HEALTH,raw('original')),current=await db.read('local',HEALTH);
 await db.commit('local',HEALTH,current!.revision,{schemaVersion:2,rows:[]},crypto.randomUUID(),raw('copy'));
 const before=await db.recovery('local',HEALTH);let error:unknown;
 try{await restoreDurableStore(s,HEALTH,schema,raw('restored'),db);}catch(caught){error=caught;}
 expect(storageErrorCode(error)).toBe('NEWER_VERSION');expect(await db.recovery('local',HEALTH)).toEqual(before);
});

test('a quota error while deleting older copies keeps them all and the restore still succeeds',async()=>{
 const s=await durable(HEALTH,raw('original'));await restoreDurableStore(s,HEALTH,schema,raw('first'),db);
 refuse('delete');
 await expect(restoreDurableStore(s,HEALTH,schema,raw('second'),db)).resolves.toEqual(JSON.parse(raw('second')));
 vi.restoreAllMocks();
 expect((await db.recovery('local',HEALTH)).sort()).toEqual([raw('original'),raw('first')].sort());
});

test('a quota error while committing is STORAGE_FULL with a plain message, and nothing changes',async()=>{
 const s=await durable(HEALTH,raw('original')),before=await db.recovery('local',HEALTH);
 refuse('put');let error:unknown;
 try{await restoreDurableStore(s,HEALTH,schema,raw('restored'),db);}catch(caught){error=caught;}
 vi.restoreAllMocks();
 expect(storageErrorCode(error)).toBe('STORAGE_FULL');expect((error as Error).message).toMatch(/^Your browser storage is full .*free up space on this device/);
 expect((await db.read('local',HEALTH))?.data).toEqual(JSON.parse(raw('original')));expect(await db.recovery('local',HEALTH)).toEqual(before);
});

test('a module changed elsewhere is CONFLICT; an oversized backup is MODULE_LIMIT',async()=>{
 const s=await durable(HEALTH,raw('original'));
 const stale=await db.read('local',HEALTH);await db.commit('local',HEALTH,stale!.revision,JSON.parse(raw('other tab')));
 let error:unknown;try{await db.commit('local',HEALTH,stale!.revision,JSON.parse(raw('late')));}catch(caught){error=caught;}
 expect(storageErrorCode(error)).toBe('CONFLICT');expect((error as Error).message).toMatch(/changed on another tab or device/);
 s.setItem(HEALTH,raw('marker replaced'));error=undefined;
 try{await updateDurableStore(s,HEALTH,schema,x=>({...x,rows:[]}),db);}catch(caught){error=caught;}
 expect(storageErrorCode(error)).toBe('CONFLICT');
 error=undefined;try{await restoreDurableStore(s,HEALTH,schema,'x'.repeat(32_000_001),db);}catch(caught){error=caught;}
 expect(storageErrorCode(error)).toBe('MODULE_LIMIT');
});
