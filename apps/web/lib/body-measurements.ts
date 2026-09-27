import {healthSchema,type HealthData} from './health';
import {bodyMeasurementSchema,measurementValueSchema,canonicalMeasurement,type MeasurementDraft,type BodyMeasurement} from './body-measurement-schema';
export type MeasurementGroup={id:string;copies:BodyMeasurement[];canonical:BodyMeasurement|null;conflict:'source'|'values'|null};
const sourceKey=(r:{provider:string;sourceId:string})=>JSON.stringify([r.provider,r.sourceId]);
const observedValue=(r:BodyMeasurement)=>JSON.stringify({kind:r.kind,quantityMilli:r.quantityMilli,unit:r.unit,observedAt:r.observedAt,timezone:r.timezone,sourceLabel:r.sourceLabel,canonical:r.canonical});
/** Group aliases only through explicit source receipts; never guess from date/value alone. */
export function measurementGroups(data:HealthData):MeasurementGroup[]{
 const rows=data.measurements??[],parents=rows.map((_,i)=>i),sources=new Map<string,number>();
 const root=(i:number):number=>{while(parents[i]!==i){parents[i]=parents[parents[i]!]!;i=parents[i]!;}return i;};
 rows.forEach((row,i)=>{for(const receipt of row.observationSources??[]){const key=sourceKey(receipt),prior=sources.get(key);if(prior===undefined)sources.set(key,i);else parents[root(i)]=root(prior);}});
 const groups=new Map<number,BodyMeasurement[]>();rows.forEach((row,i)=>{const key=root(i),group=groups.get(key);if(group)group.push(row);else groups.set(key,[row]);});
 return [...groups.values()].map(group=>{
  const copies=[...group].sort((a,b)=>a.id.localeCompare(b.id)),first=copies[0]!,fingerprints=new Map<string,string>();let conflictingSource=false;
  for(const row of copies)for(const receipt of row.observationSources??[]){const key=sourceKey(receipt),prior=fingerprints.get(key);if(prior!==undefined&&prior!==receipt.fingerprint)conflictingSource=true;fingerprints.set(key,receipt.fingerprint);}
  const conflict=conflictingSource?'source':copies.some(row=>observedValue(row)!==observedValue(first))?'values':null;
  return {id:first.id,copies,canonical:conflict?null:first,conflict};
 });
}
export const measurementGroupFingerprint=(group:MeasurementGroup)=>JSON.stringify(group.copies);
export function saveMeasurement(data:HealthData,draft:MeasurementDraft,recordedAt:string,review?:string):HealthData{
 const group=measurementGroups(data).find(g=>g.copies.some(r=>r.id===draft.id));
 if(group?.conflict==='source')throw Error('This source observation ID has conflicting fingerprints. Preserve the copies and ask the source for a corrected observation with a new source ID.');
 if(group&&review!==undefined&&review!==measurementGroupFingerprint(group))throw Error('Measurement copies changed after review. Review them again before saving.');
 if(group?.conflict==='values'&&review===undefined)throw Error('Review all conflicting measurement copies before applying one correction.');
 const ids=new Set(group?.copies.map(r=>r.id)??[draft.id]);
 const nextRows=[...(data.measurements??[])].map(row=>ids.has(row.id)?correctMeasurement(row,{...draft,id:row.id},recordedAt):row);
 if(!group)nextRows.push(correctMeasurement(undefined,draft,recordedAt));
 return healthSchema.parse({...data,measurements:nextRows});
}
function correctMeasurement(prior:BodyMeasurement|undefined,draft:MeasurementDraft,recordedAt:string):BodyMeasurement{
 const {id,...values}=draft,v=measurementValueSchema.parse(values);
 const canonical=canonicalMeasurement(v.quantityMilli,v.unit);
 const corrections=prior?[...prior.corrections,measurementValueSchema.safeExtend({canonical:bodyMeasurementSchema.shape.canonical,recordedAt:bodyMeasurementSchema.shape.recordedAt}).parse({kind:prior.kind,quantityMilli:prior.quantityMilli,unit:prior.unit,observedAt:prior.observedAt,timezone:prior.timezone,sourceLabel:prior.sourceLabel,canonical:prior.canonical,recordedAt:prior.recordedAt})]:[];
 const next=bodyMeasurementSchema.parse({...v,id,observedAt:new Date(v.observedAt).toISOString(),canonical,source:prior?.source??'MANUAL',observationSources:prior?.observationSources,createdAt:prior?.createdAt??recordedAt,recordedAt,corrections});
 return next;
}
export function measurementHistory(data:HealthData,kind:BodyMeasurement['kind']){
 const groups=measurementGroups(data).filter(g=>g.copies.some(r=>r.kind===kind)),readings=groups.flatMap(g=>g.canonical?[g.canonical]:[]).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)||a.id.localeCompare(b.id));
 return {readings,groups,unresolved:groups.filter(g=>g.conflict),change:readings.length>1?readings.at(-1)!.canonical-readings[0]!.canonical:null};
}
export function exportMeasurementsCsv(data:HealthData){
 const rows:(string|number)[][]=[['id','kind','observed_at_utc','entered_timezone','value','original_unit','canonical_value','canonical_unit','source','recorded_at','record_version','duplicate_of','observation_status','source_receipts']];
 const groups=measurementGroups(data),byId=new Map(groups.flatMap(g=>g.copies.map(r=>[r.id,g] as const)));
 for(const r of [...(data.measurements??[])].sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt)||a.id.localeCompare(b.id)))for(const [index,v]of [...r.corrections,r].entries()){const group=byId.get(r.id)!;rows.push([r.id,v.kind,v.observedAt,v.timezone,v.quantityMilli/1000,v.unit,v.canonical,v.kind==='weight'?'mg':'um',v.sourceLabel,v.recordedAt,index===r.corrections.length?'current':'previous-'+(index+1),group.conflict||group.id===r.id?'':group.id,group.conflict?'unresolved-'+group.conflict:group.copies.length>1?'retained-copy':'independent',JSON.stringify(r.observationSources??[])]);}
 return rows.map(row=>row.map(value=>{const raw=String(value),safe=/^[\s]*[=+\-@\t\r]/.test(raw)?"'"+raw:raw;return '"'+safe.replaceAll('"','""')+'"';}).join(',')).join('\r\n');
}

/** Date-only legacy readings are never assigned a fabricated measurement instant. */
export function latestWeightObservation(data:HealthData,through:string){
 const daily=[...data.weights].filter(r=>r.date<=through).sort((a,b)=>b.date.localeCompare(a.date))[0],timed=measurementHistory(data,'weight').readings.filter(r=>r.observedAt.slice(0,10)<=through).at(-1);
 if(timed&&(!daily||timed.observedAt.slice(0,10)>=daily.date))return {id:timed.id,date:timed.observedAt.slice(0,10),grams:timed.canonical/1000,detail:timed.observedAt+' · '+timed.sourceLabel+(daily?.date===timed.observedAt.slice(0,10)?' · separate date-only reading also retained':'')};
 return daily?{...daily,detail:daily.date+' · manual date-only reading'}:undefined;
}
