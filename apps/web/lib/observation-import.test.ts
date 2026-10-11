import {test,expect} from 'vitest';
import {createEmptyHealth} from './health';
import {saveMeasurement} from './body-measurements';
import {importObservations} from './observation-import';
import {validateData} from './vault/account-data';
import {mergePrivateData} from './vault/cloud-sync';
import {measurementHistory,exportMeasurementsCsv,latestWeightObservation,measurementGroupFingerprint} from './body-measurements';
const at='2026-09-26T10:00:00.000Z',value={kind:'weight' as const,quantityMilli:80000,unit:'kg' as const,observedAt:at,timezone:'UTC',sourceLabel:'Fictional scale'},file={format:'zigoals-observations',version:1,provider:'Fictional export',observations:[{...value,sourceId:'stable-1'}]};
test('normalized file consumer deduplicates reviewed manual overlap and replay, preserving original source',()=>{
 const manual=saveMeasurement(createEmptyHealth(),{...value,id:'health_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'},at),imported=importObservations(manual,file,at);expect(imported).toMatchObject({added:0,linked:1,duplicates:0});expect(imported.data.measurements).toHaveLength(1);expect(imported.data.measurements![0]!.source).toBe('MANUAL');expect(importObservations(imported.data,file,at)).toMatchObject({added:0,linked:0,duplicates:1});validateData({health:JSON.stringify(imported.data)},{health:JSON.stringify(manual)});
 const corrected=saveMeasurement(imported.data,{...value,quantityMilli:79000,id:manual.measurements![0]!.id},at);expect(importObservations(corrected,file,at).duplicates).toBe(1);expect(corrected.measurements![0]!.canonical).toBe(79000000);
});
test('new observations use the real consumer; source-ID conflicts and oversized batches fail atomically',()=>{
 const first=importObservations(createEmptyHealth(),file,at);expect(first.added).toBe(1);expect(first.data.measurements![0]!.source).toBe('FILE_IMPORT');expect(()=>importObservations(first.data,{...file,observations:[{...value,quantityMilli:81000,sourceId:'stable-1'}]},at)).toThrow('conflicting');expect(()=>importObservations(first.data,{...file,observations:Array.from({length:101},(_,i)=>({...value,sourceId:String(i)}))},at)).toThrow();expect(first.data.measurements![0]!.quantityMilli).toBe(80000);
});
const wrap=(data:unknown)=>({health:JSON.stringify(data)});
function independentCopies(different=false){const empty=createEmptyHealth(),a=importObservations(empty,file,at).data,b=importObservations(empty,different?{...file,observations:[{...file.observations[0]!,quantityMilli:81000}]}:file,'2026-09-26T11:00:00.000Z').data;return {a,b,merged:JSON.parse(mergePrivateData(wrap(empty),wrap(a),wrap(b)).health!)};}
test('independent same-source imports count once, retain both originals and replay without duplication',()=>{
 const {a,b,merged}=independentCopies();expect(merged.measurements).toHaveLength(2);validateData(wrap(merged),wrap(a));validateData(wrap(merged),wrap(b));
 expect(measurementHistory(merged,'weight').readings).toHaveLength(1);expect(measurementHistory(merged,'weight').change).toBeNull();
 const replay=importObservations(merged,file,'2026-09-26T12:00:00.000Z');expect(replay.duplicates).toBe(1);expect(replay.data).toEqual(merged);
 const csv=exportMeasurementsCsv(merged);expect(csv).toContain('duplicate_of');for(const row of merged.measurements)expect(csv).toContain(row.id);
});
test('one reviewed correction updates compatible retained copies atomically and preserves every original timestamp',()=>{
 const {merged}=independentCopies(),canonical=measurementHistory(merged,'weight').readings[0]!;
 const corrected=saveMeasurement(merged,{...value,id:canonical.id,quantityMilli:79000},'2026-09-26T12:00:00.000Z');validateData(wrap(corrected),wrap(merged));
 expect(measurementHistory(corrected,'weight').readings).toHaveLength(1);expect(corrected.measurements!.map(r=>r.quantityMilli)).toEqual([79000,79000]);
 for(const row of merged.measurements)expect(corrected.measurements!.find(r=>r.id===row.id)!.corrections).toEqual(expect.arrayContaining([expect.objectContaining({recordedAt:row.recordedAt,quantityMilli:80000})]));
});
test('conflicting source identity or divergent offline correction stays visible but never enters a trend or latest weight',()=>{
 const {merged}=independentCopies(true);expect(measurementHistory(merged,'weight').readings).toEqual([]);expect(latestWeightObservation(merged,'2026-09-26')).toBeUndefined();
 expect(()=>importObservations(merged,file,at)).toThrow('conflicting');expect(()=>saveMeasurement(merged,{...value,id:merged.measurements[0].id,quantityMilli:79000},at)).toThrow('conflicting');
 const copies=independentCopies(),one=saveMeasurement(copies.a,{...value,id:copies.a.measurements![0]!.id,quantityMilli:79000},at),divergent={...copies.merged,measurements:[...one.measurements!,...copies.b.measurements!]};
 expect(measurementHistory(divergent,'weight').readings).toEqual([]);expect(exportMeasurementsCsv(divergent)).toContain('unresolved');
 const group=measurementHistory(divergent,'weight').unresolved[0]!,review=measurementGroupFingerprint(group);
 expect(()=>saveMeasurement(divergent,{...value,id:group.id,quantityMilli:78000},at)).toThrow('Review all');
 const corrected=saveMeasurement(divergent,{...value,id:group.id,quantityMilli:78000},'2026-09-26T12:00:00.000Z',review);validateData(wrap(corrected),wrap(divergent));
 expect(measurementHistory(corrected,'weight').readings).toHaveLength(1);expect(measurementHistory(corrected,'weight').unresolved).toEqual([]);
 expect(()=>saveMeasurement(corrected,{...value,id:group.id,quantityMilli:77000},at,review)).toThrow('changed after review');
});
test('measurement UI discloses retained copies and provides explicit review for differing values',async()=>{
 const {createElement}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{BodyMeasurements}=await import('../components/health/body-measurements');
 const copies=independentCopies(),perform=async()=>{};
 expect(renderToStaticMarkup(createElement(BodyMeasurements,{data:copies.merged,perform}))).toContain('retained copies count as one reading');
 const corrected=saveMeasurement(copies.a,{...value,id:copies.a.measurements![0]!.id,quantityMilli:79000},at),divergent={...copies.merged,measurements:[...corrected.measurements!,...copies.b.measurements!]};
 const html=renderToStaticMarkup(createElement(BodyMeasurements,{data:divergent,perform}));expect(html).toContain('excluded from charts');expect(html).toContain('Review this reading for all copies');
 const sourceConflict=renderToStaticMarkup(createElement(BodyMeasurements,{data:independentCopies(true).merged,perform}));expect(sourceConflict).toContain('new source ID');expect(sourceConflict).not.toContain('Review this reading for all copies');
});
