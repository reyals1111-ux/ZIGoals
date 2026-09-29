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
