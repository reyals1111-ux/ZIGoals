import 'fake-indexeddb/auto';
import {expect,test} from 'vitest';
import {VaultDatabase} from './database';
test('atomic data/outbox survives reopen and rejects stale financial revision',async()=>{
 const name=crypto.randomUUID(),db=new VaultDatabase(name);await db.commit('local','finance',0,{schemaVersion:4,goals:[{id:'1',target:'200000'}]},'op1');
 const reopened=new VaultDatabase(name);expect((await reopened.read('local','finance'))?.data).toEqual({schemaVersion:4,goals:[{id:'1',target:'200000'}]});
 expect(await reopened.pending('local')).toHaveLength(1);
 await expect(reopened.commit('local','finance',0,{goals:[]},'op2')).rejects.toThrow('changed');
 expect((await reopened.read('local','finance'))?.revision).toBe(1);expect(await reopened.pending('local')).toHaveLength(1);
 db.close();reopened.close();
});
test('replay is idempotent, reused operation is rejected, changed record delta is bounded',async()=>{
 const db=new VaultDatabase(crypto.randomUUID()),data={rows:Array.from({length:300},(_,i)=>({id:String(i),value:'a'.repeat(8000)}))};
 await db.commit('A','health',0,data,'first');await db.acknowledge('A','first');
 const next={rows:data.rows.map((x,i)=>i===2?{...x,value:'new'}:x)};
 await db.commit('A','health',1,next,'second');await db.commit('A','health',1,next,'second');
 const pending=await db.pending('A');expect(pending).toHaveLength(1);expect(JSON.stringify(pending).length).toBeLessThan(30_000);
 await expect(db.commit('A','health',1,{rows:[]},'second')).rejects.toThrow('reused');
 expect((await db.read('B','health'))).toBeNull();expect((await db.page('A','health','rows',290,20))).toHaveLength(10);db.close();
});
test('migration preserves exact original bytes and invalid large record never partially commits',async()=>{
 const db=new VaultDatabase(crypto.randomUUID()),raw=' {"schemaVersion":1,"rows":[]} ';
 await db.commit('local','health',0,JSON.parse(raw),'migration',raw);
 expect(await db.recovery('local','health')).toEqual([raw]);
 await expect(db.commit('local','health',1,{rows:[{id:'bad',value:'x'.repeat(300000)}]},'bad')).rejects.toThrow('record');
 expect((await db.read('local','health'))?.data).toEqual(JSON.parse(raw));expect(await db.pending('local')).toHaveLength(1);db.close();
});
test('caller mutation during async hashing cannot change the committed operation',async()=>{
 const db=new VaultDatabase(crypto.randomUUID()),data={rows:[{id:'a',value:'original'}]};
 const saving=db.commit('local','health',0,data,'stable');data.rows[0]!.value='mutated';await saving;
 expect((await db.read('local','health'))?.data).toEqual({rows:[{id:'a',value:'original'}]});db.close();
});
