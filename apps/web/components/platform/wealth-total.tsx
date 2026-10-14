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
/** The person's base currency for Wealth's figures (owner request 24): their choice, else the device's default currency
 * (AB-Cloud's useDefaultCurrency(): euro in the euro area, US dollars otherwise; USD during hydration). */
export function useBaseCurrency(){const prefs=useUiPrefs(),fallback=useDefaultCurrency();return baseCurrencyOf(prefs.data,fallback);}
/**
 * Owner request 24 (finished at the second merger, Phase 2 Part 12): the person picks the currency Wealth's headline and
 * rows are shown in — US dollars or euro, the two the app keeps. Until they pick, the device's default applies. Nothing is
 * converted: the other currency stays in its chip.
 */
export function BaseCurrencySwitch(){
 const prefs=useUiPrefs(),base=useBaseCurrency();
 return <div className="wealth-base-switch" role="group" aria-label="Show totals in">
  <span aria-hidden="true">Totals in</span>
  {(['USD','EUR'] as const).map(c=><button key={c} type="button" className="quiet" aria-pressed={base===c} disabled={!prefs.loaded||prefs.unreadable} onClick={()=>{try{prefs.update(p=>({...p,baseCurrency:c}));}catch{/* the device record reports its own failure */}}}>{c}</button>)}
 </div>;
}
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
   <small>Currency totals stay separate. No FX assumed.</small>
  </span>}
 </span>;
}
/** One large headline total in the base currency; other currencies as a chip, never converted. */
export function WealthTotal({subtotals,identity,empty}:{subtotals:readonly CurrencyTotal[];identity:string;empty:string}){
 const base=useBaseCurrency(),{primary,others,baseEmpty}=splitWealthTotals(subtotals,base);
 if(!primary)return <strong className="wealth-total-headline wealth-total-empty">{empty}</strong>;
 return <>
  <strong className="wealth-total-headline"><NebulaFlow identity={identity}>{money(primary.value,primary.currency)}</NebulaFlow></strong>
  {baseEmpty&&<span className="wealth-total-base-note">Nothing tracked in {base} yet</span>}
  <OtherCurrencyChip others={others} id={identity}/>
 </>;
}
/** A row's figure (Allocated to Goals, Available for Goals): the base currency's amount, then the chip for the rest. */
export function SplitMoney({subtotals,id}:{subtotals:readonly CurrencyTotal[];id:string}){
 const base=useBaseCurrency(),{primary,others}=splitWealthTotals(subtotals,base);
 if(!primary)return <span>—</span>;
 return <><span>{money(primary.value,primary.currency)}</span><OtherCurrencyChip others={others} id={id}/></>;
}
