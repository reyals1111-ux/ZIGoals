import {beforeEach,expect,test,vi} from 'vitest';
import {z} from 'zod';
import {importPrivateStore} from './private-storage';

// Restoring a module backup keeps a ":recovery:" copy of the old bytes, then replaces the module.
// When the browser refuses the replacement (a full quota), nothing may change: no orphan copy
// that would eat the remaining space and make the next attempt fail too.
const schema=z.object({schemaVersion:z.literal(1),kind:z.literal('test'),count:z.number().int().nonnegative()}).strict();
const key='zigoals:habits:v1',old=JSON.stringify({schemaVersion:1,kind:'test',count:1}),incoming=JSON.stringify({schemaVersion:1,kind:'test',count:2});
function storage(refuse:(key:string,value:string)=>boolean){const m=new Map<string,string>([[key,old]]);return {map:m,get length(){return m.size;},key:(i:number)=>[...m.keys()][i]??null,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{if(refuse(k,v))throw new DOMException('The quota has been exceeded.','QuotaExceededError');m.set(k,String(v));},removeItem:(k:string)=>{m.delete(k);},clear:()=>m.clear()};}
beforeEach(()=>{vi.stubGlobal('navigator',{locks:{request:async(_key:string,work:()=>unknown)=>work()}});});

test('a refused replacement leaves the module and the storage exactly as they were',async()=>{
 const s=storage((k,v)=>k===key&&v!==old);
 await expect(importPrivateStore(s as Storage,key,schema,incoming)).rejects.toThrow(/quota/i);
 expect([...s.map.entries()]).toEqual([[key,old]]);
});
test('a refused recovery copy leaves everything unchanged',async()=>{
 const s=storage(k=>k.includes(':recovery:'));
 await expect(importPrivateStore(s as Storage,key,schema,incoming)).rejects.toThrow(/quota/i);
 expect([...s.map.entries()]).toEqual([[key,old]]);
});
test('a successful import still keeps one recovery copy of the old bytes',async()=>{
 const s=storage(()=>false);
 await importPrivateStore(s as Storage,key,schema,incoming);
 expect(s.map.get(key)).toBe(incoming);
 expect([...s.map.entries()].filter(([k])=>k.startsWith(`${key}:recovery:`)).map(([,v])=>v)).toEqual([old]);
});
