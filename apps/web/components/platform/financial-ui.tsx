'use client';
import {useBackCloses} from '../use-back-closes';
import {isShowcase} from '../../lib/showcase-storage';
import {useEffect,useRef,useState,useSyncExternalStore,type ReactNode,type CSSProperties} from 'react';
const noSubscribe=()=>()=>{};
const useShowcase=()=>useSyncExternalStore(noSubscribe,isShowcase,()=>false);
import './financial-ui.css';
import {progressPresentation} from '../../lib/visual-format';
import {ASSET_COLORS,ringSegments,type AssetMix} from '../../lib/wealth';
import {GlassRing} from '../progress/glass-progress';
/** Session AH (WE6, B-076): a cash asset shows its own currency's sign (£ for GBP, ¥ for JPY), never "$" for all. */
function cashGlyph(code:string){if(code==='EUR')return '€';if(code==='USD')return '$';try{const sign=new Intl.NumberFormat('en-GB',{style:'currency',currency:code,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(p=>p.type==='currency')?.value;return sign&&sign.length<=2?sign:code.slice(0,1);}catch{return code.slice(0,1)||'¤';}}
export function AssetIcon({symbol,kind='Crypto',logoUrl}:{symbol:string;kind?:string;logoUrl?:string|null}){const [failed,setFailed]=useState('');const logo=logoUrl?.startsWith('/api/market-logo?url=')&&failed!==logoUrl?logoUrl:null;const fallback=kind==='ETFs'?'▦':kind==='Stocks'?'▥':kind==='Stablecoins'?'◎':kind==='Precious Metals'||kind==='Precious metals'?'△':kind==='Property'?'⌂':kind==='Custom'?'✧':kind==='Cash'?cashGlyph(symbol):symbol==='BTC'?'₿':symbol==='ETH'?'Ξ':symbol.slice(0,3).toUpperCase();return <span className="asset-orb" data-kind={kind} aria-hidden="true">{logo?
 // The validated, same-origin raster proxy bounds bytes and host; no client provider credential.
 // eslint-disable-next-line @next/next/no-img-element
 <img src={logo} alt="" width={48} height={48} loading="lazy" onError={()=>setFailed(logo)}/>:fallback}</span>;}
/** `bound` (Session I, Part 10): 'at-least' marks a lower bound (QA-38); 'unavailable' shows no progress at all (QA-37/38). */
export function ProgressRing({percent,size=112,label='Goal progress',complete,assetMix=[],identity=label,valueText,bound,color}:{percent:number|string|null|undefined;size?:number;label?:string;complete?:boolean;assetMix?:AssetMix[];identity?:string;valueText?:string;bound?:'at-least'|'unavailable';color?:string}){
 const progress=bound==='unavailable'?null:progressPresentation(percent,complete),atLeast=bound==='at-least'&&!!progress;
 const segments=progress?ringSegments(assetMix,progress.exact):[];
 // Composition rings keep their legend colours, one arc per asset class; otherwise one nebula arc.
 const arcs=!progress?[]:segments.length?segments.map(s=>({key:s.assetClass,end:s.offset+s.size,color:ASSET_COLORS[s.assetClass]})):[{key:'progress',end:progress.arc,color}];
 return <GlassRing identity={`progress:${identity}`} ready={Boolean(progress&&progress.arc>0)} arcs={arcs} className="flow-ring" role={progress?'progressbar':'img'} aria-label={progress?label:`${label}: Unavailable`} aria-valuemin={progress?0:undefined} aria-valuemax={progress?100:undefined} aria-valuenow={progress?.arc} aria-valuetext={progress?valueText??(atLeast?`At least ${progress.exact}% · some sources have no value yet`:`${progress.exact}% exact progress${complete===false||Number(progress.exact)<100?' · target not yet reached':''}`):undefined} title={progress?atLeast?`At least ${progress.exact}%`:`${progress.exact}% exact progress`:'Progress unavailable'} style={{'--ring-size':`${size}px`} as CSSProperties}>
  <span aria-hidden="true">{progress?<>{atLeast&&<small className="ring-at-least">≥</small>}{progress.label}<small>%</small></>:'—'}</span>
 </GlassRing>;
}
export function FreshnessBadge({state}:{state:string}){const showcase=useShowcase();return <span className="freshness-badge" data-state={state} title={showcase&&(state==='fresh'||state==='stale')?'The Showcase keeps the prices it loaded when it opened, so its examples stay the same':undefined}>{showcase&&(state==='fresh'||state==='stale')?'Showcase price':state==='fresh'?'Current':state==='stale'?'Needs refresh':state==='manual'?'Manual value':'Needs value'}</span>;}
/** Phase 2 closing pass (design critique): a text value sizes itself from its length inside the tile, so a date or amount never breaks. */
export function MetricCard({label,value,detail}:{label:string;value:ReactNode;detail?:ReactNode}){const fit=typeof value==='string'&&/\d/.test(value)&&!/[a-z]{4,}/.test(value);return <div className="financial-metric"><span>{label}</span><strong className={fit?'is-figure':undefined} style={fit?{'--chars':value.length} as import('react').CSSProperties:undefined}>{value}</strong>{detail&&<small>{detail}</small>}</div>;}
// Focus returns to whatever opened the sheet (QA-19), as Quick add and Today's dialogs already do.
export function Sheet({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){const ref=useRef<HTMLDialogElement>(null);useBackCloses(true,onClose);useEffect(()=>{const previous=document.activeElement instanceof HTMLElement?document.activeElement:null,d=ref.current;d?.showModal();return()=>{d?.close();if(previous?.isConnected)previous.focus();};},[]);return <dialog ref={ref} className="wealth-sheet" onCancel={onClose} aria-label={title}><header><div><p className="eyebrow">YOUR PRIVATE WEALTH</p><h2>{title}</h2></div><button type="button" className="secondary icon-button" aria-label="Close dialog" onClick={onClose}>×</button></header><div className="wealth-sheet-body">{children}</div></dialog>;}
