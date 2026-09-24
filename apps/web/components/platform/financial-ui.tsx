'use client';
import {useEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import './financial-ui.css';
import {progressPresentation} from '../../lib/visual-format';
import {ASSET_COLORS,ringSegments,type AssetMix} from '../../lib/wealth';
import {smoothConicGradient} from '../../lib/visual-gradients';
import {useEntrance} from '../use-entrance';
export function AssetIcon({symbol,kind='Crypto',logoUrl}:{symbol:string;kind?:string;logoUrl?:string|null}){const [failed,setFailed]=useState('');const logo=logoUrl?.startsWith('/api/market-logo?url=')&&failed!==logoUrl?logoUrl:null;const fallback=kind==='ETFs'?'▦':kind==='Stocks'?'▥':kind==='Stablecoins'?'◎':kind==='Precious Metals'||kind==='Precious metals'?'△':kind==='Property'?'⌂':kind==='Custom'?'✧':kind==='Cash'?symbol==='EUR'?'€':'$':symbol==='BTC'?'₿':symbol==='ETH'?'Ξ':symbol.slice(0,3).toUpperCase();return <span className="asset-orb" data-kind={kind} aria-hidden="true">{logo?
 // The validated, same-origin raster proxy bounds bytes and host; no client provider credential.
 // eslint-disable-next-line @next/next/no-img-element
 <img src={logo} alt="" width={48} height={48} loading="lazy" onError={()=>setFailed(logo)}/>:fallback}</span>;}
export function ProgressRing({percent,size=112,label='Goal progress',complete,assetMix=[],identity=label}:{percent:number|string|null|undefined;size?:number;label?:string;complete?:boolean;assetMix?:AssetMix[];identity?:string}){
 const progress=progressPresentation(percent,complete),ref=useEntrance<HTMLDivElement>(`progress:${identity}`,Boolean(progress&&progress.arc>0));
 const segments=progress?ringSegments(assetMix,progress.exact):[];
 const composition=segments.length?smoothConicGradient(segments.map(s=>({color:ASSET_COLORS[s.assetClass],offset:s.offset,size:s.size}))):undefined;
 return <div ref={ref} className="flow-ring" role={progress?'progressbar':'img'} aria-label={progress?label:`${label}: Unavailable`} aria-valuemin={progress?0:undefined} aria-valuemax={progress?100:undefined} aria-valuenow={progress?.arc} aria-valuetext={progress?`${progress.exact}% exact progress${complete===false||Number(progress.exact)<100?' · target not yet reached':''}`:undefined} title={progress?`${progress.exact}% exact progress`:'Progress unavailable'} style={{'--progress':`${progress?.arc??0}%`,'--ring-size':`${size}px`,'--composition':composition} as CSSProperties}>
  <div className="flow-ring-track" aria-hidden="true"/><div className="flow-ring-fill" aria-hidden="true"/><span aria-hidden="true">{progress?<>{progress.label}<small>%</small></>:'—'}</span>
 </div>;
}
export function FreshnessBadge({state}:{state:string}){return <span className="freshness-badge" data-state={state}>{state==='fresh'?'Current':state==='stale'?'Needs refresh':state==='manual'?'Manual value':'Needs value'}</span>;}
export function MetricCard({label,value,detail}:{label:string;value:ReactNode;detail?:ReactNode}){return <div className="financial-metric"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>;}
export function Sheet({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);return <dialog ref={ref} className="wealth-sheet" onCancel={onClose} aria-label={title}><header><div><p className="eyebrow">YOUR PRIVATE WEALTH</p><h2>{title}</h2></div><button type="button" className="secondary icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header><div className="wealth-sheet-body">{children}</div></dialog>;}
