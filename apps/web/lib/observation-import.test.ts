import {test,expect} from 'vitest';
import {createEmptyHealth} from './health';
import {saveMeasurement} from './body-measurements';
import {importObservations} from './observation-import';
import {validateData} from './vault/account-data';
const at='2026-09-26T10:00:00.000Z',value={kind:'weight' as const,quantityMilli:80000,unit:'kg' as const,observedAt:at,timezone:'UTC',sourceLabel:'Fictional scale'},file={format:'zigoals-observations',version:1,provider:'Fictional export',observations:[{...value,sourceId:'stable-1'}]};
test('normalized file consumer deduplicates reviewed manual overlap and replay, preserving original source',()=>{
 const manual=saveMeasurement(createEmptyHealth(),{...value,id:'health_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},at),imported=importObservations(manual,file,at);expect(imported).toMatchObject({added:0,linked:1,duplicates:0});expect(imported.data.measurements).toHaveLength(1);expect(imported.data.measurements![0]!.source).toBe('MANUAL');expect(importObservations(imported.data,file,at)).toMatchObject({added:0,linked:0,duplicates:1});validateData({health:JSON.stringify(imported.data)},{health:JSON.stringify(manual)});
 const corrected=saveMeasurement(imported.data,{...value,quantityMilli:79000,id:manual.measurements![0]!.id},at);expect(importObservations(corrected,file,at).duplicates).toBe(1);expect(corrected.measurements![0]!.canonical).toBe(79000000);
});
test('new observations use the real consumer; source-ID conflicts and oversized batches fail atomically',()=>{
 const first=importObservations(createEmptyHealth(),file,at);expect(first.added).toBe(1);expect(first.data.measurements![0]!.source).toBe('FILE_IMPORT');expect(()=>importObservations(first.data,{...file,observations:[{...value,quantityMilli:81000,sourceId:'stable-1'}]},at)).toThrow('conflicting');expect(()=>importObservations(first.data,{...file,observations:Array.from({length:101},(_,i)=>({...value,sourceId:String(i)}))},at)).toThrow();expect(first.data.measurements![0]!.quantityMilli).toBe(80000);
});
