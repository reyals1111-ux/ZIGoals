'use client';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import type {MarketAssetRef} from '../../lib/market-assets';
import {availableHistoryRanges,createMarketHistoryCache,fetchPublicMarketHistory,formatHistoryValue,historyIsStale,historyPointsForRange,historyRequestSchema,RWA_HISTORY_UNAVAILABLE,validLocalHistory,type ChartHistoryRange,type HistoryPoint,type MarketHistoryResult} from '../../lib/market-history';
import './price-chart.css';
const cache=createMarketHistoryCache((request,refresh)=>fetchPublicMarketHistory(request,refresh));
const labels:Record<ChartHistoryRange,string>={'1d':'24H','7d':'7D','30d':'30D','90d':'90D','1y':'1Y',all:'Available'};
const EMPTY_POINTS:HistoryPoint[]=[];
export type PriceChartProps={marketRef:MarketAssetRef;currency:'USD'|'EUR';localPoints?:HistoryPoint[];title?:string};
/** localPoints are dated unit prices in currency, never holding totals. They remain in this component only. */
export function PriceChart({marketRef,currency,localPoints=EMPTY_POINTS,title='Price history'}:PriceChartProps){
 const id=useId();
 // One historical window per opened asset. Range controls filter real observations locally.
 const requestText=JSON.stringify({marketRef,currency,range:'90d'});
 const request=useMemo(()=>historyRequestSchema.parse(JSON.parse(requestText)),[requestText]);
 const activeRequest=useRef<string|null>(null);
 const [state,setState]=useState<{key:string;result:MarketHistoryResult}|null>(null);
 const [loadingKey,setLoadingKey]=useState<string|null>(null);
 const [now,setNow]=useState(()=>Date.now());
 const [range,setRange]=useState<ChartHistoryRange>('all');
 const [inspectedAt,setInspectedAt]=useState<string|null>(null);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return ()=>clearInterval(timer);},[]);
 useEffect(()=>{
  activeRequest.current=requestText;
  if(request.marketRef.kind==='rwa')return;
  let active=true;
  cache.load(request).then(result=>{if(active)setState({key:requestText,result});});
  return ()=>{active=false;activeRequest.current=null;};
 },[request,requestText]);
 const result=state?.key===requestText?state.result:null;
 const history=result?.history??null;
 const local=useMemo(()=>validLocalHistory(localPoints,now),[localPoints,now]);
 const observed=history?.points.length?history.points:local;
 const ranges=availableHistoryRanges(observed),selectedRange=ranges.includes(range)?range:'all';
 const points=historyPointsForRange(observed,selectedRange);
 const current=points.find(p=>p.at===inspectedAt)??points[points.length-1];
 const source=history?'CoinGecko':marketRef.kind==='rwa'?'CoinGecko tokenized RWA reference':'Saved local price observations';
 const isStale=Boolean(history&&historyIsStale(history,now));
 const loading=loadingKey===requestText||(!result&&marketRef.kind==='coin');
 const refreshAllowed=!loading&&now>=(result?.nextAttemptAt??0);
 const decimals=Math.max(0,...points.map(p=>p.decimals));
 const units=points.map(p=>BigInt(p.value)*10n**BigInt(decimals-p.decimals));
 const minimum=units.length?units.reduce((a,b)=>a<b?a:b):0n,maximum=units.length?units.reduce((a,b)=>a>b?a:b):0n;
 const times=points.map(p=>Date.parse(p.at)),start=times[0]??0,end=times[times.length-1]??0;
 const x=(at:string)=>28+(end===start?352:(Date.parse(at)-start)/(end-start)*704);
 const y=(value:bigint)=>maximum===minimum?124:214-Number((value-minimum)*18000n/(maximum-minimum))/100;
 const coordinates=points.map((p,index)=>`${x(p.at)},${y(units[index]!)}`).join(' ');
 const first=units[0],last=units[units.length-1];
 const change=first&&last!==undefined&&points.length>1?(last-first)*10000n/first:null;
 const changeText=change===null?null:`${change>0n?'+':change<0n?'-':''}${(change<0n?-change:change)/100n}.${((change<0n?-change:change)%100n).toString().padStart(2,'0')}%`;
 const refresh=async()=>{
  if(!refreshAllowed||request.marketRef.kind==='rwa')return;
  setLoadingKey(requestText);
  try{const refreshed=await cache.load(request,true);if(activeRequest.current===requestText){setState({key:requestText,result:refreshed});setNow(Date.now());}}finally{setLoadingKey(key=>key===requestText?null:key);}
 };
 const inspect=(clientX:number,left:number,width:number)=>{
  const target=start+Math.max(0,Math.min(1,((clientX-left)/width*760-28)/704))*(end-start);
  const nearest=points.reduce<HistoryPoint|undefined>((best,p)=>!best||Math.abs(Date.parse(p.at)-target)<Math.abs(Date.parse(best.at)-target)?p:best,undefined);
  if(nearest)setInspectedAt(nearest.at);
 };
 return <figure className="price-chart" aria-label={title}>
  <div className="price-chart-heading"><div><span className="price-chart-eyebrow">Market perspective</span><h3>{title}</h3></div>{marketRef.kind==='coin'&&<button type="button" className="price-chart-refresh" disabled={!refreshAllowed} onClick={()=>void refresh()}>{loading?'Loading…':!refreshAllowed?'Refresh available soon':'Refresh chart'}</button>}</div>
  <div className="price-chart-source"><span className={`price-chart-dot ${isStale?'is-stale':''}`} aria-hidden="true"/>{source}{history&&<span className={isStale?'price-chart-stale':''}>{isStale?'Saved market history':'Recently fetched history'}</span>}</div>
  {current&&<div className="price-chart-quote"><div><strong>{formatHistoryValue(current)} <small>{currency}</small></strong><span><time dateTime={current.at}>{new Date(current.at).toLocaleString()}</time> · observed price</span></div>{changeText&&<div className={`price-chart-change ${change!<0n?'is-negative':''}`}><strong>{changeText}</strong><span>Between shown observations</span></div>}</div>}
  {ranges.length>0&&<div className="price-chart-ranges" role="group" aria-label="Chart range">{ranges.map(value=><button type="button" key={value} aria-pressed={selectedRange===value} onClick={()=>{setRange(value);setInspectedAt(null);}}>{labels[value]}</button>)}</div>}
  {points.length?<>
   <svg className="price-chart-plot" viewBox="0 0 760 256" role="img" tabIndex={points.length>1?0:undefined} aria-labelledby={`${id}-title`} onPointerMove={event=>{const rect=event.currentTarget.getBoundingClientRect();inspect(event.clientX,rect.left,rect.width);}} onPointerLeave={()=>setInspectedAt(null)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const at=Math.max(0,points.findIndex(p=>p.at===current?.at)),next=event.key==='Home'?0:event.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,at+(event.key==='ArrowLeft'?-1:1)));setInspectedAt(points[next]!.at);}}>
    <title id={`${id}-title`}>{title}. {points.length} dated price observations in {currency}. Exact history table below. Arrow keys inspect observations.</title>
    <defs><linearGradient id={`${id}-line`} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#45d8ef"/><stop offset="22%" stopColor="#559bfa"/><stop offset="46%" stopColor="#9879fb"/><stop offset="72%" stopColor="#df72de"/><stop offset="100%" stopColor="#fa919f"/></linearGradient><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9a79ed" stopOpacity=".22"/><stop offset="100%" stopColor="#9a79ed" stopOpacity="0"/></linearGradient></defs>
    {[34,94,154,214].map(gridY=><line key={gridY} x1="28" x2="732" y1={gridY} y2={gridY} stroke="currentColor" opacity=".1" strokeDasharray="3 6"/>)}
    {history&&points.length>1&&<><polygon points={`28,230 ${coordinates} 732,230`} fill={`url(#${id}-fill)`}/><polyline points={coordinates} fill="none" stroke={`url(#${id}-line)`} strokeWidth="2.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></>}
    {points.map((point,index)=><circle data-observation key={point.at} cx={x(point.at)} cy={y(units[index]!)} r={point.at===current?.at?5.5:history?1.4:4} fill={point.at===current?.at?'#eef5ff':'#aab3ff'}><title>{new Date(point.at).toLocaleString()} · {formatHistoryValue(point)} {currency}</title></circle>)}
    {current&&<line x1={x(current.at)} x2={x(current.at)} y1="28" y2="222" stroke="#cad5f3" opacity=".25" strokeDasharray="3 5"/>}

   </svg>
   <div className="price-chart-axis"><time dateTime={points[0]!.at}>{points[0]!.at.slice(0,10)}</time>{points.length>1&&<time dateTime={points[points.length-1]!.at}>{points[points.length-1]!.at.slice(0,10)}</time>}</div>
   {points.length===1&&<div className="price-chart-single"><strong>Tracking starts here</strong><p>One observed price is saved. Earlier performance is not assumed.</p></div>}
  </>:<div className="price-chart-empty"><span aria-hidden="true">◌</span><h4>{loading?'Loading observed prices':'Your price history starts here'}</h4><p>{loading?'Checking available market history.':'Prices will appear as verified observations become available. Earlier performance is not assumed.'}</p></div>}
  <figcaption>
   {marketRef.kind==='rwa'?RWA_HISTORY_UNAVAILABLE:history?'Dated market observations. Lines connect observed prices; values between them are not recorded prices.':'Saved local price observations. Market history is currently unavailable.'}
   {history&&<span>Fetched <time dateTime={history.fetchedAt}>{new Date(history.fetchedAt).toLocaleString()}</time> · {currency} per asset unit.</span>}
   {result?.error&&marketRef.kind==='coin'&&<span className="price-chart-limitation" role="status">{result.error}</span>}
  </figcaption>
  {points.length>0&&<details className="price-chart-details"><summary>View exact price history <span>{points.length} {points.length===1?'observation':'observations'}</span></summary><div className="price-chart-table-wrap" tabIndex={0} role="region" aria-label="Exact price history"><table><caption>{source} · {currency} per asset unit</caption><thead><tr><th scope="col">Observed at (UTC)</th><th scope="col">Price ({currency})</th></tr></thead><tbody>{points.map(point=><tr key={point.at}><td><time dateTime={point.at}>{new Date(point.at).toISOString().replace('T',' ').replace('.000Z',' UTC')}</time></td><td>{formatHistoryValue(point)}</td></tr>)}</tbody></table></div></details>}
 </figure>;
}
