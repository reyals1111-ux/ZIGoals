import 'fake-indexeddb/auto';
import {expect,test} from 'vitest';
import {VaultDatabase,RECEIPT_HORIZON,RECEIPT_PRUNE_EVERY} from './database';
// An account's space: the only kind whose outbox sync reads and acknowledges (B5, Session Y).
const S='account:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
test('atomic data/outbox survives reopen and rejects stale financial revision',async()=>{
 const name=crypto.randomUUID(),db=new VaultDatabase(name);await db.commit(S,'finance',0,{schemaVersion:4,goals:[{id:'1',target:'200000'}]},'op1');
 const reopened=new VaultDatabase(name);expect((await reopened.read(S,'finance'))?.data).toEqual({schemaVersion:4,goals:[{id:'1',target:'200000'}]});
 expect(await reopened.pending(S)).toHaveLength(1);
 await expect(reopened.commit(S,'finance',0,{goals:[]},'op2')).rejects.toThrow('changed');
 expect((await reopened.read(S,'finance'))?.revision).toBe(1);expect(await reopened.pending(S)).toHaveLength(1);
 db.close();reopened.close();
});
test('replay is idempotent, reused operation is rejected, changed record delta is bounded',async()=>{
 const db=new VaultDatabase(crypto.randomUUID()),data={rows:Array.from({length:300},(_,i)=>({id:String(i),value:'a'.repeat(8000)}))};
 await db.commit('account:A','health',0,data,'first');await db.acknowledge('account:A','first');
 const next={rows:data.rows.map((x,i)=>i===2?{...x,value:'new'}:x)};
 await db.commit('account:A','health',1,next,'second');await db.commit('account:A','health',1,next,'second');
 const pending=await db.pending('account:A');expect(pending).toHaveLength(1);expect(JSON.stringify(pending).length).toBeLessThan(30_000);
 await expect(db.commit('account:A','health',1,{rows:[]},'second')).rejects.toThrow('reused');
 expect((await db.read('account:B','health'))).toBeNull();expect((await db.page('account:A','health','rows',290,20,2))).toHaveLength(10);
 await expect(db.page('account:A','health','rows',290,20,1)).rejects.toThrow('changed between pages');db.close();
});
test('migration preserves exact original bytes and invalid large record never partially commits',async()=>{
 const db=new VaultDatabase(crypto.randomUUID()),raw=' {"schemaVersion":1,"rows":[]} ';
 await db.commit(S,'health',0,JSON.parse(raw),'migration',raw);
 expect(await db.recovery(S,'health')).toEqual([raw]);
 await expect(db.commit(S,'health',1,{rows:[{id:'bad',value:'x'.repeat(300000)}]},'bad')).rejects.toThrow('record');
 expect((await db.read(S,'health'))?.data).toEqual(JSON.parse(raw));expect(await db.pending(S)).toHaveLength(1);db.close();
});
test('caller mutation during async hashing cannot change the committed operation',async()=>{
 const db=new VaultDatabase(crypto.randomUUID()),data={rows:[{id:'a',value:'original'}]};
 const saving=db.commit('local','health',0,data,'stable');data.rows[0]!.value='mutated';await saving;
 expect((await db.read('local','health'))?.data).toEqual({rows:[{id:'a',value:'original'}]});db.close();
});
test('selected domain copies and outboxes commit together or all roll back on a later conflict',async()=>{
 const db=new VaultDatabase(crypto.randomUUID());await db.commit('account:A','health',0,{rows:[]},'seed');await db.acknowledge('account:A','seed');
 await expect(db.commitBatch('account:A',[{domain:'habits',base:0,data:{rows:[{id:'local-habit'}]},operation:'copy-habits'},{domain:'health',base:0,data:{rows:[{id:'local-water'}]},operation:'copy-health'}])).rejects.toThrow('changed');
 expect(await db.read('account:A','habits')).toBeNull();expect((await db.read('account:A','health'))?.data).toEqual({rows:[]});expect(await db.pending('account:A')).toEqual([]);
 await db.commitBatch('account:A',[{domain:'habits',base:0,data:{rows:[{id:'local-habit'}]},operation:'copy-habits'},{domain:'health',base:1,data:{rows:[{id:'local-water'}]},operation:'copy-health'}]);
 expect((await db.read('account:A','habits'))?.data.rows).toEqual([{id:'local-habit'}]);expect((await db.read('account:A','health'))?.data.rows).toEqual([{id:'local-water'}]);expect(await db.pending('account:A')).toHaveLength(2);db.close();
});
test('account generation loss aborts an atomic domain copy before publication',async()=>{
 const db=new VaultDatabase(crypto.randomUUID());let calls=0;
 await expect(db.commitBatch('account:A',[{domain:'habits',base:0,data:{rows:[]}},{domain:'health',base:0,data:{rows:[]}}],()=>{if(++calls===4)throw Error('Account changed');})).rejects.toThrow('Account changed');
 expect(await db.read('account:A','habits')).toBeNull();expect(await db.read('account:A','health')).toBeNull();expect(await db.pending('account:A')).toEqual([]);db.close();
});
test('indexed pending and recovery reads stay within exact account and domain prefixes',async()=>{
 const db=new VaultDatabase(crypto.randomUUID());
 await db.commit('account:A','health',0,{rows:[{id:'one'}]},'a-health','old A Health bytes');
 await db.commit('account:A','health-other',0,{rows:[{id:'two'}]},'a-other','old A other bytes');
 await db.commit('account:A-other','health',0,{rows:[{id:'three'}]},'other-health','old other Health bytes');
 expect((await db.pending('account:A')).map(p=>p.operation)).toEqual(['a-health','a-other']);
 expect((await db.pending('account:A-other')).map(p=>p.operation)).toEqual(['other-health']);
 expect(await db.recovery('account:A','health')).toEqual(['old A Health bytes']);
 expect(await db.recovery('account:A','health-other')).toEqual(['old A other bytes']);
 expect(await db.recovery('account:A-other','health')).toEqual(['old other Health bytes']);db.close();
});
// Session Y Part 5, FIX_PLAN B5 (Q-SYNC-06, ADR-018): nothing consumes the outbox of a space that never syncs, so it
// holds no plaintext copy of the records any more; an account's outbox is written and acknowledged exactly as before.
function rawOutbox(name:string){return new Promise<{keys:IDBValidKey[];values:{space:string;operation:string}[]}>((resolve,reject)=>{const open=indexedDB.open(name);open.onsuccess=()=>{const db=open.result,store=db.transaction('outbox').objectStore('outbox'),keys=store.getAllKeys(),values=store.getAll();values.onsuccess=()=>{db.close();resolve({keys:keys.result,values:values.result});};values.onerror=()=>reject(values.error);};open.onerror=()=>reject(open.error);});}
/** An outbox entry as builds up to #34 wrote it for every space. */
function plantOutbox(name:string,space:string,operation:string){return new Promise<void>((resolve,reject)=>{const open=indexedDB.open(name);open.onsuccess=()=>{const db=open.result,t=db.transaction('outbox','readwrite');t.objectStore('outbox').put({space,domain:'zigoals:habits:v1',operation,base:0,revision:1,changes:[{field:'habits',id:'h',value:{name:'FICTIONAL plaintext'},deleted:false}],header:{}},JSON.stringify([space,operation]));t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>reject(t.error);};open.onerror=()=>reject(open.error);});}
test('B5: a Local Demo commit writes no outbox entry and clears the ones earlier builds left; an account keeps its own',async()=>{
 const name=crypto.randomUUID(),db=new VaultDatabase(name);
 await db.commit('local','habits',0,{rows:[{id:'a'}]},'first');
 expect(await db.pending('local')).toEqual([]);expect((await db.read('local','habits'))?.data).toEqual({rows:[{id:'a'}]});
 await db.commit(S,'habits',0,{rows:[{id:'b'}]},'account-first');
 await plantOutbox(name,'local','left-by-34');expect((await db.pending('local')).map(p=>p.operation)).toEqual(['left-by-34']);
 await db.commit('local','habits',1,{rows:[{id:'a'},{id:'c'}]},'second');
 expect(await db.pending('local')).toEqual([]);
 expect((await db.pending(S)).map(p=>p.operation)).toEqual(['account-first']);
 expect(JSON.stringify(await rawOutbox(name))).not.toContain('FICTIONAL');
 // Receipts still make a retried local commit idempotent.
 expect(await db.commit('local','habits',1,{rows:[{id:'a'},{id:'c'}]},'second')).toBe(2);expect((await db.read('local','habits'))?.revision).toBe(2);
 db.close();
});
test('B5: the sweep removes only entries of spaces nothing consumes, is idempotent, and leaves an account\'s unacknowledged work',async()=>{
 const name=crypto.randomUUID(),db=new VaultDatabase(name);
 await db.commit(S,'health',0,{rows:[{id:'queued'}]},'unacknowledged');await db.commit('account:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','habits',0,{rows:[]},'other-account');
 for(const op of ['old-1','old-2'])await plantOutbox(name,'local',op);
 const before=await db.pending(S);
 expect(await db.sweepUnconsumed()).toBe(2);expect(await db.sweepUnconsumed()).toBe(0);
 expect(await db.pending('local')).toEqual([]);expect(await db.pending(S)).toEqual(before);
 expect((await rawOutbox(name)).values.map(v=>v.operation).sort()).toEqual(['other-account','unacknowledged']);
 expect((await db.read(S,'health'))?.data).toEqual({rows:[{id:'queued'}]});db.close();
});
test('B5: receipts older than the horizon go, a hundred revisions at a time; a recent retry is still recognised',async()=>{
 const name=crypto.randomUUID(),db=new VaultDatabase(name),total=RECEIPT_HORIZON+RECEIPT_PRUNE_EVERY;
 for(let revision=0;revision<total;revision++)await db.commit('local','settings',revision,{rows:[{id:'n',value:revision}]},`op-${revision+1}`);
 const receipts=await new Promise<{revision:number}[]>((resolve,reject)=>{const open=indexedDB.open(name);open.onsuccess=()=>{const r=open.result.transaction('receipts').objectStore('receipts').getAll();r.onsuccess=()=>{open.result.close();resolve(r.result);};r.onerror=()=>reject(r.error);};});
 expect(receipts).toHaveLength(RECEIPT_HORIZON);expect(Math.min(...receipts.map(r=>r.revision))).toBe(total-RECEIPT_HORIZON+1);
 // The last operation retried is the same commit, not a new revision; a pruned one is a stale base and is refused.
 expect(await db.commit('local','settings',total-1,{rows:[{id:'n',value:total-1}]},`op-${total}`)).toBe(total);
 await expect(db.commit('local','settings',0,{rows:[{id:'n',value:0}]},'op-1')).rejects.toThrow('changed');
 expect((await db.read('local','settings'))?.revision).toBe(total);db.close();
},120_000);
