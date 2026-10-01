'use client';
/** Sections at the bottom of each page (UI design pass, Part 8): summaries and info sheets from real records only. */
import Link from 'next/link';
import {useMemo,type ReactNode} from 'react';
import type {LayoutAttrs} from './layout-edit';
import {WEEKDAYS,goalTimeline,habitRhythm,healthWeek,wealthAllocation,weekAcross} from '../lib/bottom-insights';
import {ASSET_COLORS,type wealthOverview} from '../lib/wealth';
import type {HabitData} from '../lib/habits';
import type {HealthData} from '../lib/health';
import type {Platform} from '../lib/positions';
import type {GoalSummary} from '../lib/goal-summary';
import './bottom-sections.css';
import {NebulaFlow} from './nebula-flow';
import { formatNumber } from '../lib/visual-format';

const dayLabel=(date:string)=>{const d=new Date(`${date}T12:00:00Z`);return {weekday:WEEKDAYS[(d.getUTCDay()+6)%7]!,day:d.getUTCDate()};};
function Shell({id,eyebrow,title,lede,children,layout,className=''}:{id:string;eyebrow:string;title:ReactNode;lede?:ReactNode;children:ReactNode;layout:LayoutAttrs;className?:string}){
 return <section {...layout} className={`bottom-section panel ${className}`.trim()} aria-labelledby={id}>
  <div className="bottom-section-heading"><p className="eyebrow">{eyebrow}</p><h2 id={id}><NebulaFlow identity={id}>{title}</NebulaFlow></h2>{lede&&<p className="bottom-section-lede">{lede}</p>}</div>
  {children}
 </section>;
}
const Count=({value,label}:{value:number;label:string})=>value?<strong>{formatNumber(value)}</strong>:<strong className="bottom-none"><span aria-hidden="true">—</span><span className="sr-only">No {label} recorded</span></strong>;

/** Today: the last 7 days across Goals, Habits and Health. */
export function TodayWeek({today,habits,health,platform,financial,...layout}:LayoutAttrs&{today:string;habits:HabitData;health:HealthData;platform:Platform;financial:boolean}){
 const week=weekAcross({today,habits,health,platform});
 type Row={key:'goalContributions'|'habitCheckins'|'healthRecords';label:string;tone:string};
 const rows:Row[]=[...(financial?[{key:'goalContributions',label:'Goal contributions',tone:'goals'} as Row]:[]),{key:'habitCheckins',label:'Habit check-ins',tone:'habits'},{key:'healthRecords',label:'Health entries',tone:'health'}];
 return <Shell layout={layout} id="bottom-today-week" eyebrow="THE LAST 7 DAYS" title={<>Your week, all in one orbit.</>} lede="How many records you saved each day. A dash means nothing was recorded that day.">
  <div className="bottom-rows">{rows.map(r=><div key={r.key} className="bottom-row" data-tone={r.tone} role="group" aria-label={`${r.label}, last 7 days`}><h3><i aria-hidden="true"/>{r.label}</h3><ul>{week.map(d=>{const l=dayLabel(d.date);return <li key={d.date} data-today={d.date===today||undefined}><small>{l.weekday} {l.day}</small><Count value={d[r.key]} label={r.label.toLowerCase()}/></li>;})}</ul></div>)}</div>
  <p className="bottom-note">Counts of saved records on this device’s data. They are not scores and they do not predict anything.</p>
 </Shell>;
}

/** Goals: saved target dates on one timeline. */
export function GoalMilestones({goals,today,...layout}:LayoutAttrs&{goals:readonly GoalSummary[];today:string}){
 const t=goalTimeline(goals,today);
 return <Shell layout={layout} id="bottom-goal-milestones" eyebrow="YOUR TIMELINE" title={<>Milestones ahead.</>} lede="Target dates saved in your active Goals, soonest first.">
  {t.dated.length?<ol className="bottom-timeline">{t.dated.map(g=><li key={g.key} data-past={g.past||undefined}><time dateTime={g.targetDate}>{g.targetDate}</time><span className="bottom-timeline-dot" aria-hidden="true"/><Link href={g.href} className="bottom-timeline-name">{g.name}</Link><span className="bottom-pill">{formatNumber(Number(g.progressPct), {maximumFractionDigits:1})}% funded</span>{g.past&&<span className="bottom-pill bottom-pill-muted">Target date passed</span>}</li>)}</ol>
  :<p className="bottom-empty">No active Goal has a target date yet. Add one in a Goal’s plan to see it here.</p>}
  {t.undated>0&&<p className="bottom-note">{t.undated} active Goal{t.undated===1?' has':'s have'} no target date.</p>}
 </Shell>;
}

/** Habits: check-ins by weekday over 4 weeks, and best streaks. */
export function HabitRhythmSection({habits,today,...layout}:LayoutAttrs&{habits:HabitData;today:string}){
 const r=useMemo(()=>habitRhythm(habits,today),[habits,today]),max=Math.max(1,...r.byWeekday.map(d=>d.checkins));
 return <Shell layout={layout} id="bottom-habit-rhythm" eyebrow="YOUR RHYTHM" title={<>Consistency by weekday.</>} lede="Check-ins recorded over the last four weeks, and your best streaks.">
  <div className="bottom-two">
   <div className="bottom-weekday-bars" role="list" aria-label="Check-ins by weekday, last 4 weeks">{r.byWeekday.map(d=><div role="listitem" key={d.label} aria-label={`${d.label}: ${d.checkins} check-ins`}><span className="bottom-bar-track" aria-hidden="true"><i style={{height:`${d.checkins/max*100}%`}}/></span><strong aria-hidden="true">{d.checkins}</strong><small aria-hidden="true">{d.label}</small></div>)}</div>
   <div className="bottom-streaks"><h3>Best streaks</h3>{r.streaks.length?<ol>{r.streaks.map(s=><li key={s.title}><span>{s.title}</span><strong>{s.best} {s.unit}</strong><small>Now {s.current} {s.unit}</small></li>)}</ol>:<p className="bottom-empty">Your first completed check-in starts a streak.</p>}</div>
  </div>
  {!r.total&&<p className="bottom-note">No check-ins in the last four weeks yet.</p>}
 </Shell>;
}

/** Health: 7 days of calories, water and exercise counters; a dash is no entry. */
export function HealthTrends({health,today,...layout}:LayoutAttrs&{health:HealthData;today:string}){
 const week=healthWeek(health,today),counters=week[0]?.exercise.map(e=>e.name)??[];
 const row=(label:string,tone:string,values:[string,number|null,boolean][])=><div className="bottom-row" data-tone={tone} role="group" aria-label={`${label}, last 7 days`}><h3><i aria-hidden="true"/>{label}</h3><ul>{values.map(([date,value,partial])=>{const l=dayLabel(date);return <li key={date} data-today={date===today||undefined}><small>{l.weekday} {l.day}</small>{value===null?<strong className="bottom-none"><span aria-hidden="true">{partial?'…':'—'}</span><span className="sr-only">{partial?'Incomplete calorie data':'No entry'}</span></strong>:<strong>{formatNumber(value)}</strong>}</li>;})}</ul></div>;
 return <Shell layout={layout} id="bottom-health-trends" eyebrow="SEVEN DAYS OF CARE" title={<>Your week, gently tracked.</>} lede="Calories, water and quick counters you logged. A dash means no entry, not zero.">
  <div className="bottom-rows">
   {row('Calories · kcal','health',week.map(d=>[d.date,d.kcal,d.kcalPartial]))}
   {row('Water · mL','water',week.map(d=>[d.date,d.waterMl,false]))}
   {counters.map((name,i)=><div key={name+i} className="bottom-row-slot">{row(name,'habits',week.map(d=>[d.date,d.exercise[i]?.count??null,false]))}</div>)}
  </div>
  <p className="bottom-note">“…” marks a day with meals whose labels leave calories unknown. Nothing here is a recommendation.</p>
 </Shell>;
}

/** Wealth: allocation by class within the headline currency, and valuation coverage. */
export function WealthAllocationSection({overview,...layout}:LayoutAttrs&{overview:ReturnType<typeof wealthOverview>}){
 const a=wealthAllocation(overview);
 return <Shell layout={layout} id="bottom-wealth-allocation" eyebrow="THE SHAPE OF WHAT YOU KNOW" title={<>Allocation and coverage.</>} lede={a.currency?`How the known ${a.currency} value is spread across asset classes.`:'Add a valued asset to see how your wealth is spread.'}>
  {a.classes.length>0&&<><div className="bottom-stack" aria-hidden="true">{a.classes.map(c=><i key={c.assetClass} style={{width:`${c.share}%`,background:ASSET_COLORS[c.assetClass as keyof typeof ASSET_COLORS]}}/>)}</div>
   <ul className="bottom-legend">{a.classes.map(c=><li key={c.assetClass}><i style={{background:ASSET_COLORS[c.assetClass as keyof typeof ASSET_COLORS]}} aria-hidden="true"/><span>{c.assetClass}</span><strong>{formatNumber(c.share, {maximumFractionDigits:1})}%</strong></li>)}</ul></>}
  <div className="bottom-coverage"><strong>{a.coverage.valued} of {a.coverage.total}</strong><span>assets have a known value{a.coverage.total>a.coverage.valued?'. Valuation coverage is incomplete; assets without a value are left out.':'.'}</span></div>
  {a.otherCurrencies.length>0&&<p className="bottom-note">{a.otherCurrencies.join(', ')} holdings are not included here. Currencies stay separate; no FX is assumed.</p>}
 </Shell>;
}

const SOURCES=[
 ['Crypto prices','CoinGecko, only when you ask. A price older than 15 minutes is marked as needing a refresh.'],
 ['Stocks, ETFs and metals','Tokenized RWA market references, which can differ from the underlying market.'],
 ['Manual values','Values you enter, kept with the date you recorded them.'],
 ['Public ZIG positions','A read-only relay checks official chain data at one block height, when you request it.'],
] as const;
/** Markets and Positions: what is tracked and where values come from. No prices are shown here. */
export function ValueSources({variant,platform,...layout}:LayoutAttrs&{variant:'markets'|'positions';platform:Platform}){
 const owned=platform.positions.filter(p=>!p.archivedAt),linked=owned.filter(p=>p.marketRef).length,manual=owned.filter(p=>p.sourceType==='MANUAL').length,observed=owned.filter(p=>p.sourceType!=='MANUAL').length;
 const counts=variant==='markets'?[['Favourite markets',platform.watchlist.length],['Owned assets with a market reference',linked],['Manual assets',manual]] as const:[['Observed public positions',observed],['Manual positions',manual],['Allocations to Goals',platform.allocations.length]] as const;
 return <Shell layout={layout} id={`bottom-${variant}-sources`} eyebrow="WHERE VALUES COME FROM" title={<>What’s tracked, and how.</>} lede="Every value keeps its source and time. When the price service is unavailable, no new price appears; the last verified value keeps its timestamp.">
  <dl className="bottom-counts">{counts.map(([label,n])=><div key={label}><dt>{label}</dt><dd>{formatNumber(n)}</dd></div>)}</dl>
  <ul className="bottom-sources">{SOURCES.map(([title,body])=><li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ul>
  <p className="bottom-note">No trading, return forecast or advice is implied. Financial execution is not available in this Alpha.</p>
 </Shell>;
}

/** Settings: where your data lives (static information, not a movable card). */
export function DataHome(){
 const places=[
  ['In this browser','Goals, Habits, Health, Wealth, and your Today widgets and their order, are private records stored in this browser.'],
  ['Optional account','If you create an account, only the areas you agree to are encrypted before they sync.'],
  ['Backups you keep','An encrypted backup file you download. Browser storage is not a backup, so keep one somewhere safe.'],
  ['This device only','The card order you arrange on the other pages, and the motion preference, stay on this device. They are not synced or backed up.'],
  ['Showcase','Showcase data is fictional and lives only in its tab, separate from your records.'],
 ] as const;
 return <section className="bottom-section panel data-home" aria-labelledby="bottom-data-home"><div className="bottom-section-heading"><p className="eyebrow">YOUR DATA, YOUR ORBIT</p><h2 id="bottom-data-home"><NebulaFlow identity="bottom-data-home">Where your data lives.</NebulaFlow></h2></div>
  <ul className="bottom-places">{places.map(([title,body])=><li key={title}><strong>{title}</strong><span>{body}</span></li>)}</ul>
 </section>;
}
