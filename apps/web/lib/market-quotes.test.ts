import {expect,it,vi} from 'vitest';
import {emptyPlatform,goalProgress,positionSchema,derivedGoalStatus,type Platform} from './positions';
import {parseCoinGeckoQuote,nativeZigIdentity,quoteIsStale,quoteValue,type MarketQuote} from './market-quotes';
import {createQuoteCache} from './market-quote-cache';
const now=Date.parse('2026-09-18T12:00:00Z');
const quote:MarketQuote={base:nativeZigIdentity,currency:'USD',price:'43',priceDecimals:3,source:'CoinGecko',providerAssetId:'zignaly',observedAt:new Date(now).toISOString(),verification:'VERIFIED'};
const state=():Platform=>({...emptyPlatform(),positions:[positionSchema.parse({id:'p',providerId:'native-zig',sourceType:'NATIVE_STAKING',network:'zigchain-1',account:'public',asset:'ZIG',denom:'uzig',decimals:6,quantity:'263000000000',verification:'VERIFIED_READ_ONLY',sync:'CURRENT',observedAt:new Date(now).toISOString(),liquidity:'BONDED',provenance:'chain'})],goals:[{id:'1',network:'zigchain-1',name:'Value',type:'VALUE',status:'active',asset:'USD',denom:'USD',decimals:2,target:'50000000',notes:'',createdAt:new Date(now).toISOString(),milestones:[]}],allocations:[{goalId:'1',positionId:'p',quantity:'263000000000'}]});
it('values allocated principal exactly and independently of a Number-sized quantity',()=>{
 expect(goalProgress(state(),'1',now,[quote])).toMatchObject({current:'1130900',verified:'1130900',missingValuation:false,progressPct:'2.26'});
 expect(quoteValue('9007199254740993000000',6,quote,2)).toBe('38730956795386269');
 expect(quoteValue('1',6,quote,2)).toBe('0');
});
it('requires canonical identity and matching currency and never converts Quantity progress',()=>{
 for(const patch of [{network:'zig-test-2'},{denom:'fake'},{decimals:18}]){const s=state();Object.assign(s.positions[0]!,patch);expect(goalProgress(s,'1',now,[quote]).current).toBe('0');}
 expect(goalProgress(state(),'1',now,[{...quote,currency:'EUR'}]).missingValuation).toBe(true);
 const s=state();Object.assign(s.goals[0]!,{type:'QUANTITY',asset:'ZIG',denom:'uzig',decimals:6});expect(goalProgress(s,'1',now,[quote]).current).toBe('263000000000');
});
it('retains stale valuation with evidence, distinguishes missing, and derives completion',()=>{
 const stale=now+16*60000;expect(quoteIsStale(quote,stale)).toBe(true);
 expect(goalProgress(state(),'1',stale,[quote])).toMatchObject({current:'1130900',requiresReview:true,staleValuation:true,breakdown:[{valuation:{state:'stale',source:'CoinGecko'}}]});
 expect(goalProgress(state(),'1',now)).toMatchObject({current:'0',missingValuation:true});
 const s=state();s.goals[0]!.target='100';expect(derivedGoalStatus(s,'1',now,[quote])).toBe('completed');s.goals[0]!.status='closed';expect(derivedGoalStatus(s,'1',now,[quote])).toBe('closed');
});
it('preserves proportional deficit accounting and explicitly manual values',()=>{
 const s=state();s.positions[0]!.quantity='131500000000';expect(goalProgress(s,'1',now,[quote])).toMatchObject({current:'565450',requiresReview:true});
 s.positions[0]!.valuation={value:'500',currency:'USD',decimals:2,source:'MANUAL',observedAt:new Date(now).toISOString()};expect(goalProgress(s,'1',now,[quote])).toMatchObject({current:'500',manual:'500',breakdown:[{valuation:{state:'manual'}}]});
});
it('parses exact provider decimal text and rejects malformed, zero and future evidence',()=>{
 const raw=`{"zignaly":{"usd":0.052543775042079535,"last_updated_at":${now/1000}}}`;
 expect(parseCoinGeckoQuote(raw,now)).toMatchObject({price:'52543775042079535',priceDecimals:18});
 for(const usd of ['0','-1','null','"0.04"','1e999'])expect(()=>parseCoinGeckoQuote(`{"zignaly":{"usd":${usd},"last_updated_at":${now/1000}}}`,now)).toThrow();
 expect(()=>parseCoinGeckoQuote(`{"zignaly":{"usd":0.04,"last_updated_at":${now/1000+120}}}`,now)).toThrow();
});
it('deduplicates refreshes, reuses fresh evidence and backs off while retaining failed stale evidence',async()=>{
 let time=now,calls=0,fail=false;const cache=createQuoteCache(async()=>{calls++;if(fail)throw Error('offline');return quote;},()=>time);
 await Promise.all([cache.refresh(),cache.refresh()]);expect(calls).toBe(1);await cache.refresh();expect(calls).toBe(1);
 time+=16*60000;fail=true;await cache.refresh();expect(cache.getSnapshot()).toMatchObject({quotes:[quote],error:expect.any(String)});await cache.refresh();expect(calls).toBe(2);
 time+=61000;await cache.refresh();expect(calls).toBe(3);
});
it('keeps public persistence bounded and validates cached identity before reuse',async()=>{
 const storage={getItem:()=>JSON.stringify({...quote,base:{...nativeZigIdentity,network:'zig-test-2'}}),setItem:vi.fn()};
 const cache=createQuoteCache(async()=>quote,()=>now);cache.hydrate(storage);expect(cache.getSnapshot().quotes).toEqual([]);
 await cache.refresh();expect(storage.setItem.mock.calls[0]![0]).toBe('zigoals:public-market-quotes:v1');expect(JSON.parse(storage.setItem.mock.calls[0]![1])).toEqual(quote);
 const restored=createQuoteCache(async()=>{throw Error('offline');},()=>now);restored.hydrate({...storage,getItem:()=>storage.setItem.mock.calls[0]![1]});expect(restored.getSnapshot().quotes).toEqual([quote]);
});
it('advances reactive time without altering the last observation',async()=>{
 let time=now;const cache=createQuoteCache(async()=>quote,()=>time);await cache.refresh();const listener=vi.fn();cache.subscribe(listener);time+=6*60000;cache.tick();expect(cache.getSnapshot().now).toBe(time);expect(cache.getSnapshot().quotes).toEqual([quote]);expect(quoteIsStale(cache.getSnapshot().quotes[0]!,cache.getSnapshot().now)).toBe(true);expect(listener).toHaveBeenCalledTimes(1);
});
it('rejects invalid JSON numeric grammar before extracting an exact price lexeme',()=>{
 for(const usd of ['01','00.043','+0.043','.043','1.','NaN','Infinity'])expect(()=>parseCoinGeckoQuote(`{"zignaly":{"usd":${usd},"last_updated_at":${now/1000}}}`,now)).toThrow();
});
it('rejects duplicate price and identity members rather than interpreting ambiguous evidence',()=>{
 for(const raw of [
  `{"zignaly":{"usd":0.043,"usd":0.044,"last_updated_at":${now/1000}}}`,
  `{"zignaly":{"usd":0.043,"\\u0075sd":0.044,"last_updated_at":${now/1000}}}`,
  `{"zignaly":{"usd":0.043,"last_updated_at":${now/1000},"last_updated_at":${now/1000}}}`,
  `{"zignaly":{"usd":0.043,"last_updated_at":${now/1000}},"zignaly":{"usd":0.044,"last_updated_at":${now/1000}}}`,
 ])expect(()=>parseCoinGeckoQuote(raw,now)).toThrow();
});
