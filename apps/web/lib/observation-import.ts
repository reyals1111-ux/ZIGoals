import {z} from 'zod';
import {measurementValueSchema,canonicalMeasurement,bodyMeasurementSchema} from './body-measurement-schema';
import {healthSchema,type HealthData} from './health';
export const observationFileSchema=z.object({format:z.literal('zigoals-observations'),version:z.literal(1),provider:z.string().trim().min(1).max(100),observations:z.array(measurementValueSchema.safeExtend({sourceId:z.string().trim().min(1).max(200)})).min(1).max(100)}).strict();
export type ObservationFile=z.infer<typeof observationFileSchema>;
/** Concrete file consumer. Matching instants/units are reviewed overlaps, never silently added twice. */
export function importObservations(data:HealthData,input:unknown,recordedAt:string){
 const file=observationFileSchema.parse(input),rows=[...(data.measurements??[])];let added=0,linked=0,duplicates=0;
 for(const observation of file.observations){
  const {sourceId,...fields}=observation,value=measurementValueSchema.parse({...fields,observedAt:new Date(fields.observedAt).toISOString()}),canonical=canonicalMeasurement(value.quantityMilli,value.unit),fingerprint=JSON.stringify(value),receipt={provider:file.provider,sourceId,fingerprint};
  const seen=rows.flatMap(row=>(row.observationSources??[]).filter(r=>r.provider===file.provider&&r.sourceId===sourceId).map(r=>({row,receipt:r})));
  if(seen.length){if(seen.length!==1||seen[0]!.receipt.fingerprint!==fingerprint)throw Error('A source observation ID has conflicting content. Preserve the file and review the source; no readings were imported.');duplicates++;continue;}
  const overlap=rows.filter(row=>[row,...row.corrections].some(v=>v.kind===value.kind&&v.canonical===canonical&&Date.parse(v.observedAt)===Date.parse(value.observedAt)));
  if(overlap.length>1)throw Error('Several retained readings match this observation. Resolve the ambiguous source before importing; no readings were changed.');
  if(overlap.length){const prior=overlap[0]!;rows[rows.indexOf(prior)]=bodyMeasurementSchema.parse({...prior,observationSources:[...prior.observationSources??[],receipt]});linked++;}
  else {rows.push(bodyMeasurementSchema.parse({...value,id:'health_'+crypto.randomUUID(),canonical,source:'FILE_IMPORT',createdAt:recordedAt,recordedAt,corrections:[],observationSources:[receipt]}));added++;}
 }
 return {data:healthSchema.parse({...data,measurements:rows}),added,linked,duplicates};
}
