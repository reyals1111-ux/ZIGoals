import Decimal from 'decimal.js';
import {displayLocale,formatExactNumber,formatMoney,isMoneyCurrency} from '../visual-format';
import {isUnitWord,unitAmount,unitWord} from './goal-units';

/**
 * A goal's amount as text (lib/goal-summary.ts re-exports `formatGoalAmount`), in its own module (CI13, weights) so a page
 * that only writes amounts (Activity's goal rows) does not load the goal summaries and Wealth with it.
 */
const HUGE=new Decimal('1e18');
/** A legacy amount of 10^18 or more (past every cap), written compactly ("$100,000,000T"); the exact digits stay in the record. */
function hugeAmount(d:Decimal,currency:string,locale:string){
 const n=d.toNumber();
 if(isMoneyCurrency(currency))try{return new Intl.NumberFormat(locale,{style:'currency',currency,notation:'compact',maximumFractionDigits:1}).format(n);}catch{/* below */}
 const text=new Intl.NumberFormat(locale,{notation:'compact',maximumFractionDigits:1}).format(n);
 return `${text} ${isUnitWord(currency)?unitWord(currency):currency}`;
}
/** Money (an ISO currency) always shows its minor digits (Session I, Part 5); quantities (ZIG, BTC, milestones) are unchanged. */
export function formatGoalAmount(value:string,currency:string,locale=displayLocale()){
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value))return 'Unavailable';
 const decimal=new Decimal(value);if(!decimal.isFinite())return 'Unavailable';
 // Session AL (DV-054/DV-057d/DV-084b/DV-125, D-195): a value saved before the trillion cap (1e20, 1e28) reads short, never
 // as 29 digits that break a card, Today or Activity. New values are refused above a trillion (lib/goals/goal-amount.ts).
 if(decimal.abs().gte(HUGE))return hugeAmount(decimal,currency,locale);
 // Session AL (DV-014): a count Goal's own word reads "20 books" / "1 book", never "20 BOOKS" or a coin symbol.
 if(!isMoneyCurrency(currency)&&isUnitWord(currency))return unitAmount(decimal.toDecimalPlaces(2,Decimal.ROUND_DOWN).toNumber(),currency);
 if(isMoneyCurrency(currency))return formatMoney(value,currency,locale,{display:currency==='USD'||currency==='EUR'?'symbol':'code'});
 const n=decimal.toDecimalPlaces(currency==='ZIG'?6:2,Decimal.ROUND_DOWN).toFixed();
 return `${formatExactNumber(n,locale)} ${currency}`;
}
