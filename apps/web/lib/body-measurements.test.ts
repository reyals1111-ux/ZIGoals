import {test,expect} from 'vitest';
import {createEmptyHealth,healthSchema} from './health';
import {saveMeasurement,measurementHistory,exportMeasurementsCsv} from './body-measurements';
const id='health_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',at='2026-09-20T10:00:00Z';
test('measurements retain original unit, exact observed instant and append correction history under one identity',()=>{
 const draft={id,kind:'waist' as const,quantityMilli:32000,unit:'in' as const,observedAt:'2026-09-20T09:30:00+02:00',timezone:'Europe/Brussels',sourceLabel:'Fictional tape'};
 const first=saveMeasurement(createEmptyHealth(),draft,at),record=first.measurements![0]!;
 expect(record).toMatchObject({quantityMilli:32000,unit:'in',canonical:812800,observedAt:'2026-09-20T07:30:00.000Z',corrections:[]});
 const corrected=saveMeasurement(first,{...draft,quantityMilli:31000},'2026-09-21T10:00:00Z');expect(corrected.measurements).toHaveLength(1);expect(corrected.measurements![0]!.corrections[0]).toMatchObject({quantityMilli:32000,unit:'in'});expect(first.measurements![0]).toEqual(record);expect(healthSchema.parse(corrected)).toEqual(corrected);
 expect(()=>saveMeasurement(first,{...draft,unit:'kg'},at)).toThrow();
});
test('multiple real readings per day preserve chronology and sparse trends, CSV has accurate units and safe source text',()=>{
 let data=createEmptyHealth();for(const [n,time]of ['10:00:00','12:00:00'].entries())data=saveMeasurement(data,{id:id.slice(0,-1)+n,kind:'weight',quantityMilli:150000+n*1000,unit:'lb',observedAt:'2026-09-20T'+time+'Z',timezone:'UTC',sourceLabel:'=untrusted formula'},at);
 const history=measurementHistory(data,'weight');expect(history.readings).toHaveLength(2);expect(history.readings[0]!.canonical).toBe(68038856);expect(history.change).toBe(453592);expect(measurementHistory({...data,measurements:data.measurements!.slice(0,1)},'weight').change).toBeNull();const csv=exportMeasurementsCsv(data);expect(csv).toContain("'=untrusted formula");expect(csv).toContain('"lb"');expect(csv).toContain('"mg"');expect(csv).toContain('2026-09-20T12:00:00.000Z');
});
