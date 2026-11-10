// Session AL (lane L1, Tokyo): small pure helpers behind Wealth, Portfolio and Markets fixes.
import {expect,it} from 'vitest';
import {pastedPastLimit} from '../components/platform/asset-picker';
import {valuationCurrency} from '../components/platform/asset-editor';

it('TK-149: a paste past an asset name’s 100 characters is said, never cut silently',()=>{
 const empty={value:'',selectionStart:0,selectionEnd:0};
 expect(pastedPastLimit(empty,'x'.repeat(100),100)).toBeNull();
 expect(pastedPastLimit(empty,'x'.repeat(220),100)).toMatch(/120 characters/);
 // Replacing a selection counts only what stays.
 expect(pastedPastLimit({value:'abcdef',selectionStart:0,selectionEnd:6},'y'.repeat(100),100)).toBeNull();
});

it('TK-014/W5: Edit asset refuses an invented valuation currency, as Add asset, accounts and the CSV import do',()=>{
 expect(valuationCurrency(' eur ')).toBe('EUR');
 expect(valuationCurrency('GBP')).toBe('GBP');
 expect(()=>valuationCurrency('XYZ')).toThrow(/not a currency code/);
 expect(()=>valuationCurrency('')).toThrow(/Enter the valuation currency/);
});

it('TK-170: a change that rounds to zero reads 0% and is flat; real changes keep their sign',async()=>{
 const {percent,direction}=await import('../components/markets/market-format');
 expect(percent('-0.004')).toBe('0%');expect(direction('-0.004')).toBe('flat');
 expect(percent('0.004')).toBe('0%');
 expect(percent('-3.25')).toBe('−3.25%');expect(percent('2')).toBe('+2%');expect(direction('-3.25')).toBe('down');
});

it('TK-187/W24: the asset page counts an allocation at its share of what the asset holds now',async()=>{
 const {effectiveAllocation}=await import('../components/platform/asset-detail');
 const e18=10n**18n,q=(n:bigint)=>(n*e18).toString();
 // One Goal holds 5,000 of a savings asset cut to 4,000: it counts 4,000.
 expect(effectiveAllocation(q(5000n),[{quantity:q(5000n)}],q(4000n))).toBe(q(4000n));
 // Enough held: unchanged.
 expect(effectiveAllocation(q(3000n),[{quantity:q(3000n)}],q(4000n))).toBe(q(3000n));
 // Two Goals share the cut in proportion.
 expect(effectiveAllocation(q(3000n),[{quantity:q(3000n)},{quantity:q(1000n)}],q(2000n))).toBe(q(1500n));
});
