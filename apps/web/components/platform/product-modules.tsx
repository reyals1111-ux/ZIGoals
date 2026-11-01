"use client";
import type {LayoutAttrs} from '../layout-edit';
import Link from 'next/link';
import {useState} from 'react';
import './run92-gap-fixes.css';
import {portfolioComposition,needsAttention,fundingAgenda} from '../../lib/product-insights';
import type {Platform} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';
import {wealthOverview} from '../../lib/wealth';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from './common';
import {usePhoneActive} from '../phone/use-phone-layout';
import {usePhoneShowAll} from '../phone/phone-show-all';
import {GlassBar,GlassRing} from '../progress/glass-progress';
import { formatDate, formatPlainDecimal } from "../../lib/visual-format";
import {nextMoneySteps,stepSplit} from '../../lib/today/next-money-steps';
const money=(value:bigint,currency:string)=>formatGoalAmount(amount(value.toString(),2),currency);
export function PortfolioComposition({overview,...layout}:LayoutAttrs&{overview:ReturnType<typeof wealthOverview>}){
 const groups=portfolioComposition(overview);
 return <section {...layout} className="portfolio-composition panel" aria-labelledby="composition-title"><header className="section-heading"><div><p className="eyebrow">THE SHAPE OF YOUR WEALTH</p><h2 id="composition-title">Portfolio composition</h2><p>Asset classes, your largest holdings and what is available for Goals. Currencies stay separate.</p></div></header>{groups.length?groups.map(group=>{
 let end=0;const arcs=group.segments.map(s=>{end+=s.basisPoints/100;return {key:s.label,end,color:s.color};});
 return <div className="composition-group" key={group.currency} role="group" aria-label={`${group.currency} portfolio composition`}><div className="composition-currency"><GlassRing identity={`composition:${group.currency}`} arcs={arcs} className="composition-donut" role="img" aria-label={`${group.currency} composition: ${group.segments.map(s=>`${s.label} ${formatPlainDecimal((s.basisPoints/100).toFixed(2))}%`).join(', ')}`}><span><small>{group.currency} known total</small><strong style={{'--chars':money(group.total,group.currency).length} as import('react').CSSProperties}>{money(group.total,group.currency)}</strong></span></GlassRing><dl className="composition-legend">{group.segments.map(s=><div key={s.label}><dt><i style={{background:s.color}}/>{s.label}</dt><dd><strong>{money(s.value,group.currency)}</strong><span>{formatPlainDecimal((s.basisPoints/100).toFixed(2))}%</span></dd></div>)}</dl></div><div className="composition-details"><section className="composition-allocation" aria-label={`${group.currency} allocated and available`}><h3>Purpose &amp; possibility</h3><GlassBar identity={`composition-allocation:${group.currency}`} className="composition-allocation-bar" role="img" aria-label={`${formatPlainDecimal((group.allocatedBasisPoints/100).toFixed(2))}% allocated to Goals`} value={group.allocatedBasisPoints/10000}/><dl><div><dt>Allocated to Goals</dt><dd>{money(group.allocated,group.currency)}</dd></div><div><dt>Available for Goals</dt><dd>{money(group.available,group.currency)}</dd></div></dl>{group.incomplete&&<p className="fine">Known valued holdings only. Unvalued assets are excluded.</p>}</section><TopHoldings currency={group.currency} holdings={group.topHoldings}/></div></div>;
 }):<p>Add a valued asset to see how your portfolio fits together.</p>}</section>;
}
/** A currency's largest holdings; on a phone the first three, then "Show all" (Session G, Part 4). */
function TopHoldings({currency,holdings}:{currency:string;holdings:ReturnType<typeof portfolioComposition>[number]['topHoldings']}){
 const more=usePhoneShowAll(3);
 return <section className="composition-top-holdings" aria-label={`${currency} top holdings`}><h3>Top holdings <small>{currency}</small></h3><ol {...more.listProps(holdings.length)}>{holdings.map(holding=><li key={holding.id}><Link href={`/app/wealth/asset/${encodeURIComponent(holding.id)}`}><span>{holding.name}</span><strong>{money(holding.value,currency)}</strong></Link><GlassBar identity={`top-holding:${holding.id}`} className="top-holding-bar" aria-hidden="true" value={holding.basisPoints/10000}/><small>{formatPlainDecimal((holding.basisPoints/100).toFixed(2))}% of {currency} known wealth</small></li>)}</ol>{more.button(holdings.length,'holdings')}</section>;
}
/**
 * Session AK RB (RELEASE_REVIEW_2 R2-9): "Next money steps" — Needs attention and the funding agenda in one list on Today,
 * and a goal shown once: goals already on Today (`shownGoals`: the "What matters today" goal and the goal cards) are left
 * out (lib/today/next-money-steps.ts). Assets that need a look always stay. Same section, id and class as before.
 */
export function NeedsAttention({data,now,quotes,shownGoals}:{data:Platform;now:number;quotes:readonly MarketQuote[];shownGoals?:ReadonlySet<string>}){const steps=nextMoneySteps(needsAttention(data,now,quotes),fundingAgenda(data,now,quotes),shownGoals??new Set<string>()),[all,setAll]=useState(false),phone=usePhoneActive(),first=phone?2:4;return <section className="needs-attention panel" id="needs-attention" aria-labelledby="attention-title"><header className="section-heading"><div><p className="eyebrow">YOUR NEXT USEFUL STEP</p><h2 id="attention-title">Next money steps <span className="attention-count">{steps.length}</span></h2>{steps.length>0&&<p className="attention-split">{/* Session AC (persona #12): Today counts goals and assets; Wealth's "need attention" counts the assets alone. */}{stepSplit(steps)}</p>}</div></header>{steps.length?<ul {...(phone&&!all&&steps.length>2?{'data-phone-limit':'2'}:{})}>{(all?steps:steps.slice(0,4)).map(s=>s.kind==='attention'?<li key={s.item.id} data-kind={s.item.kind}><span className="attention-symbol" aria-hidden="true">{s.item.kind==='overdue'?'↗':s.item.kind==='plan'?'+':'!'}</span><div><h3>{s.item.title}</h3><p>{s.item.detail}</p><Link href={s.item.href} className="text-link">{s.item.action} →</Link></div></li>:<li key={`agenda:${s.row.goalId}`} data-kind="agenda"><span className="attention-symbol" aria-hidden="true">→</span><div><h3>{s.row.name}</h3><p>{formatGoalAmount(amount(s.row.amount,s.row.decimals),s.row.asset)} · {s.row.cadence} · {s.row.nextDate?`next ${formatDate(s.row.nextDate,{year:false})}`:'no date yet'}</p><Link href={s.row.href} className="text-link">Review →</Link></div></li>)}</ul>:<div className="attention-clear"><span aria-hidden="true">✓</span><h3>A clear view ahead</h3><p>{shownGoals?.size?'Your goals above show their own next steps. No asset needs a look right now.':'No funding or valuation issues need your attention right now.'}</p><Link className="text-link" href="/app/goals">Explore your Goals →</Link></div>}{steps.length>first&&<button className="quiet" onClick={()=>setAll(!all)}>{all?'Show fewer':`View all ${steps.length} items`}</button>}</section>;}
// Session AK RB (RELEASE_REVIEW_2 R2-9): FundingAgenda (Today's "Your funding agenda") is part of NeedsAttention's "Next money steps" now.
