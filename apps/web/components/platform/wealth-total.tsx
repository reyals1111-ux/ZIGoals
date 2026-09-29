'use client';
import {NebulaFlow} from '../nebula-flow';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from './common';
import {splitWealthTotals,type CurrencyTotal} from '../../lib/wealth-total';
const money=(value:bigint,currency:string)=>`${value<0n?'-':''}${formatGoalAmount(amount((value<0n?-value:value).toString(),2),currency)}`;
/** One large headline total in one currency; other currencies on a smaller line, never converted. */
export function WealthTotal({subtotals,identity,empty}:{subtotals:readonly CurrencyTotal[];identity:string;empty:string}){
 const {primary,others}=splitWealthTotals(subtotals);
 if(!primary)return <strong className="wealth-total-headline wealth-total-empty">{empty}</strong>;
 return <>
  <strong className="wealth-total-headline"><NebulaFlow identity={identity}>{money(primary.value,primary.currency)}</NebulaFlow></strong>
  {others.map(o=><span key={o.currency} className="wealth-total-other">+ {money(o.value,o.currency)} held in {o.currency} · not converted</span>)}
 </>;
}
