import {test,expect} from 'vitest';
import {createVault,unlockVault} from './crypto';
import {pullVault,reconcile,prepareOperation,SyncConflict,type Snapshot,type PlainRecord} from './sync';
const id='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const record=(value:number,rid=id):PlainRecord=>({id:rid,domain:'finance',value:{amount:String(value)},deleted:false});
test('independent unlocked clients preserve exact records, ciphertext, tombstones and revision watermark',async()=>{
 const v=await createVault(),key2=await unlockVault(v.manifest,v.recovery),empty:Snapshot={revision:0,manifest:v.manifest,rows:[],records:[]};
 const operation=await prepareOperation(v.key,empty,[record(123456789)]);expect(JSON.stringify(operation)).not.toContain('123456789');
 const page={protocol:1,revision:1,manifest:v.manifest,records:operation!.changes,cursor:null};
 const remote=await pullVault({read:async()=>page,write:async()=>({revision:1})},key2,v.manifest);expect(remote.records).toEqual([record(123456789)]);
 expect(await prepareOperation(key2,remote,remote.records)).toBeNull();
 await expect(pullVault({read:async()=>page,write:async()=>({revision:1})},key2,v.manifest,2)).rejects.toThrow('Older server');
 const op2=await prepareOperation(key2,remote,[{...record(123456789),deleted:true}]);expect(op2!.changes[0]!.revision).toBe(2);
 await expect(prepareOperation(key2,remote,[])).rejects.toThrow('tombstone');
 await expect(pullVault({read:async()=>({...page,records:[{...operation!.changes[0],deleted:true}]}),write:async()=>({revision:1})},key2,v.manifest)).rejects.toThrow('integrity');
});
test('different records merge; concurrent financial edit, delete/edit and missing tombstones stop without mutation',()=>{
 const base=[record(1)],local=[record(2)],remote=[record(1),record(3,other)];expect(reconcile(base,local,remote)).toEqual([record(2),record(3,other)]);
 expect(()=>reconcile(base,local,[record(4)])).toThrow(SyncConflict);
 expect(()=>reconcile(base,[{...record(1),deleted:true}],local)).toThrow(SyncConflict);
 expect(()=>reconcile(base,[],base)).toThrow(SyncConflict);expect(base).toEqual([record(1)]);
});
test('pagination must be revision-consistent and atomically within capacity',async()=>{
 const v=await createVault();let calls=0;
 await expect(pullVault({read:async()=>({protocol:1,revision:++calls,manifest:v.manifest,records:[],cursor:calls===1?'record:'+id:null}),write:async()=>({revision:1})},v.key,v.manifest)).rejects.toThrow('changed while downloading');
 const empty:Snapshot={revision:0,manifest:v.manifest,rows:[],records:[]};
 await expect(prepareOperation(v.key,empty,Array.from({length:101},()=>record(1,crypto.randomUUID())))).rejects.toThrow('capacity');
});
