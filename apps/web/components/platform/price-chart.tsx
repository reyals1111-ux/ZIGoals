'use client';
import {useRememberedChoice} from '../ui/use-remembered-choice';
import {HISTORY_DAYS} from '../../lib/market-history';
import {useEffect,useId,useMemo,useRef,useState,type CSSProperties} from 'react';
import type {MarketAssetRef} from '../../lib/market-assets';
import {availableHistoryRanges,createMarketHistoryCache,fetchPublicMarketHistory,formatHistoryValue,historyIsStale,historyPointsForRange,historyRequestSchema,formatHistoryPrice,RWA_HISTORY_UNAVAILABLE,validLocalHistory,type ChartHistoryRange,type HistoryPoint,type MarketHistoryResult} from '../../lib/market-history';
import './price-chart.css';
import {ChartLookDefs,useChartLook} from '../charts/chart-defs';
import {useEntrance} from '../use-entrance';
import { formatDate, formatDateTime, formatPlainDecimal } from '../../lib/visual-format';
import {LazyPillarArt} from '../illustrations/lazy-pillar-art';
const cache=createMarketHistoryCache((request,refresh)=>fetchPublicMarketHistory(request,refresh));
const labels:Record<ChartHistoryRange,string>={'1d':'24H','7d':'7D','30d':'30D','90d':'90D','1y':'1Y',all:'Max'};
const EMPTY_POINTS:HistoryPoint[]=[];
/** `offline` (Session W Part 15, the Showcase's coin page): only `localPoints` (labelled fixture prices) are shown and nothing is asked. */
export type PriceChartProps={marketRef:MarketAssetRef;currency:'USD'|'EUR';localPoints?:HistoryPoint[];title?:string;offline?:boolean;/** Session AL (Part 15, C-TK-19): a dashed level, such as the person's average cost (a plain decimal price). */costLine?:{value:string;label:string}};
/** A plain decimal as integer units at `decimals` places (cut, never rounded); null when it is not a plain decimal. */
export function decimalUnits(value:string,decimals:number):bigint|null{if(!/^\d+(\.\d+)?$/.test(value))return null;const [whole,fraction='']=value.split('.');return BigInt(whole+(fraction+'0'.repeat(decimals)).slice(0,decimals));}
/** localPoints are dated unit prices in currency, never holding totals. They remain in this component only. */
export function PriceChart({marketRef,currency,localPoints=EMPTY_POINTS,title='Price history',offline=false,costLine}:PriceChartProps){
 const id=useId(),look=useChartLook();
 // One historical window per opened asset. Range controls filter real observations locally.
 const activeRequest=useRef<string|null>(null);
 const [state,setState]=useState<{key:string;result:MarketHistoryResult}|null>(null);
 const [loadingKey,setLoadingKey]=useState<string|null>(null);
 const [now,setNow]=useState(()=>Date.now());
 const [range,setRange]=useRememberedChoice<ChartHistoryRange>('price-chart-range','all',['all',...Object.keys(HISTORY_DAYS)] as ChartHistoryRange[]);
 // Session AL (P-TK-04 1Y; TK-033/156/215, C-TK-22): 90 days of hourly prices by default; 1Y asks once for the year
 // (daily prices; the history route serves it) only when the person chooses it, so the provider budget is unchanged otherwise.
 // It is offered once the 90 days are fully covered (an older coin), so a young coin never shows a range it cannot fill.
 const requestText=JSON.stringify({marketRef,currency,range:range==='1y'?'1y':'90d'});
 const request=useMemo(()=>historyRequestSchema.parse(JSON.parse(requestText)),[requestText]);
 const [inspectedAt,setInspectedAt]=useState<string|null>(null);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return ()=>clearInterval(timer);},[]);
 useEffect(()=>{
  activeRequest.current=requestText;
  if(request.marketRef.kind==='rwa'||offline)return;
  let active=true;
  cache.load(request).then(result=>{if(active)setState({key:requestText,result});});
  return ()=>{active=false;activeRequest.current=null;};
 },[request,requestText,offline]);
 const result=state?.key===requestText?state.result:null;
 const history=result?.history??null;
 const local=useMemo(()=>validLocalHistory(localPoints,now),[localPoints,now]);
 const observed=history?.points.length?history.points:local;
 const found=availableHistoryRanges(observed),ranges=marketRef.kind==='coin'&&!offline&&(found.includes('90d')||range==='1y')&&!found.includes('1y')?[...found.filter(r=>r!=='all'),'1y' as ChartHistoryRange,'all' as ChartHistoryRange]:found,selectedRange=found.includes(range)?range:'all';
 const points=historyPointsForRange(observed,selectedRange);
 const entrance=useEntrance<HTMLElement>(`price:${JSON.stringify(marketRef)}:${currency}`,points.length>1);
 const current=points.find(p=>p.at===inspectedAt)??points[points.length-1];
 const source=offline?'Showcase fixture prices':history?'CoinGecko':marketRef.kind==='rwa'?'CoinGecko tokenized RWA reference':'Saved local price observations';
 const isStale=Boolean(history&&historyIsStale(history,now));
 const loading=!offline&&(loadingKey===requestText||(!result&&marketRef.kind==='coin'));
 const refreshAllowed=!loading&&now>=(result?.nextAttemptAt??0);
 const decimals=Math.max(0,...points.map(p=>p.decimals));
 const units=points.map(p=>BigInt(p.value)*10n**BigInt(decimals-p.decimals));
 const cost=costLine&&units.length>1?decimalUnits(costLine.value,decimals):null;
 const minimum=units.length?[...units,...(cost!==null?[cost]:[])].reduce((a,b)=>a<b?a:b):0n,maximum=units.length?[...units,...(cost!==null?[cost]:[])].reduce((a,b)=>a>b?a:b):0n;
 const times=points.map(p=>Date.parse(p.at)),start=times[0]??0,end=times[times.length-1]??0;
 const x=(at:string)=>28+(end===start?352:(Date.parse(at)-start)/(end-start)*704);
 const y=(value:bigint)=>maximum===minimum?124:214-Number((value-minimum)*18000n/(maximum-minimum))/100;
 const groups:number[][]=[];
 points.forEach((point,index)=>{const group=groups.at(-1),last=group?.at(-1);if(last===undefined||Date.parse(point.at)-Date.parse(points[last]!.at)>7*86400000)groups.push([index]);else group!.push(index);});
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
 return <figure ref={entrance} className="price-chart" aria-label={title}>
  <div className="price-chart-heading"><div><span className="price-chart-eyebrow">Market perspective</span><h3>{title}</h3></div>{marketRef.kind==='coin'&&!offline&&<button type="button" className="price-chart-refresh" disabled={!refreshAllowed} onClick={()=>void refresh()}>{loading?'Loading…':!refreshAllowed?'Refresh available soon':'Refresh chart'}</button>}</div>
  <div className="price-chart-source"><span className={`price-chart-dot ${isStale?'is-stale':''}`} aria-hidden="true"/>{source}{history&&<span className={isStale?'price-chart-stale':''}>{isStale?'Saved market history':'Recently fetched history'}</span>}</div>
  {current&&<div className="price-chart-quote"><div><strong>{formatHistoryPrice(current,currency)}</strong><span><time dateTime={current.at}>{formatDateTime(current.at)}</time> · {inspectedAt?'chart observation':'last chart observation'}</span></div>{changeText&&<div className={`price-chart-change ${change!<0n?'is-negative':''}`}><strong>{changeText}</strong><span>{/* Session AL (TK-033): never read as the 24h change shown above */}Change over this chart ({labels[selectedRange]}), not the 24h change</span></div>}</div>}
  {ranges.length>0&&<div className="price-chart-ranges" role="group" aria-label="Chart range">{ranges.map(value=><button type="button" key={value} aria-pressed={range==='1y'&&!found.includes('1y')?value==='1y':selectedRange===value} onClick={()=>{setRange(value);setInspectedAt(null);}}>{labels[value]}</button>)}</div>}{range==='1y'&&!found.includes('1y')&&<p className="fine" role="status">{history?.range==='1y'?'Less than a year of prices is available: all of them are shown.':'Loading a year of prices…'}</p>}
  {points.length?<>
   {points.length>1&&<svg className="price-chart-plot zg-chart" data-pillar="wealth" viewBox="0 0 760 256" role="img" tabIndex={points.length>1?0:undefined} aria-labelledby={`${id}-title`} onPointerMove={event=>{const rect=event.currentTarget.getBoundingClientRect();inspect(event.clientX,rect.left,rect.width);}} onPointerLeave={()=>setInspectedAt(null)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const at=Math.max(0,points.findIndex(p=>p.at===current?.at)),next=event.key==='Home'?0:event.key==='End'?points.length-1:Math.max(0,Math.min(points.length-1,at+(event.key==='ArrowLeft'?-1:1)));setInspectedAt(points[next]!.at);}}>
    <title id={`${id}-title`}>{title}. {points.length} dated price observations in {currency}. Exact history table below. Arrow keys inspect observations.</title>
    {/* Session AK (G3): the one chart look — the price line in its gradient with one soft glow (none by day). */}<ChartLookDefs id={look.id} width={760} height={256}/>
    <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9a79ed" stopOpacity=".22"/><stop offset="100%" stopColor="#9a79ed" stopOpacity="0"/></linearGradient></defs>
    <g className="chart-grid" aria-hidden="true">{[34,94,154,214].map(gridY=><line key={gridY} x1="28" x2="732" y1={gridY} y2={gridY}/>)}</g>
    {groups.filter(group=>group.length>1).map((group,index)=>{const coordinates=group.map(i=>`${x(points[i]!.at)},${y(units[i]!)}`).join(' ');return <g key={index}><polygon points={`${x(points[group[0]!]!.at)},230 ${coordinates} ${x(points[group.at(-1)!]!.at)},230`} fill={`url(#${id}-fill)`}/><polyline className="price-chart-line zgc-line" pathLength={1} points={coordinates} fill="none" style={{stroke:look.stroke('a')}} filter={look.glow} strokeWidth="2.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></g>;})}
    {points.map((point,index)=><circle data-observation key={point.at} cx={x(point.at)} cy={y(units[index]!)} r={point.at===current?.at?4:1.8} fill={point.at===current?.at?'#eef5ff':'#aab3ff'} style={{'--at':((x(point.at)-28)/704).toFixed(3)} as CSSProperties}><title>{formatDateTime(point.at)} · {formatHistoryPrice(point,currency)}</title></circle>)}
    {cost!==null&&<line className="price-chart-cost" x1="28" x2="732" y1={y(cost)} y2={y(cost)} strokeDasharray="7 6" aria-hidden="true"/>}
    {current&&<line className="chart-cursor" x1={x(current.at)} x2={x(current.at)} y1="28" y2="222"/>}

   </svg>}
   <div className="price-chart-axis"><time dateTime={points[0]!.at}>{formatDate(points[0]!.at)}</time>{points.length>1&&<time dateTime={points[points.length-1]!.at}>{formatDate(points[points.length-1]!.at)}</time>}</div>
   {points.length===1&&<div className="price-chart-single"><strong>Tracking starts here</strong><p>One observed price is saved. Earlier performance is not assumed.</p></div>}
  </>:<div className="price-chart-empty"><LazyPillarArt pillar="wealth" size={72}/><h4>{loading?'Loading observed prices':'Your price history starts here'}</h4><p>{loading?'Checking available market history.':'Prices will appear as verified observations become available. Earlier performance is not assumed.'}</p></div>}
  <figcaption>
   {cost!==null&&costLine&&<span className="price-chart-cost-key"><svg width="26" height="10" aria-hidden="true"><line x1="1" x2="25" y1="5" y2="5" strokeDasharray="7 6"/></svg>Dashed line: {costLine.label}, {formatHistoryPrice({at:'',value:cost.toString(),decimals},currency)}.</span>}
   {points.length>1&&<span>Connecting lines are illustrative; gaps longer than seven days remain open. The vertical scale fits observed prices, not a zero baseline. This is market context, not your portfolio return.</span>}
   {offline?'Showcase fixture prices, not market data.':marketRef.kind==='rwa'?RWA_HISTORY_UNAVAILABLE:history?'Dated market observations. Lines connect observed prices; values between them are not recorded prices.':result?.error&&marketRef.kind==='coin'?null:'Saved local price observations. Market history is currently unavailable.'}
   {history&&<span>Fetched <time dateTime={history.fetchedAt}>{formatDateTime(history.fetchedAt)}</time> · {currency} per asset unit. The chart’s last observation can differ from the current price at the top of the page, which has its own time.</span>}
   {result?.error&&marketRef.kind==='coin'&&<span className="price-chart-limitation" role="status">{result.error}</span>}
  </figcaption>
  {points.length>0&&<details className="price-chart-details"><summary>View exact price history <span>{points.length} {points.length===1?'observation':'observations'}</span></summary><div className="price-chart-table-wrap" tabIndex={0} role="region" aria-label="Exact price history"><table><caption>{source} · {currency} per asset unit</caption><thead><tr><th scope="col">Observed at</th><th scope="col">Price ({currency})</th></tr></thead><tbody>{points.map(point=><tr key={point.at}><td><time dateTime={point.at}>{formatDateTime(point.at,{seconds:true})}</time></td><td>{formatPlainDecimal(formatHistoryValue(point))}</td></tr>)}</tbody></table></div></details>}
 </figure>;
}
