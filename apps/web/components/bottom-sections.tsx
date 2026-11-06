'use client';
/** Sections at the bottom of each page (UI design pass, Part 8): summaries and info sheets from real records only.
 *  CI13 (weights): this file holds Today's week; the other sections are in their own modules (components/bottom-*.tsx:
 *  goal milestones, habit rhythm, health trends, wealth allocation, value sources, data home), so a page loads only its own. */
import Link from 'next/link';
import {useId,useState} from 'react';
import {usePhoneActive} from './phone/use-phone-layout';
import type {LayoutAttrs} from './layout-edit';
import {weekAcross,weekWealthChange} from '../lib/bottom-week';
import {wealthHistory} from '../lib/wealth';
import type {HabitData} from '../lib/habits';
import type {HealthData} from '../lib/health';
import type {Platform} from '../lib/positions';
import {Count,Shell,dayLabel} from './bottom-section-frame';
import { formatDate, formatNumber, formatSignedMoney } from '../lib/visual-format';

/** Today: the last 7 days across Goals, Habits and Health. */
export function TodayWeek({today,habits,health,platform,financial,...layout}:LayoutAttrs&{today:string;habits:HabitData;health:HealthData;platform:Platform;financial:boolean}){
 const week=weekAcross({today,habits,health,platform});
 // Session AI (B3: the P&L row): tracked wealth's day-to-day change, from Wealth's own history (never converted).
 const wealth=financial?weekWealthChange(wealthHistory(platform),week.map(d=>d.date)):null;
 type Row={key:'goalContributions'|'habitCheckins'|'healthRecords';label:string;one:string;tone:string};
 const rows:Row[]=[...(financial?[{key:'goalContributions',label:'Goal contributions',one:'Goal contribution',tone:'goals'} as Row]:[]),{key:'habitCheckins',label:'Habit check-ins',one:'Habit check-in',tone:'habits'},{key:'healthRecords',label:'Health entries',one:'Health entry',tone:'health'}];
 // On a phone the seven-day rows fold into one line of totals (Session G, Part 4); the note below stays in view.
 const phone=usePhoneActive(),[days,setDays]=useState(false),rowsId=useId();
 const totals=rows.map(r=>{const total=week.reduce((n,d)=>n+d[r.key],0);return total?`${formatNumber(total)} ${(total===1?r.one:r.label).toLowerCase()}`:`no ${r.label.toLowerCase()}`;}).join(' · ');
 // Gate C design review (finding 10): the window is named (Today's other "week" cards count other windows) and so is what
 // a habit check-in counts here. Session AH (TR6): one rule everywhere, a scheduled habit day completed.
 const span=week.length?`${formatDate(week[0]!.date,{weekday:true,year:false})} – ${formatDate(week.at(-1)!.date,{weekday:true,year:false})}`:'';
 return <Shell layout={layout} id="bottom-today-week" eyebrow="THE LAST 7 DAYS" title={<>Your week, all in one orbit.</>} lede={`How many records you saved each day${span?`, ${span}`:''} (habit check-ins: habit days completed, as everywhere in the app; Health: meals, water, weight, activity and exercise counters). A dash means nothing was recorded that day.`}>
  {phone&&<p className="bottom-week-totals">Last 7 days: {totals}.</p>}
  <div className="bottom-rows" id={rowsId} {...(phone&&!days?{'data-phone-collapsed':''}:{})}>{rows.map(r=><div key={r.key} className="bottom-row" data-tone={r.tone} role="group" aria-label={`${r.label}, last 7 days`}><h3><i aria-hidden="true"/>{r.label}</h3><ul>{week.map(d=>{const l=dayLabel(d.date);
   // Session AI (B3: log from a cell): a Health cell opens that day's diary; a Habits cell opens Habits, where the day is checked in.
   const href=r.key==='healthRecords'?`/app/health?date=${d.date}`:r.key==='habitCheckins'?'/app/habits':null;
   const cell=<><small>{l.weekday} {l.day}</small><Count value={d[r.key]} label={r.label.toLowerCase()}/></>;
   return <li key={d.date} data-today={d.date===today||undefined}>{href?<Link className="bottom-cell-link" href={href} aria-label={`${r.label}, ${l.weekday} ${l.day}: ${d[r.key]||'none'} — open to log`}>{cell}</Link>:cell}</li>;})}</ul></div>)}
   {wealth&&<div className="bottom-row" data-tone="wealth" role="group" aria-label={`Tracked wealth change, last 7 days, ${wealth.currency}`}><h3><i aria-hidden="true"/>Wealth change ({wealth.currency})</h3><ul>{week.map((d,i)=>{const l=dayLabel(d.date),c=wealth.changes[i]??null;return <li key={d.date} data-today={d.date===today||undefined}><small>{l.weekday} {l.day}</small>{c===null?<strong className="bottom-none"><span aria-hidden="true">—</span><span className="sr-only">No value recorded</span></strong>:<strong data-sign={c>0?'up':c<0?'down':undefined}>{formatSignedMoney(String(c),wealth.currency)}</strong>}</li>;})}</ul></div>}</div>
  {phone&&<button type="button" className="secondary phone-show-all" aria-controls={rowsId} aria-expanded={days} onClick={()=>setDays(!days)}>{days?'Hide each day':'Show each day'}</button>}
  <p className="bottom-note">Counts of saved records on this device’s data. They are not scores and they do not predict anything.</p>
 </Shell>;
}
