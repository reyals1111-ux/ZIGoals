import {expect,it} from 'vitest';
import {publicMarketWorkKey,type PublicMarketWork} from './market-coordinator';
const work:PublicMarketWork={operation:'quote',pair:{marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'}};
it('normalizes only public work fields and separates currencies/ranges/kinds',()=>{
 expect(publicMarketWorkKey(work)).toBe('["quote","coingecko","coin","bitcoin","USD"]');
 expect(publicMarketWorkKey({...work,pair:{...work.pair,currency:'EUR'}})).not.toBe(publicMarketWorkKey(work));
 expect(()=>publicMarketWorkKey({...work,wallet:'private'} as PublicMarketWork)).toThrow();
 expect(()=>publicMarketWorkKey({...work,pair:{...work.pair,quantity:'private'}} as PublicMarketWork)).toThrow();
});
it('rejects private fields at compile time as well as runtime',()=>{
 // @ts-expect-error Wallet is not a public coordinator key.
 const privateWork:PublicMarketWork={...work,wallet:'private'};
 expect(()=>publicMarketWorkKey(privateWork)).toThrow();
});
