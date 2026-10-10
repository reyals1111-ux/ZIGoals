// Session Z-Cloud Part 6 (ADR-019 C40; owner follow-up 2): the relay costs a reply exactly as the app does. The relay's
// table (workers/zigi-relay/pricing.mjs) is a copy of Z-Local's apps/web/lib/ai/pricing.ts; whenever both are on one
// branch (after both PRs merge), this compares them over every model and a matrix of usages, so neither can drift.
import {existsSync} from 'node:fs';
import {expect,test} from 'vitest';
import {PRICES,PRICES_AS_OF,costMicros,estimateCost,micros} from '../../workers/zigi-relay/pricing.mjs';

const APP_TABLE=new URL('../../apps/web/lib/ai/pricing.ts',import.meta.url);
const USAGES=[{input:0,output:0},{input:1000,output:300},{input:1000,output:300,cacheWrite:2000,cacheRead:8000},{input:90_000,output:4096,cacheWrite:6000,cacheRead:5000},{input:120_000,output:10},{input:null,output:null,cacheWrite:null,cacheRead:null}];

test('the copy matches the app\'s table wherever both exist',async()=>{
 if(!existsSync(APP_TABLE)){expect(PRICES_AS_OF).toBe('2026-10-10');return;}// Before Z-Local's table is on this branch.
 const app=await import(APP_TABLE.href);
 expect(PRICES_AS_OF).toBe(app.PRICES_AS_OF);
 expect(JSON.parse(JSON.stringify(PRICES))).toEqual(JSON.parse(JSON.stringify(app.PRICES)));
 for(const {id}of app.PRICES)for(const usage of USAGES)expect(estimateCost(id,usage),`${id} ${JSON.stringify(usage)}`).toBe(app.estimateCost(id,usage));
 expect(estimateCost('gpt-6-luna',{input:1,output:1})).toBe(app.estimateCost('gpt-6-luna',{input:1,output:1}));
});

test('the prices as read on 2026-10-10: cache writes 1.25×, hits 0.05× (Opus and Sonnet 5.5) and 0.1× (Haiku 5.5), Haiku\'s long-prompt card',()=>{
 const sonnet=PRICES.find(p=>p.id==='claude-sonnet-5-5'),haiku=PRICES.find(p=>p.id==='claude-haiku-5-5');
 expect(sonnet?.usd).toEqual({input:2,output:10,cacheWrite:2.5,cacheRead:0.1});
 expect(haiku?.usd).toEqual({input:0.1,output:0.5,cacheWrite:0.125,cacheRead:0.01});
 // A Haiku prompt over 100,000 tokens (input + cache writes + cache reads) is priced on the second card.
 expect(estimateCost('claude-haiku-5-5',{input:60_000,cacheWrite:30_000,cacheRead:10_000,output:0})).toBeCloseTo((60_000*0.1+30_000*0.125+10_000*0.01)/1e6,12);
 expect(estimateCost('claude-haiku-5-5',{input:60_000,cacheWrite:30_000,cacheRead:10_001,output:0})).toBeCloseTo((60_000*0.5+30_000*0.625+10_001*0.05)/1e6,12);
 expect(estimateCost('unknown-model',{input:1,output:1})).toBeNull();
 // Micro-dollars round up and never count float noise as a whole micro-dollar.
 expect(costMicros('claude-sonnet-5-5',{input:1000,output:300,cacheWrite:2000,cacheRead:8000})).toBe(10_800);
 expect(costMicros('claude-haiku-5-5',{input:1,output:0})).toBe(1);
 expect([micros('10'),micros('0.50'),micros('0'),micros('-1'),micros('1e3'),micros(undefined)]).toEqual([10_000_000,500_000,null,null,null,null]);
});
