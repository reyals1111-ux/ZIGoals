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
// An open request that never fires success, error or blocked: Safari's first-open hang, or an open queued behind
// another tab's upgrade or deletion that does not finish. Every read, and every writer holding a storage lock,
// waits on the one cached connection promise.
type Held={onsuccess:null|((e:Event)=>void);onerror:null|((e:Event)=>void);onblocked:null|((e:Event)=>void);onupgradeneeded:null|((e:Event)=>void);result?:IDBDatabase;transaction:IDBTransaction|null};
function holdOpens(name:string,count:number){
 const open=indexedDB.open.bind(indexedDB),held:Held[]=[];
 const spy=vi.spyOn(indexedDB,'open').mockImplementation((target,version)=>{
  if(target!==name||held.length>=count)return open(target,version);
  const request:Held={onsuccess:null,onerror:null,onblocked:null,onupgradeneeded:null,transaction:null};held.push(request);return request as unknown as IDBOpenDBRequest;
 });
 return {held,spy,succeed:async(index:number)=>{const request=held[index]!;request.result=await nativeOpen(name,1);request.onsuccess!(new Event('success'));return request.result;}};
}
test('retry starts one more open for a stalled connection; waiting reads and writes finish on it',async()=>{
 const name=crypto.randomUUID(),seed=new VaultDatabase(name);await seed.commit('local','settings',0,{rows:[{id:'kept'}]},'first');seed.close();
 const db=new VaultDatabase(name),stall=holdOpens(name,1);
 try{
  let settled=false;const reading=db.read('local','settings').finally(()=>{settled=true;});const writing=db.commit('local','settings',1,{rows:[{id:'kept'},{id:'added'}]},'second');
  await new Promise(resolve=>setTimeout(resolve,50));expect(settled).toBe(false);expect(stall.held).toHaveLength(1);
  db.retryOpen();
  expect((await reading)?.data).toEqual({rows:[{id:'kept'}]});expect(await writing).toBe(2);
  expect((await db.read('local','settings'))?.data).toEqual({rows:[{id:'kept'},{id:'added'}]});
  expect(stall.spy.mock.calls.filter(([target])=>target===name)).toHaveLength(2);
  db.retryOpen();await db.read('local','settings');expect(stall.spy.mock.calls.filter(([target])=>target===name)).toHaveLength(2);
 }finally{stall.spy.mockRestore();db.close();}
});
test('a stalled open that succeeds late is used, and the extra retry connection is closed',async()=>{
 const name=crypto.randomUUID(),seed=new VaultDatabase(name);await seed.commit('local','health',0,{rows:[{id:'late'}]},'first');seed.close();
 const db=new VaultDatabase(name),stall=holdOpens(name,2);
 try{
  const reading=db.read('local','health');await new Promise(resolve=>setTimeout(resolve,20));db.retryOpen();expect(stall.held).toHaveLength(2);
  const original=await stall.succeed(0);expect((await reading)?.data).toEqual({rows:[{id:'late'}]});
  const extra=await stall.succeed(1);
  expect(()=>extra.transaction('headers','readonly')).toThrow();
  expect(()=>original.transaction('headers','readonly')).not.toThrow();
 }finally{stall.spy.mockRestore();db.close();}
});
test('a connection the browser closes (storage eviction, cleared site data) is reopened by the next read',async()=>{
 const name=crypto.randomUUID(),db=new VaultDatabase(name);await db.commit('local','habits',0,{rows:[{id:'evicted'}]},'first');
 const open=indexedDB.open.bind(indexedDB),connections:IDBDatabase[]=[];
 const spy=vi.spyOn(indexedDB,'open').mockImplementation((target,version)=>{const request=open(target,version);request.addEventListener('success',()=>connections.push(request.result));return request;});
 try{
  db.close();await db.read('local','habits');expect(connections).toHaveLength(1);
  // A forced close fires "close" on the connection; an explicit close() never does. fake-indexeddb cannot
  // force-close, so close it and deliver the event to the handler the browser would call.
  const evicted=connections[0]!;evicted.close();evicted.onclose?.call(evicted,new Event('close'));
  expect((await db.read('local','habits'))?.data).toEqual({rows:[{id:'evicted'}]});expect(connections).toHaveLength(2);
  // Before the close event arrives, transaction() throws InvalidStateError; the read reopens once.
  connections[1]!.close();
  expect((await db.read('local','habits'))?.data).toEqual({rows:[{id:'evicted'}]});expect(connections).toHaveLength(3);
 }finally{spy.mockRestore();db.close();}
});
