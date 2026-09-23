'use client';
import {useId} from 'react';
import {amount} from './common';
import {formatExactNumber} from '../../lib/visual-format';
import {useEntrance} from '../use-entrance';
import './evidence-chart.css';
export type EvidencePoint={at:string;value:string;dateOnly?:boolean};
export type EvidenceSeries={label:string;color:string;points:EvidencePoint[];kind?:'observation'|'cumulative'|'event';maxGapMs?:number};
const DEFAULT_GAP=7*86400000;
/** Values and times remain real observations. Lines are visual guides, never added data. */
export function EvidenceChart({series,decimals,currency,label}:{series:EvidenceSeries[];decimals:number;currency:string;label:string}){
 const id=useId(),ref=useEntrance<HTMLElement>(`history:${label}`);
 const signed=(value:string)=>`${value.startsWith('-')?'-':''}${amount(value.replace(/^-/,''),decimals)}`;
 const exact=(value:string)=>signed(value),display=(value:string)=>formatExactNumber(exact(value));
 const valid=(p:EvidencePoint)=>Number.isFinite(Date.parse(p.at))&&/^-?\d+$/.test(p.value);
 const clean=series.map(s=>({...s,unavailableAt:s.points.filter(p=>!valid(p)&&Number.isFinite(Date.parse(p.at))).map(p=>Date.parse(p.at)),points:s.points.filter(valid).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))}));
 const points=clean.flatMap(s=>s.points),invalid=series.reduce((n,s)=>n+s.points.filter(p=>!valid(p)).length,0);
 if(!points.length)return <div className="intelligence-empty"><span aria-hidden="true">◌</span><h3>Your history starts here</h3><p>{invalid?'Some observations are unavailable because their values or dates could not be read.':'Real observations and recorded contributions will build this view. No earlier performance is assumed.'}</p></div>;
 const times=points.map(p=>Date.parse(p.at)),start=Math.min(...times),end=Math.max(...times),values=points.map(p=>BigInt(p.value));
 const lo=values.reduce((a,b)=>a<b?a:b),hi=values.reduce((a,b)=>a>b?a:b),padding=(hi-lo)/10n||1n,min=lo-padding,max=hi+padding,range=max-min;
 const x=(at:string)=>24+(end===start?268:(Date.parse(at)-start)/(end-start)*536);
 const y=(value:string)=>174-Number((BigInt(value)-min)*14800n/range)/100;
 function segments(s:typeof clean[number]){
  const groups:EvidencePoint[][]=[];
  for(const p of s.points){const current=groups.at(-1),last=current?.at(-1);if(!last||Date.parse(p.at)-Date.parse(last.at)>(s.maxGapMs??DEFAULT_GAP)||s.unavailableAt.some(at=>at>=Date.parse(last.at)&&at<=Date.parse(p.at)))groups.push([p]);else current!.push(p);}
  return groups;
 }
 const table=<details><summary>View exact history</summary><div className="evidence-table-wrap"><table><caption>Original recorded values · {currency}</caption><thead><tr><th>Date</th><th>Evidence</th><th>Amount ({currency})</th></tr></thead><tbody>{clean.flatMap(s=>s.points.map((p,i)=><tr key={`${s.label}:${p.at}:${i}`}><td><time dateTime={p.at}>{p.dateOnly?p.at:new Date(p.at).toLocaleString()}</time></td><td><i className="evidence-key" style={{background:s.color}} aria-hidden="true"/>{s.label}</td><td>{exact(p.value)}</td></tr>))}</tbody></table></div></details>;
 return <figure ref={ref} className="evidence-chart" aria-label={label}>
  <div className="evidence-chart-legend">{clean.filter(s=>s.points.length).map(s=><span key={s.label}><i style={{background:s.color}}/>{s.label}</span>)}</div>
  {points.length===1?<div className="evidence-first"><span className="eyebrow">First observation</span><strong>{display(points[0]!.value)} <small>{currency}</small></strong><time dateTime={points[0]!.at}>{points[0]!.at.slice(0,10)}</time><p>A starting point, not a trend. Your next observation will add context.</p></div>:<>
   <div className="evidence-chart-range"><span>Scale maximum: {display(max.toString())} {currency}</span><span>Scale minimum: {display(min.toString())} {currency}</span></div>
   <svg viewBox="0 0 584 198" role="img" aria-labelledby={id}>
    <title id={id}>{`${label}. ${points.length} dated observations in ${currency}. Lines are illustrative between observations; exact values in the history table below.`}</title>
    {[26,75,124,174].map(v=><line key={v} x1="24" x2="560" y1={v} y2={v} stroke="currentColor" opacity=".12"/>)}
    {clean.map(s=><g key={s.label}>
     {s.kind!=='event'&&segments(s).filter(group=>group.length>1).map((group,i)=><polyline className="evidence-line" key={i} pathLength={1} points={group.flatMap((p,j)=>s.kind==='cumulative'&&j?[`${x(p.at)},${y(group[j-1]!.value)}`,`${x(p.at)},${y(p.value)}`]:[`${x(p.at)},${y(p.value)}`]).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>)}
     {s.points.map((p,i)=><circle className="evidence-point" key={`${p.at}:${i}`} cx={x(p.at)} cy={y(p.value)} r={s.points.length<=2?3.5:2} fill={s.color}><title>{`${s.label} · ${p.at} · ${exact(p.value)} ${currency}`}</title></circle>)}
    </g>)}
   </svg>
   <div className="evidence-chart-axis"><time dateTime={new Date(start).toISOString()}>{new Date(start).toISOString().slice(0,10)}</time><time dateTime={new Date(end).toISOString()}>{new Date(end).toISOString().slice(0,10)}</time></div>
   <figcaption>Recorded evidence only. Connecting lines are illustrative; gaps longer than seven days are left open unless the source supplies a different interval. Scale fits the observed range with 10% padding; it does not imply a return.</figcaption>
  </>}
  {invalid>0&&<p className="notice">Some observations are unavailable; this history is partial.</p>}{table}
 </figure>;
}
