'use client';
import {useEffect, useRef, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {formatSignedGoalAmount} from '../../lib/goal-summary';
import {amount} from './common';
import {splitWealthTotals,type CurrencyTotal} from '../../lib/wealth-total';
import {useUiPrefs} from '../../lib/ui-prefs/use-ui-prefs';
import {baseCurrencyOf} from '../../lib/ui-prefs/schema';
import {useDefaultCurrency} from '../../lib/default-currency';
import './wealth-total.css';
/** A whole-currency amount as Wealth shows it (Today's Life overview reads it too). */
export const wealthMoney=(value:bigint,currency:string)=>formatSignedGoalAmount(value<0n,amount((value<0n?-value:value).toString(),2),currency);
const money=(value:bigint,currency:string)=>formatSignedGoalAmount(value<0n,amount((value<0n?-value:value).toString(),2),currency);
/** The currency the app asks prices in for wallets and Add money: the person's earlier choice, else the device's default
 * (AB-Cloud's useDefaultCurrency(): euro in the euro area, US dollars otherwise; USD during hydration). These are real
 * quotes in that currency, never a conversion. */
export function useBaseCurrency(){const prefs=useUiPrefs(),fallback=useDefaultCurrency();return baseCurrencyOf(prefs.data,fallback);}
/** Session AH (TR7, owner amendment 6): the app has no exchange-rate source, so totals are never shown "in" another
 * currency. The USD/EUR switch is gone; this line says the combined total is coming later. */
export const ONE_CURRENCY_LATER='One total in a single currency is coming later.';
/**
 * Session AB-Design (owner request 24): other currencies as one small chip — "+ €8,000 held in EUR" — that opens the
 * details (each currency's total, never converted, no FX assumed); nothing shows when every other total is zero.
 */
export function OtherCurrencyChip({others,id}:{others:readonly CurrencyTotal[];id:string}){
 const shown=others.filter(o=>o.value!==0n),[open,setOpen]=useState(false),root=useRef<HTMLSpanElement>(null);
 useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 if(!shown.length)return null;
 const first=shown[0]!;
 return <span ref={root} className="wealth-other-chip" onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();setOpen(false);}}}>
  <button type="button" className="wealth-other-chip-button" aria-expanded={open} aria-controls={`${id}-others`} onClick={()=>setOpen(v=>!v)}>+ {money(first.value,first.currency)} held in {first.currency}{shown.length>1?` · +${shown.length-1}`:''}</button>
  {open&&<span id={`${id}-others`} className="wealth-other-chip-panel" role="group" aria-label="Other currencies">
   {shown.map(o=><span key={o.currency} className="wealth-total-other">+ {money(o.value,o.currency)} held in {o.currency} · not converted</span>)}
   <small>Currency totals stay separate. No FX assumed. {ONE_CURRENCY_LATER}</small>
  </span>}
 </span>;
}
/** One large headline total, in the currency with the largest total (TR7: no switch while nothing converts); other
 * currencies as a chip, never converted. */
export function WealthTotal({subtotals,identity,empty}:{subtotals:readonly CurrencyTotal[];identity:string;empty:string}){
 const {primary,others}=splitWealthTotals(subtotals);
 if(!primary)return <strong className="wealth-total-headline wealth-total-empty">{empty}</strong>;
 return <>
  <strong className="wealth-total-headline" style={{'--chars':money(primary.value,primary.currency).length} as import('react').CSSProperties}><NebulaFlow identity={identity}>{money(primary.value,primary.currency)}</NebulaFlow></strong>
  <OtherCurrencyChip others={others} id={identity}/>
 </>;
}
/** A row's figure (Allocated to Goals, Available for Goals): the headline currency's amount, then the chip for the rest. */
export function SplitMoney({subtotals,id,lead}:{subtotals:readonly CurrencyTotal[];id:string;lead?:string}){
 const {primary,others}=splitWealthTotals(subtotals,lead);
 if(!primary)return <span>—</span>;
 return <><span className="split-figure" style={{'--chars':money(primary.value,primary.currency).length} as import('react').CSSProperties}>{money(primary.value,primary.currency)}</span><OtherCurrencyChip others={others} id={id}/></>;
}
