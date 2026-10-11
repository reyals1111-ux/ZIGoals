import {expect,test} from 'vitest';
import {readDeviceRecord,updateDeviceRecord} from './device-record';
import {W_DEVICE_RECORDS,W_DISPLAY_RECORDS,W_PERSONAL_RECORDS} from './w-device-records';
import {W_DISPLAY_KEYS,W_PERSONAL_KEYS} from './w-device-keys';
import {DEVICE_RECORD_KEYS,NON_PERSONAL_KEYS,noExistingData} from './onboarding';
import {DEVICE_KEYS,EVERYTHING_KEYS} from './export/everything';
import {MODULE_KEYS} from './export/everything';

// Session W ([TIER 3] (storage keys)): the nine new device keys follow features/README rules 1–8 (lib/device-record.ts).
function storage(initial:Record<string,string>={}){
 const map=new Map(Object.entries(initial)),writes:string[]=[];
 return {getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{writes.push(k);map.set(k,v);},removeItem:(k:string)=>{map.delete(k);},map,writes,get length(){return map.size;},key:(i:number)=>[...map.keys()][i]??null};
}

test('nine keys, named like every ZIGoals key, each once; the keys module names exactly these',()=>{
 const keys=W_DEVICE_RECORDS.map(r=>r.key);
 expect(keys).toHaveLength(9);expect(new Set(keys).size).toBe(9);
 for(const key of keys)expect(key).toMatch(/^zigoals:[a-z-]+:v1$/);
 expect(W_PERSONAL_RECORDS.map(r=>r.key)).toEqual(W_PERSONAL_KEYS);expect(W_DISPLAY_RECORDS.map(r=>r.key)).toEqual(W_DISPLAY_KEYS);
 // None reuses a module key or an earlier device key.
 for(const key of keys)expect(Object.values(MODULE_KEYS)).not.toContain(key);
});
test('every record: missing reads empty, garbage and version 2 read empty and are never rewritten by a read, a write validates first',()=>{
 for(const spec of W_DEVICE_RECORDS){
  const s=storage();
  expect(readDeviceRecord(s,spec),spec.key).toEqual({data:spec.empty(),unreadable:false});
  s.map.set(spec.key,'{not json');expect(readDeviceRecord(s,spec),spec.key).toEqual({data:spec.empty(),unreadable:true});
  s.map.set(spec.key,JSON.stringify({version:2}));expect(readDeviceRecord(s,spec).unreadable,spec.key).toBe(true);
  expect(s.writes,spec.key).toEqual([]);expect(s.map.get(spec.key)).toBe(JSON.stringify({version:2}));
  const clean=storage();
  expect(()=>updateDeviceRecord(clean,spec,current=>({...current,version:3} as never)),spec.key).toThrow();
  expect(clean.writes,spec.key).toEqual([]);
  // The empty record is valid and round-trips.
  const written=storage();updateDeviceRecord(written,spec,current=>current);expect(readDeviceRecord(written,spec),spec.key).toEqual({data:spec.empty(),unreadable:false});
 }
});
test('the welcome check: a personal key means the device is not new; the two display preferences do not',()=>{
 for(const key of W_PERSONAL_KEYS){expect(DEVICE_RECORD_KEYS,key).toContain(key);expect(NON_PERSONAL_KEYS,key).not.toContain(key);expect(noExistingData(storage({[key]:'{}'})),key).toBe(false);}
 for(const key of W_DISPLAY_KEYS){expect(NON_PERSONAL_KEYS,key).toContain(key);expect(DEVICE_RECORD_KEYS,key).not.toContain(key);}
 expect(noExistingData(storage(Object.fromEntries(W_DISPLAY_KEYS.map(k=>[k,'{}']))))).toBe(true);
});
test('every key is in "Export everything"',()=>{
 for(const spec of W_DEVICE_RECORDS){expect(EVERYTHING_KEYS,spec.key).toContain(spec.key);expect(Object.values(DEVICE_KEYS),spec.key).toContain(spec.key);}
});
test('no record names a secret or a token',()=>{
 for(const spec of W_DEVICE_RECORDS)expect(JSON.stringify(Object.keys((spec.schema as unknown as {shape?:object}).shape??{})),spec.key).not.toMatch(/key|secret|token|password|seed|mnemonic|address/i);
});
