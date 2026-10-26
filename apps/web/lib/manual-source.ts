import {isMoneyCurrency} from './visual-format';
import {parseAmountInput} from './amount-input';
import {visibleName} from './visible-text';
import {positionSchema} from './positions';
import {moneyUnitsIssue,quantityUnitsIssue,within} from './limits/plausibility';
export const MANUAL_SOURCES=['Cash','Crypto','Stablecoins','Stocks','Precious metals','Property','Custom asset'] as const;
export type ManualSource={category:typeof MANUAL_SOURCES[number];name:string;quantity:string;currency:string;symbol?:string;metal?:string;unit?:string;value?:string;price?:string;notes?:string};
/** User-entered evidence only. Prices are per entered unit; no pegs or FX inferred. */
export function manualSourcePosition(input:ManualSource,id=crypto.randomUUID(),observedAt=new Date().toISOString()){
 const currency=input.currency.trim().toUpperCase();
 /* Session AH (WE6, L-015): a real currency, from the list the browser knows, never an invented code */if(!isMoneyCurrency(currency))throw Error(`“${currency}” is not a currency code. Choose one such as USD, EUR or GBP.`);
 if(input.category==='Property'&&!input.value)throw Error('Enter the current property value.');
 const quantity=parseAmountInput(input.quantity||(['Custom asset','Property'].includes(input.category)?'1':''),18);
 if(quantity<=0n)throw Error('Enter a positive quantity.');
 within(quantityUnitsIssue(quantity,18)); // Session AH (VA2, B3)
 const asset=input.category==='Cash'?currency:['Custom asset','Property'].includes(input.category)?'UNIT':input.category==='Precious metals'?`${input.metal||'Gold'} ${input.unit||'grams'}`:(input.symbol||input.name).trim().toUpperCase();
 const value=input.value?parseAmountInput(input.value,2):input.price?quantity*parseAmountInput(input.price,18)*100n/10n**36n:input.category==='Cash'?quantity*100n/10n**18n:undefined;
 if(value!==undefined)within(moneyUnitsIssue(value,2));
 return positionSchema.parse({id,assetClass:input.category==='Precious metals'?'Precious Metals':input.category==='Custom asset'?'Custom':input.category,providerId:visibleName(input.name.trim(),'Name the asset with at least one visible character.'),sourceType:'MANUAL',network:'manual',account:'local',asset,denom:asset==='ZIG'?'azig':`manual:${asset}`,quantity:quantity.toString(),decimals:18,verification:'MANUAL',sync:'MANUAL',liquidity:input.category==='Cash'?'LIQUID':'UNKNOWN',observedAt,provenance:`Manual ${input.category}; explicit user entry, not verified`,notes:input.notes||'',valuation:value===undefined?undefined:{value:value.toString(),currency,decimals:2,source:'MANUAL',observedAt}});
}
