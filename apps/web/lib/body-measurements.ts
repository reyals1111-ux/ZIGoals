import {healthSchema,type HealthData} from './health';
import {bodyMeasurementSchema,measurementValueSchema,canonicalMeasurement,type MeasurementDraft,type BodyMeasurement} from './body-measurement-schema';
export function saveMeasurement(data:HealthData,draft:MeasurementDraft,recordedAt:string):HealthData{
 const {id,...values}=draft,v=measurementValueSchema.parse(values);
 const canonical=canonicalMeasurement(v.quantityMilli,v.unit);
 const prior=data.measurements?.find(r=>r.id===id),corrections=prior?[...prior.corrections,measurementValueSchema.safeExtend({canonical:bodyMeasurementSchema.shape.canonical,recordedAt:bodyMeasurementSchema.shape.recordedAt}).parse({kind:prior.kind,quantityMilli:prior.quantityMilli,unit:prior.unit,observedAt:prior.observedAt,timezone:prior.timezone,sourceLabel:prior.sourceLabel,canonical:prior.canonical,recordedAt:prior.recordedAt})]:[];
 const next=bodyMeasurementSchema.parse({...v,id,observedAt:new Date(v.observedAt).toISOString(),canonical,source:'MANUAL',createdAt:prior?.createdAt??recordedAt,recordedAt,corrections});
 return healthSchema.parse({...data,measurements:[...(data.measurements??[]).filter(r=>r.id!==id),next]});
}
export function measurementHistory(data:HealthData,kind:BodyMeasurement['kind']){
 const readings=(data.measurements??[]).filter(r=>r.kind===kind).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)||a.id.localeCompare(b.id));
 return {readings,change:readings.length>1?readings.at(-1)!.canonical-readings[0]!.canonical:null};
}
export function exportMeasurementsCsv(data:HealthData){
 const rows:(string|number)[][]=[['id','kind','observed_at_utc','entered_timezone','value','original_unit','canonical_value','canonical_unit','source','recorded_at','record_version']];
 for(const r of [...(data.measurements??[])].sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)||a.id.localeCompare(b.id)))for(const [index,v]of [...r.corrections,r].entries())rows.push([r.id,v.kind,v.observedAt,v.timezone,v.quantityMilli/1000,v.unit,v.canonical,v.kind==='weight'?'mg':'um',v.sourceLabel,v.recordedAt,index===r.corrections.length?'current':'previous-'+(index+1)]);
 return rows.map(row=>row.map(value=>{const raw=String(value),safe=/^[\s]*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;return '"'+safe.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
}

/** Date-only legacy readings are never assigned a fabricated measurement instant. */
export function latestWeightObservation(data:HealthData,through:string){
 const daily=[...data.weights].filter(r=>r.date<=through).sort((a,b)=>b.date.localeCompare(a.date))[0],timed=measurementHistory(data,'weight').readings.filter(r=>r.observedAt.slice(0,10)<=through).at(-1);
 if(timed&&(!daily||timed.observedAt.slice(0,10)>=daily.date))return {id:timed.id,date:timed.observedAt.slice(0,10),grams:timed.canonical/1000,detail:timed.observedAt+' · '+timed.sourceLabel+(daily?.date===timed.observedAt.slice(0,10)?' · separate date-only reading also retained':'')};
 return daily?{...daily,detail:daily.date+' · manual date-only reading'}:undefined;
}
