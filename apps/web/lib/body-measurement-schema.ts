import {z} from 'zod';
export const measurementKinds=['weight','waist','hips','chest','arm','thigh'] as const;
export const measurementValueSchema=z.object({kind:z.enum(measurementKinds),quantityMilli:z.number().int().positive().max(2_500_000),unit:z.enum(['kg','lb','cm','in']),observedAt:z.iso.datetime({offset:true}),timezone:z.string().max(80).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}}),sourceLabel:z.string().trim().min(1).max(100)}).strict().refine(v=>v.kind==='weight'?['kg','lb'].includes(v.unit):['cm','in'].includes(v.unit),'Use weight units for weight and length units for body measurements.');
const persistedValueSchema=measurementValueSchema.safeExtend({canonical:z.number().int().positive().max(3_000_000_000),recordedAt:z.iso.datetime()});
const round=(n:bigint,d:bigint)=>Number((n*2n+d)/(d*2n));
export const canonicalMeasurement=(quantityMilli:number,unit:string)=>{const q=BigInt(quantityMilli);return unit==='kg'?Number(q*1000n):unit==='lb'?round(q*45359237n,100000n):unit==='cm'?Number(q*10n):round(q*254n,10n);};
export const bodyMeasurementSchema=persistedValueSchema.safeExtend({id:z.string().regex(/^health_[a-z0-9-]{8,80}$/),createdAt:z.iso.datetime(),source:z.literal('MANUAL'),corrections:z.array(persistedValueSchema).max(1000)}).superRefine((r,ctx)=>{for(const value of [r,...r.corrections])if(canonicalMeasurement(value.quantityMilli,value.unit)!==value.canonical)ctx.addIssue({code:'custom',message:'Measurement unit conversion does not match the original value.'});});
export type BodyMeasurement=z.infer<typeof bodyMeasurementSchema>;
export type MeasurementDraft=z.infer<typeof measurementValueSchema>&{id:string};
