import {parseUnits} from '@zigoals/chain-config';
import {positionSchema} from './positions';
export const MANUAL_SOURCES=['Cash','Crypto','Stablecoins','Stocks','Precious metals','Custom asset'] as const;
export type ManualSource={category:typeof MANUAL_SOURCES[number];name:string;quantity:string;currency:string;symbol?:string;metal?:string;unit?:string;value?:string;price?:string;notes?:string};
/** User-entered evidence only. Prices are per entered unit; no pegs or FX inferred. */
export function manualSourcePosition(input:ManualSource,id=crypto.randomUUID(),observedAt=new Date().toISOString()){
 const currency=input.currency.trim().toUpperCase();
 if(!/^[A-Z]{3}$/.test(currency))throw Error('Enter a three-letter valuation currency.');
 const quantity=parseUnits(input.quantity||(input.category==='Custom asset'?'1':''),18);
 if(quantity<=0n)throw Error('Enter a positive quantity.');
 const asset=input.category==='Cash'?currency:input.category==='Custom asset'?'UNIT':input.category==='Precious metals'?`${input.metal||'Gold'} ${input.unit||'grams'}`:(input.symbol||input.name).trim().toUpperCase();
 const value=input.value?parseUnits(input.value,2):input.price?quantity*parseUnits(input.price,18)*100n/10n**36n:input.category==='Cash'?quantity*100n/10n**18n:undefined;
 return positionSchema.parse({id,providerId:input.name.trim(),sourceType:'MANUAL',network:'manual',account:'local',asset,denom:asset==='ZIG'?'azig':`manual:${asset}`,quantity:quantity.toString(),decimals:18,verification:'MANUAL',sync:'MANUAL',liquidity:input.category==='Cash'?'LIQUID':'UNKNOWN',observedAt,provenance:`Manual ${input.category}; explicit user entry, not verified`,notes:input.notes||'',valuation:value===undefined?undefined:{value:value.toString(),currency,decimals:2,source:'MANUAL',observedAt}});
}
