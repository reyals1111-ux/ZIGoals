'use client';
import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import './financial-ui.css';
import {progressPresentation} from '../../lib/visual-format';
import {ASSET_COLORS,ringSegments,type AssetMix} from '../../lib/wealth';
import {GlassRing} from '../progress/glass-progress';
export function AssetIcon({symbol,kind='Crypto',logoUrl}:{symbol:string;kind?:string;logoUrl?:string|null}){const [failed,setFailed]=useState('');const logo=logoUrl?.startsWith('/api/market-logo?url=')&&failed!==logoUrl?logoUrl:null;const fallback=kind==='ETFs'?'▦':kind==='Stocks'?'▥':kind==='Stablecoins'?'◎':kind==='Precious Metals'||kind==='Precious metals'?'△':kind==='Property'?'⌂':kind==='Custom'?'✧':kind==='Cash'?symbol==='EUR'?'€':'$':symbol==='BTC'?'₿':symbol==='ETH'?'Ξ':symbol.slice(0,3).toUpperCase();return <span className="asset-orb" data-kind={kind} aria-hidden="true">{logo?
 // The validated, same-origin raster proxy bounds bytes and host; no client provider credential.
 // eslint-disable-next-line @next/next/no-img-element
 <img src={logo} alt="" width={48} height={48} loading="lazy" onError={()=>setFailed(logo)}/>:fallback}</span>;}
/** `bound` (Session I, Part 10): 'at-least' marks a lower bound (QA-38); 'unavailable' shows no progress at all (QA-37/38). */
export function ProgressRing({percent,size=112,label='Goal progress',complete,assetMix=[],identity=label,valueText,bound}:{percent:number|string|null|undefined;size?:number;label?:string;complete?:boolean;assetMix?:AssetMix[];identity?:string;valueText?:string;bound?:'at-least'|'unavailable'}){
 const progress=bound==='unavailable'?null:progressPresentation(percent,complete),atLeast=bound==='at-least'&&!!progress;
 const segments=progress?ringSegments(assetMix,progress.exact):[];
 // Composition rings keep their legend colours, one arc per asset class; otherwise one nebula arc.
 const arcs=!progress?[]:segments.length?segments.map(s=>({key:s.assetClass,end:s.offset+s.size,color:ASSET_COLORS[s.assetClass]})):[{key:'progress',end:progress.arc}];
 return <GlassRing identity={`progress:${identity}`} ready={Boolean(progress&&progress.arc>0)} arcs={arcs} className="flow-ring" role={progress?'progressbar':'img'} aria-label={progress?label:`${label}: Unavailable`} aria-valuemin={progress?0:undefined} aria-valuemax={progress?100:undefined} aria-valuenow={progress?.arc} aria-valuetext={progress?valueText??(atLeast?`At least ${progress.exact}% · some sources have no value yet`:`${progress.exact}% exact progress${complete===false||Number(progress.exact)<100?' · target not yet reached':''}`):undefined} title={progress?atLeast?`At least ${progress.exact}%`:`${progress.exact}% exact progress`:'Progress unavailable'} style={{'--ring-size':`${size}px`} as CSSProperties}>
  <span aria-hidden="true">{progress?<>{atLeast&&<small className="ring-at-least">≥</small>}{progress.label}<small>%</small></>:'—'}</span>
 </GlassRing>;
}
export function FreshnessBadge({state}:{state:string}){return <span className="freshness-badge" data-state={state}>{state==='fresh'?'Current':state==='stale'?'Needs refresh':state==='manual'?'Manual value':'Needs value'}</span>;}
export function MetricCard({label,value,detail}:{label:string;value:ReactNode;detail?:ReactNode}){return <div className="financial-metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>;}
// Focus returns to whatever opened the sheet (QA-19), as Quick add and Today's dialogs already do.
export function Sheet({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null,d=ref.current;d?.showModal();return()=>{d?.close();if(previous?.isConnected)previous.focus();};},[]);return <dialog ref={ref} className="wealth-sheet" onCancel={onClose} aria-label={title}><header><div><p className="eyebrow">YOUR PRIVATE WEALTH</p><h2>{title}</h2></div><button type="button" className="secondary icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header><div className="wealth-sheet-body">{children}</div></dialog>;}
