import {expect,it,vi,afterEach} from 'vitest';
import {createCoinGeckoProvider} from './coingecko';
import {parseProviderEvidence,ProviderFailure} from './provider-failure';
import {ProviderValidationError} from '../provider-validation';
const now=Date.parse('2026-09-22T12:00:00Z');
const request={marketRef:{provider:'coingecko',kind:'coin',id:'bitcoin'},currency:'USD'} as const;
const load=async(response:Response)=>createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async()=>response}).quoteResults([request]);
afterEach(()=>vi.useRealTimers());
it.each([['TypeError','NETWORK'],['TimeoutError','TIMEOUT'],['AbortError','TIMEOUT'],['Error','UNKNOWN']] as const)('classifies body stream %s separately from validation',async(name,want)=>{
 const body=new ReadableStream<Uint8Array>({pull(c){const e=new Error('private body url credential');e.name=name;c.error(e);}});
 const result=await load(new Response(body,{headers:{'content-type':'application/json'}}));
 expect(result.results[0]?.failure).toBe(want);expect(JSON.stringify(result)).not.toContain('private');
});
it('only expected validation errors blame data; internal failures remain unknown',()=>{
 for(const [error,want] of [[new ProviderValidationError(),'MALFORMED'],[new TypeError('secret'),'UNKNOWN'],[new SyntaxError('secret'),'UNKNOWN']] as const){
 try{parseProviderEvidence(()=>{throw error;});throw Error('not thrown');}catch(e){expect(e).toBeInstanceOf(ProviderFailure);expect((e as ProviderFailure).category).toBe(want);expect(e).not.toHaveProperty('cause');expect(JSON.stringify(e)).not.toContain('secret');}
 }
});
it.each(['{','{"bit\\xcoin":1}','{"wrong":{"usd":1}}','{"bitcoin":{"usd":1,"last_updated_at":"bad"}}'])('rejects malformed provider data %s',async text=>{
 expect((await load(new Response(text,{headers:{'content-type':'application/json'}}))).results[0]?.failure).toBe('MALFORMED');
});
it.each(['http','redirect','media','size'])('cancels rejected %s without reading the body',async mode=>{
 let canceled=0,pulled=0;
 const body=new ReadableStream<Uint8Array>({pull(){pulled++;},cancel(){canceled++;}},{highWaterMark:0});
 const response=new Response(body,{status:mode==='http'?503:mode==='redirect'?302:200,headers:{'content-type':mode==='media'?'text/html':'application/json',...(mode==='size'?{'content-length':'2000000'}:{})}});
 const result=await load(response);expect(canceled).toBe(1);expect(pulled).toBe(0);expect(result.results[0]?.failure).toBe(mode==='http'?'UPSTREAM_5XX':mode==='redirect'?'UNKNOWN':'MALFORMED');
});
it('cleanup rejection cannot replace original classification',async()=>{
 const body=new ReadableStream({cancel(){throw Error('private cancellation');}},{highWaterMark:0});
 expect((await load(new Response(body,{status:429}))).results[0]?.failure).toBe('THROTTLED');
});
it('hanging cleanup is bounded and releases the permit',async()=>{
 vi.useFakeTimers();let calls=0;
 const p=createCoinGeckoProvider({key:()=> 'fixture',clock:()=>now,fetcher:async()=>{calls++;return new Response(new ReadableStream({cancel(){return new Promise(()=>{});}},{highWaterMark:0}),{status:503});}});
 const batch=Promise.all([p.quoteResults([request]),p.quoteResults([request]),p.quoteResults([request])]);
 await vi.advanceTimersByTimeAsync(1000);expect((await batch).every(r=>r.results[0]?.failure==='UPSTREAM_5XX')).toBe(true);expect(calls).toBe(3);
});
it('oversized streamed body is canceled once even if cancellation fails',async()=>{
 let cancellations=0;
 const body=new ReadableStream<Uint8Array>({pull(c){c.enqueue(new Uint8Array(1024*1024+1));},cancel(){cancellations++;throw Error('private');}},{highWaterMark:0});
 const result=await load(new Response(body,{headers:{'content-type':'application/json'}}));expect(result.results[0]?.failure).toBe('MALFORMED');expect(cancellations).toBe(1);
});
