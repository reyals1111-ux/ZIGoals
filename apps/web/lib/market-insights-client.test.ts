import {expect,it} from 'vitest';
import {fetchPublicMarketInsights} from './market-insights-client';
import {parseMarketInsights} from './market-insights';
import type {MarketQuoteRequest} from './market-assets';
const now=Date.parse('2026-09-20T22:00:00Z');
const request:MarketQuoteRequest={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'};
const entry=parseMarketInsights('[{"id":"bitcoin","last_updated":"2026-09-20T22:00:00Z","price_change_percentage_24h":1.123456789123456789}]',[request],now)[0]!;
it('validates public identity responses and omits browser credentials, with exact movement retained',async()=>{
 let seen:RequestInit|undefined;const fetcher:typeof fetch=async(_url,init)=>{seen=init;return Response.json({entries:[entry],results:{'coingecko:coin:bitcoin:USD':{insight:entry,error:null,stale:false}},error:null});};
 const result=await fetchPublicMarketInsights([request,request],false,fetcher,now);expect(result.entries[0]?.change24h).toBe('1.123456789123456789');expect(JSON.parse(String(seen?.body))).toEqual({requests:[request],refresh:false});expect(seen).toMatchObject({credentials:'omit',redirect:'error',cache:'no-store',referrerPolicy:'no-referrer'});
});
it('rejects unsolicited identity, private response fields and unsafe logo URLs',async()=>{
 for(const bad of [{...entry,quantity:'private'},{...entry,marketRef:{...entry.marketRef,id:'ethereum'}},{...entry,logoUrl:'https://evil.test/image.png'}]){const result=await fetchPublicMarketInsights([request],false,async()=>Response.json({entries:[bad],results:{},error:null}),now);expect(result.entries).toEqual([]);expect(result.error).toMatch(/unavailable/);}
});
it('chunks large deduplicated identity lists, keeps valid partial batches and sanitizes failures',async()=>{
 const sizes:number[]=[];const requests=Array.from({length:501},(_,i)=>({...request,marketRef:{...request.marketRef,id:`asset-${i}`}}));const fetcher:typeof fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));sizes.push(body.requests.length);if(sizes.length===2)return new Response('secret error',{status:429});const entries=body.requests.map((r:MarketQuoteRequest)=>({...entry,marketRef:r.marketRef}));return Response.json({entries,results:Object.fromEntries(entries.map((e:typeof entry)=>[`coingecko:coin:${e.marketRef.id}:USD`,{insight:e,error:null,stale:false}])),error:null});};
 const result=await fetchPublicMarketInsights(requests,false,fetcher,now);expect(sizes).toEqual([500,1]);expect(result.entries).toHaveLength(500);expect(result.error).toMatch(/unavailable/);expect(JSON.stringify(result)).not.toContain('secret');
});
it('retains per-identity refresh errors for server last-good evidence',async()=>{
 const result=await fetchPublicMarketInsights([request],false,async()=>Response.json({entries:[entry],results:{'coingecko:coin:bitcoin:USD':{insight:entry,error:'private upstream detail',stale:true}},error:'private upstream detail'}),now+900001);expect(result.errors?.['coingecko:coin:bitcoin:USD']).toMatch(/retained/);expect(JSON.stringify(result)).not.toContain('private');
});
