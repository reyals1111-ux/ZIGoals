import 'fake-indexeddb/auto';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {createHabit,emptyHabitData,habitDataSchema,HABITS_KEY} from '../habits';
import {VaultDatabase} from './database';
import {enableDurableStore,readDurableStore,updateDurableStore} from './local';

/**
 * Session Y Part 5, B5 (ADR-018 Y23), found by CI's private-read-delay specs: the sweep of outbox entries nothing will
 * consume never runs on a read (viewing a page writes nothing; the read-only look opens no read-write transaction), and
 * runs after the person's first write on the page, removing an earlier build's Local Demo entry.
 */
function storage(){const m=new Map<string,string>();return {getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear(),key:(i:number)=>[...m.keys()][i]??null,get length(){return m.size;}} as Storage;}
const name=`sweep-${crypto.randomUUID()}`;
function raw<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>IDBRequest<T>){return new Promise<T>((resolve,reject)=>{const open=indexedDB.open(name);open.onsuccess=()=>{const db=open.result,tx=db.transaction('outbox',mode),r=work(tx.objectStore('outbox'));tx.oncomplete=()=>{db.close();resolve(r.result);};tx.onerror=()=>reject(tx.error);};open.onerror=()=>reject(open.error);});}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_k:string,work:()=>unknown)=>work()}});});
afterEach(()=>{vi.unstubAllGlobals();});

test('B5: a read leaves an earlier build\'s Local Demo outbox entry; the first write on the page removes it',async()=>{
 const s=storage(),db=new VaultDatabase(name),data=createHabit({...emptyHabitData(),timeZone:'Europe/Brussels'},{title:'Fictional stretch',category:'Personal',description:'',notes:'',schedule:{kind:'daily'},target:1},new Date('2026-09-23T12:00:00Z'),'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
 try{
  s.setItem(HABITS_KEY,JSON.stringify(data));await enableDurableStore(s,HABITS_KEY,habitDataSchema,emptyHabitData,db);
  const orphan=JSON.stringify(['local','earlier-build-operation']);
  await raw('readwrite',store=>store.put({space:'local',domain:HABITS_KEY,operation:'earlier-build-operation',base:0,revision:1,changes:[],header:{}},orphan));
  expect(await raw('readonly',store=>store.getAllKeys())).toEqual([orphan]);
  expect(await readDurableStore(s,HABITS_KEY,habitDataSchema,db)).toEqual(data);
  await new Promise(resolve=>setTimeout(resolve,20));
  expect(await raw('readonly',store=>store.getAllKeys())).toEqual([orphan]);
  await updateDurableStore(s,HABITS_KEY,habitDataSchema,value=>({...value,timeZone:'Europe/Paris'}),db);
  await expect.poll(()=>raw('readonly',store=>store.getAllKeys())).toEqual([]);
  expect((await readDurableStore(s,HABITS_KEY,habitDataSchema,db)).timeZone).toBe('Europe/Paris');
 }finally{db.close();}
});
