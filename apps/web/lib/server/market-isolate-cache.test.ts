import {test,expect,vi} from 'vitest';
import {MarketIsolateCache} from './market-isolate-cache';
// Session R1: a coordinator isolate answers an all-fresh request itself, by the account's freshness rule, within a
// size bound, and never answers a cold work or a catalog.
const at=Date.parse('2026-10-03T10:00:00Z');
const work=(id:string)=>({operation:'quote' as const,pair:{marketRef:{provider:'coingecko' as const,kind:'coin' as const,id},currency:'USD' as const}});
const quote=(id:string,time=at)=>({base:{network:'coingecko-coin',denom:id,decimals:0},marketRef:work(id).pair.marketRef,currency:'USD',price:'2',priceDecimals:0,source:'CoinGecko',providerAssetId:id,verification:'VERIFIED',observedAt:new Date(time).toISOString(),fetchedAt:new Date(time).toISOString()});
const hits=(ids:string[])=>({ok:true,results:ids.map(id=>({ok:true,status:'CACHE_HIT',quote:quote(id)})),attempts:[]});
test('an all-fresh request needs no account command; one unseen work sends the whole request',async()=>{
 let now=at;const account=vi.fn(async(c:unknown)=>hits((c as {works:ReturnType<typeof work>[]}).works.map(w=>w.pair.marketRef.id))),command=new MarketIsolateCache().wrap(account,()=>now);
 await command({action:'acquire-many',works:[work('bitcoin'),work('ethereum')]});expect(account).toHaveBeenCalledTimes(1);
 expect(await command({action:'acquire-many',works:[work('ethereum'),work('bitcoin')]})).toEqual({ok:true,results:[{ok:true,status:'CACHE_HIT',quote:quote('ethereum')},{ok:true,status:'CACHE_HIT',quote:quote('bitcoin')}],attempts:[]});expect(account).toHaveBeenCalledTimes(1);
 await command({action:'acquire-many',works:[work('bitcoin'),work('solana')]});expect(account).toHaveBeenCalledTimes(2);
 // Past the quote freshness window (15 minutes) the account is asked again.
 now=at+15*60000+1;await command({action:'acquire-many',works:[work('bitcoin')]});expect(account).toHaveBeenCalledTimes(3);
});
test('only accepted publications and answered followers are remembered; leases, waits and catalogs never are',async()=>{
 const account=vi.fn(async(c:unknown)=>{const action=(c as {action:string}).action;
  if(action==='complete')return {ok:true,published:[{ok:true},{ok:false,reason:'FENCED'}]};
  if(action==='poll-many')return {ok:true,followers:[{ok:true,status:'CACHE_HIT',quote:quote('solana')},{ok:true,status:'WAITING',quote:null}]};
  return {ok:true,results:[{ok:true,status:'OWNER',lease:{},quote:null},{ok:true,status:'WAITING',quote:quote('cardano',at-60000)},{ok:true,status:'CACHE_HIT',value:{assets:[],fetchedAt:new Date(at).toISOString()}}],attempts:[]};});
 const cache=new MarketIsolateCache(),command=cache.wrap(account,()=>at),catalog={operation:'catalog' as const,provider:'coingecko' as const,kind:'coin' as const};
 await command({action:'acquire-many',works:[work('bitcoin'),work('cardano'),catalog]});
 await command({action:'complete',id:'x',outcome:'success',publish:[{work:work('ethereum'),value:quote('ethereum')},{work:work('dogecoin'),value:quote('dogecoin')}]});
 await command({action:'poll-many',followers:[{id:'a',work:work('solana')},{id:'b',work:work('tron')}]});
 for(const id of ['ethereum','solana'])expect(cache.answer([work(id)],at)).not.toBeNull();
 for(const id of ['bitcoin','cardano','dogecoin','tron'])expect(cache.answer([work(id)],at)).toBeNull();
 expect(cache.answer([catalog],at)).toBeNull();
});
test('the cache stays within its size, dropping the oldest evidence first',()=>{
 const id=(i:number)=>`a${String(i).padStart(2,'0')}`,size=JSON.stringify(quote(id(0))).length,cache=new MarketIsolateCache(size*66);
 for(let i=0;i<70;i++)cache.remember(work(id(i)),quote(id(i)),at);
 expect(Array.from({length:70},(_,i)=>cache.answer([work(id(i))],at)!==null)).toEqual(Array.from({length:70},(_,i)=>i>=4));
 // One value larger than a 64th of the cache is never held.
 const big=new MarketIsolateCache(size*32);big.remember(work(id(0)),quote(id(0)),at);expect(big.answer([work(id(0))],at)).toBeNull();
});
