import 'fake-indexeddb/auto';
import {expect,test,vi} from 'vitest';
import {z} from 'zod';
import {VaultDatabase} from './database';
import {enableDurableStore,readDurableStore,updateDurableStore,isDurableMarker} from './local';
const schema=z.object({schemaVersion:z.literal(1),rows:z.array(z.object({id:z.string(),value:z.string()}))});
function storage(){const m=new Map<string,string>();return {get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v);},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()} as Storage;}
test('explicit migration retains original; old readers fail; reopen and transactional edit work',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_k:string,f:()=>unknown)=>f()}});
 const s=storage(),key='zigoals:health:v1',raw=' {"schemaVersion":1,"rows":[{"id":"a","value":"before"}]} ';s.setItem(key,raw);
 const db=new VaultDatabase(crypto.randomUUID());await enableDurableStore(s,key,schema,()=>({schemaVersion:1 as const,rows:[]}),db);
 expect(isDurableMarker(s.getItem(key))).toBe(true);expect(schema.safeParse(JSON.parse(s.getItem(key)!)).success).toBe(false);
 expect(await db.recovery('local',key)).toEqual([raw]);
 await updateDurableStore(s,key,schema,x=>({...x,rows:[...x.rows,{id:'b',value:'after'}]}),db);
 expect((await readDurableStore(s,key,schema,db)).rows).toHaveLength(2);db.close();vi.unstubAllGlobals();
});
test('invalid source and failed pointer publication preserve original; retry resumes safely',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_k:string,f:()=>unknown)=>f()}});
 const s=storage(),key='zigoals:health:v1',db=new VaultDatabase(crypto.randomUUID());s.setItem(key,'bad');
 await expect(enableDurableStore(s,key,schema,()=>({schemaVersion:1 as const,rows:[]}),db)).rejects.toThrow();expect(s.getItem(key)).toBe('bad');
 const raw='{"schemaVersion":1,"rows":[]}';s.setItem(key,raw);const set=s.setItem;s.setItem=()=>{throw Error('quota');};
 await expect(enableDurableStore(s,key,schema,()=>({schemaVersion:1 as const,rows:[]}),db)).rejects.toThrow();expect(s.getItem(key)).toBe(raw);s.setItem=set;
 await enableDurableStore(s,key,schema,()=>({schemaVersion:1 as const,rows:[]}),db);expect((await readDurableStore(s,key,schema,db)).rows).toEqual([]);db.close();vi.unstubAllGlobals();
});
test('Showcase pointer spoof cannot access the real durable store',async()=>{
 const {activateShowcase,getAppStorage}=await import('../showcase-storage');const session=storage();const real=storage();
 vi.stubGlobal('window',{sessionStorage:session,localStorage:real});activateShowcase(session,'2026-09-23',{},'test');
 const scoped=getAppStorage();await expect(enableDurableStore(scoped,'zigoals:health:v1',schema,()=>({schemaVersion:1 as const,rows:[]}))).rejects.toThrow('Showcase');vi.unstubAllGlobals();
});
