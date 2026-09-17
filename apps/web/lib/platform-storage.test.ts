import { it, expect, vi } from 'vitest';
import { migratePlatform, platformSchema, PLATFORM_KEY, emptyPlatform } from './positions';
import { readPrivateStore, updatePrivateStore } from './private-storage';
it('additive migration preserves all legacy stores and rejects future platform state',async()=>{
 vi.stubGlobal('navigator',{locks:{request:async(_key:string,action:()=>unknown)=>action()}});
 const bytes=new Map<string,string>([['zigoals:health:v1','unchanged'],['zigoals:habits:v1','unchanged'],['legacy-goals','unchanged']]);
 const storage={getItem:(key:string)=>bytes.get(key)??null,setItem:(key:string,value:string)=>bytes.set(key,value)} as unknown as Storage;
 expect(migratePlatform(null)).toEqual(emptyPlatform());
 expect(()=>migratePlatform({schemaVersion:2})).toThrow();
 expect(readPrivateStore(storage,PLATFORM_KEY,platformSchema,emptyPlatform)).toEqual(emptyPlatform());
 await updatePrivateStore(storage,PLATFORM_KEY,platformSchema,emptyPlatform,s=>s);
 expect(bytes.get('zigoals:health:v1')).toBe('unchanged');expect(bytes.get('legacy-goals')).toBe('unchanged');
 storage.setItem(PLATFORM_KEY,'{"schemaVersion":999}');
 await expect(updatePrivateStore(storage,PLATFORM_KEY,platformSchema,emptyPlatform,s=>s)).rejects.toThrow();
 expect(bytes.get(PLATFORM_KEY)).toBe('{"schemaVersion":999}');
});
it('preserves exact pre-migration bytes before the first versioned write',async()=>{
 const {z}=await import('zod');
 const schema=z.union([z.object({schemaVersion:z.literal(1),value:z.string()}),z.object({schemaVersion:z.literal(2),value:z.string()})]).transform(d=>({...d,schemaVersion:2 as const}));
 vi.stubGlobal('navigator',{locks:{request:async(_key:string,action:()=>unknown)=>action()}});
 const original='{"schemaVersion":1, "value":"history"}';
 const bytes=new Map<string,string>([['zigoals:habits:v1',original]]);
 const storage={getItem:(key:string)=>bytes.get(key)??null,setItem:(key:string,value:string)=>{bytes.set(key,value);}} as unknown as Storage;
 await updatePrivateStore(storage,'zigoals:habits:v1',schema,()=>({schemaVersion:2 as const,value:''}),s=>({...s,value:'edited'}));
 expect([...bytes.entries()].some(([key,value])=>key.includes(':recovery:')&&value===original)).toBe(true);
});
