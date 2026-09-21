'use client';
import {useId} from 'react';
import {amount} from './common';
export type EvidenceSeries={label:string;color:string;points:{at:string;value:string}[]};
/** No smoothing, backfill or synthetic prices: each mark is a dated local fact. */
export function EvidenceChart({series,decimals,currency,label}:{series:EvidenceSeries[];decimals:number;currency:string;label:string}){
 const signed=(value:string)=>`${value.startsWith('-')?'-':''}${amount(value.replace(/^-/,''),decimals)}`;const id=useId();const points=series.flatMap(s=>s.points).filter(p=>Number.isFinite(Date.parse(p.at)));
 if(!points.length)return <div className="intelligence-empty"><span aria-hidden="true">◌</span><h3>Your history starts here</h3><p>Real observations and recorded contributions will build this view. No earlier performance is assumed.</p></div>;
 const times=points.map(p=>Date.parse(p.at)),start=Math.min(...times),end=Math.max(...times);
 const values=points.map(p=>BigInt(p.value)),min=values.reduce((a,b)=>a<b?a:b,0n),max=values.reduce((a,b)=>a>b?a:b,1n),range=max-min||1n;
 const x=(at:string)=>48+(end===start?244:(Date.parse(at)-start)/(end-start)*488);
 const y=(value:string)=>176-Number((BigInt(value)-min)*14400n/range)/100;
 return <figure className="evidence-chart" aria-label={label}>
  <div className="evidence-chart-legend">{series.map(s=><span key={s.label}><i style={{background:s.color}}/>{s.label}</span>)}</div>
  <p className="evidence-chart-scale">{amount(max.toString(),decimals)} {currency}</p>
  <svg viewBox="0 0 584 192" role="img" aria-labelledby={id}>
   <title id={id}>{`${label}. ${points.length} dated observations in ${currency}. Exact values in the history table below.`}</title>
   {[32,80,128,176].map(v=><line key={v} x1="48" x2="536" y1={v} y2={v} stroke="currentColor" opacity=".09"/>)}
   {series.map(s=><g key={s.label}>{s.points.map((p,i)=><circle key={`${p.at}:${i}`} cx={x(p.at)} cy={y(p.value)} r="4.5" fill={s.color}><title>{`${s.label} · ${p.at.slice(0,10)} · ${signed(p.value)} ${currency}`}</title></circle>)}</g>)}
  </svg>
  <div className="evidence-chart-axis"><time dateTime={new Date(start).toISOString()}>{new Date(start).toISOString().slice(0,10)}</time><time dateTime={new Date(end).toISOString()}>{new Date(end).toISOString().slice(0,10)}</time></div>
  <figcaption>Recorded evidence only · gaps contain no assumed performance.</figcaption>
  <details><summary>View exact history</summary><div className="evidence-table-wrap"><table><thead><tr><th>Date</th><th>Evidence</th><th>Amount ({currency})</th></tr></thead><tbody>{series.flatMap(s=>s.points.map((p,i)=><tr key={`${s.label}:${p.at}:${i}`}><td><time dateTime={p.at}>{new Date(p.at).toLocaleString()}</time></td><td>{s.label}</td><td>{signed(p.value)}</td></tr>))}</tbody></table></div></details>
 </figure>;
}
