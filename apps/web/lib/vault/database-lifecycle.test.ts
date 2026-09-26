import 'fake-indexeddb/auto';
import {test,expect,vi} from 'vitest';
import {VaultDatabase} from './database';
const stores=['headers','records','outbox','receipts','recovery'];
function nativeOpen(name:string,version:number){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>{for(const s of stores)if(!r.result.objectStoreNames.contains(s))r.result.createObjectStore(s);};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
test('blocked upgrade can retry on the same adapter after the older connection closes',async()=>{
 const name=crypto.randomUUID(),db=new VaultDatabase(name);await db.commit('local','health',0,{rows:[{id:'retained'}]},'accepted',' exact original ');db.close();
 const blocker=await nativeOpen(name,1);blocker.onversionchange=()=>{};
 // Exercise a real IndexedDB version upgrade while keeping production's schema version unchanged.
 const open=indexedDB.open.bind(indexedDB),spy=vi.spyOn(indexedDB,'open').mockImplementation((target,version)=>open(target,target===name?2:version));
 try{await expect(db.read('local','health')).rejects.toThrow('Close older');blocker.close();expect((await db.read('local','health'))?.data).toEqual({rows:[{id:'retained'}]});expect(await db.pending('local')).toHaveLength(1);expect(await db.recovery('local','health')).toEqual([' exact original ']);}
 finally{spy.mockRestore();blocker.close();db.close();}
});
test('versionchange closes the old connection and refuses downgrade without modifying records or outbox',async()=>{
 const name=crypto.randomUUID(),db=new VaultDatabase(name);await db.commit('local','finance',0,{rows:[{id:'evidence'}]},'accepted');
 const newer=await nativeOpen(name,2);try{await expect(db.read('local','finance')).rejects.toThrow('unavailable');await expect(db.commit('local','finance',1,{rows:[]})).rejects.toThrow('unavailable');const tx=newer.transaction(['headers','records','outbox'],'readonly');const read=(r:IDBRequest)=>new Promise(resolve=>{r.onsuccess=()=>resolve(r.result);});expect(await read(tx.objectStore('records').getAll())).toEqual([{id:'evidence'}]);expect((await read(tx.objectStore('outbox').getAll()) as unknown[])).toHaveLength(1);}
 finally{newer.close();db.close();}
});
