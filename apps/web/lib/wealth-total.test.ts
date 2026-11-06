import {expect,test} from 'vitest';
import {splitWealthTotals} from './wealth-total';
test('the headline is the largest known currency total; the others stay separate and unconverted',()=>{
 expect(splitWealthTotals([])).toEqual({others:[]});
 const usd={currency:'USD',value:50180000n},eur={currency:'EUR',value:800000n};
 expect(splitWealthTotals([usd,eur])).toEqual({primary:usd,others:[eur]});
 expect(splitWealthTotals([eur,usd])).toEqual({primary:usd,others:[eur]});
 // A tie keeps the existing order.
 const a={currency:'EUR',value:5n},b={currency:'USD',value:5n};expect(splitWealthTotals([a,b]).primary).toBe(a);
 // Nothing is summed across currencies.
 const split=splitWealthTotals([usd,eur]);expect([split.primary,...split.others].map(s=>s!.value)).toEqual([50180000n,800000n]);
});
import {heroNetWorth} from './wealth-total';
test('TK-039/TK-132: with accounts or debts, the hero states net worth per currency and flags debts larger than what is owned',()=>{
 const m=(value:bigint)=>({value,decimals:2});
 // Holdings only: the headline already is the whole picture, so no extra line.
 expect(heroNetWorth([{currency:'USD',assets:m(0n),holdings:m(4376272n),debts:m(0n),net:m(4376272n),accounts:0}])).toEqual([]);
 // The bot's case: EUR holdings 289,200 and a debt of 999,999,999,999.99 → net worth −999,999,710,799.99, flagged.
 const eur={currency:'EUR',assets:m(150000n),holdings:m(28920000n),debts:m(99999999999999n),net:m(150000n+28920000n-99999999999999n),accounts:2};
 const usd={currency:'USD',assets:m(0n),holdings:m(4376272n),debts:m(0n),net:m(4376272n),accounts:0};
 const lines=heroNetWorth([eur,usd]);
 expect(lines).toHaveLength(2);
 expect(lines[0]).toMatchObject({currency:'EUR',debtsExceed:true});
 expect(lines[0]!.net.value).toBe(-99999970929999n);
 expect(lines[1]).toMatchObject({currency:'USD',debtsExceed:false});
});
