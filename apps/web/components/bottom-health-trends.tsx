'use client';
import {useMemo} from 'react';
import type {LayoutAttrs} from './layout-edit';
import type {HealthData} from '../lib/health';
import {careRows,healthWeek} from '../lib/bottom-health-week';
import {formatNumber} from '../lib/visual-format';
import {ML_PER_US_FL_OZ,type WaterUnit} from '../lib/health-units';
import {healthGroupIn} from '../lib/vault/w-homes';
import {Shell,dayLabel} from './bottom-section-frame';

/** Health: 7 days of calories, water and exercise counters; a dash is no entry. */
// Gate C (persona round): water reads in the person's chosen unit here too (Part 4.7, display only; whole US fl oz).
export function HealthTrends({health,today,waterUnit='ml',weightUnit='kg',...layout}:LayoutAttrs&{health:HealthData;today:string;waterUnit?:WaterUnit;weightUnit?:'kg'|'lb'}){
 const week=healthWeek(health,today),counters=week[0]?.exercise.map(e=>e.name)??[];
 // Session W Part 7: imported or linked vitals, one record a day (the most recently updated when two sources gave one);
 // the rows appear only when the week has any.
 const vitals=useMemo(()=>{const byDay=new Map<string,{restingHr?:number;activeKcal?:number;updatedAt:string}>();for(const d of healthGroupIn(health,'vitals')?.days??[]){const seen=byDay.get(d.date);if(!seen||d.updatedAt>seen.updatedAt)byDay.set(d.date,d);}return byDay;},[health]);
 const restingRow=week.map(d=>[d.date,vitals.get(d.date)?.restingHr??null,false] as [string,number|null,boolean]),activeRow=week.map(d=>[d.date,vitals.get(d.date)?.activeKcal??null,false] as [string,number|null,boolean]);
 const row=(label:string,tone:string,values:[string,number|null,boolean][],digits=0)=><div className="bottom-row" data-tone={tone} role="group" aria-label={`${label}, last 7 days`}><h3><i aria-hidden="true"/>{label}</h3><ul>{values.map(([date,value,partial])=>{const l=dayLabel(date);return <li key={date} data-today={date===today||undefined} aria-current={date===today?"date":undefined}><small>{l.weekday} {l.day}</small>{value===null?<strong className="bottom-none"><span aria-hidden="true">{partial?'…':'—'}</span><span className="sr-only">{partial?'Incomplete calorie data':'No entry'}</span></strong>:<strong>{value>=1000?<><span className="bottom-full">{formatNumber(value,{maximumFractionDigits:0})}</span><span className="bottom-compact" aria-hidden="true">{formatNumber(value,{notation:'compact',maximumFractionDigits:1})}</span></>:formatNumber(value,{maximumFractionDigits:digits})}</strong>}</li>;})}</ul></div>;
 return <Shell layout={layout} id="bottom-health-trends" eyebrow="SEVEN DAYS OF CARE" title={<>Your week, gently tracked.</>} lede="Calories, water and quick counters you logged. A dash means no entry, not zero.">
  <div className="bottom-rows">
   {row('Calories · kcal','health',week.map(d=>[d.date,d.kcal,d.kcalPartial]))}
   {row(waterUnit==='fl-oz-us'?'Water · US fl oz':'Water · mL','water',week.map(d=>[d.date,d.waterMl===null||waterUnit!=='fl-oz-us'?d.waterMl:Math.round(d.waterMl/ML_PER_US_FL_OZ),false]))}
   {counters.map((name,i)=><div key={name+i} className="bottom-row-slot">{row(name,'habits',week.map(d=>[d.date,d.exercise[i]?.count??null,false]))}</div>)}
   {restingRow.some(([,v])=>v!==null)&&row('Resting heart rate · bpm','health',restingRow)}
   {activeRow.some(([,v])=>v!==null)&&row('Active energy · kcal','health',activeRow)}
   {/* Session AL (MO-150): steps, active minutes, sleep and weight, each only when the week has a record */}
   {careRows(week,weightUnit).map(r=><div key={r.key} className="bottom-row-slot">{row(r.label,r.tone,r.values,r.digits)}</div>)}
  </div>
  <p className="bottom-note">“…” marks a day with meals whose labels leave calories unknown. Nothing here is a recommendation.</p>
 </Shell>;
}
