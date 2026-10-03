import {marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from '../market-assets';
import {parseCoinQuoteResults,parseCoinTokenQuote,parseRwaQuoteResults,type MarketQuote} from '../market-quotes';
import {marketPairEnvelope,type PairFailure} from './market-pair-result';
import {ProviderFailure,parseProviderEvidence,type ProviderFailureCategory} from './provider-failure';
import {providerText,providerFailure,type MarketCommand} from './market-charged-read';
import {runMarketBatch,type MarketGroup,type MarketRead} from './market-batch';
const ZIG_CONTRACT='0xb2617246d0c6c0087f18703d576831899ca94f01';
/** Quote ownership/publication is durable. Every physical batch, reference read and
 * documented ZIG token fallback receives its own account-wide charged attempt, in the
 * batched protocol (market-batch.ts): one account command per phase, never one per pair. */
export async function dispatchDurableQuotes(raw:readonly MarketQuoteRequest[],{command,key,fetcher=fetch,clock=()=>Date.now(),signal,cancelToken,client}:{command:MarketCommand;key?:string;fetcher?:typeof fetch;clock?:()=>number;signal?:AbortSignal;cancelToken?:string;client?:string}){
 const requests=uniqueMarketRequests(raw),quotes=new Map<string,MarketQuote>(),failures:PairFailure[]=[];
 const fail=(members:readonly MarketQuoteRequest[],category:ProviderFailureCategory)=>failures.push(...members.map(request=>({request,category})));
 if(requests.length>64){fail(requests,'LOCAL_QUEUE');return marketPairEnvelope(requests,[],failures,clock());}
 if(!key?.trim()){fail(requests,'AUTHENTICATION');return marketPairEnvelope(requests,[],failures,clock());}
 fail(requests.filter(request=>request.marketRef.kind==='rwa'&&request.currency!=='USD'),'UNSUPPORTED');
 const pairs=requests.filter(request=>!(request.marketRef.kind==='rwa'&&request.currency!=='USD')),works=pairs.map(pair=>({operation:'quote' as const,pair}));
 const members=(test:(request:MarketQuoteRequest)=>boolean)=>pairs.flatMap((request,index)=>test(request)?[index]:[]);
 // ZIG has its own atomic response boundary, so its unavailable simple-price result
 // cannot erase independently verified non-ZIG evidence. Each group is charged once.
 const all:MarketGroup[]=[
  {charge:'quote',members:members(r=>r.marketRef.kind==='coin'&&r.marketRef.id!=='zignaly')},
  {charge:'quote',members:members(r=>r.marketRef.kind==='coin'&&r.marketRef.id==='zignaly'),fallback:true},
  {charge:'quote',members:members(r=>r.marketRef.kind==='rwa')},
 ],groups=all.filter(group=>group.members.length>0);
 const read=async(group:MarketGroup,owners:number[],fallback:boolean):Promise<MarketRead>=>{
  const batch=owners.map(i=>pairs[i]!),currencies=[...new Set(batch.map(r=>r.currency.toLowerCase()))].join(',');let invalid:MarketQuoteRequest[]=[];
  const owner=(pair:MarketQuoteRequest)=>owners[batch.findIndex(r=>marketRequestKey(r)===marketRequestKey(pair))]!;
  try{
   if(fallback){
    const url=new URL('https://api.coingecko.com/api/v3/simple/token_price/ethereum');url.searchParams.set('contract_addresses',ZIG_CONTRACT);url.searchParams.set('vs_currencies',currencies);url.searchParams.set('include_last_updated_at','true');url.searchParams.set('precision','full');
    const text=await providerText(url,'token',64*1024,{key,fetcher,signal});
    return {outcome:'success',values:parseProviderEvidence(()=>batch.map((member,k)=>({index:owners[k]!,value:parseCoinTokenQuote(text,member,ZIG_CONTRACT,clock())})))};
   }
   const rwa=batch[0]!.marketRef.kind==='rwa',url=new URL(`https://api.coingecko.com/api/v3/${rwa?'rwas/markets':'simple/price'}`);url.searchParams.set('ids',[...new Set(batch.map(r=>r.marketRef.id))].join(','));if(rwa){url.searchParams.set('per_page','250');url.searchParams.set('page','1');}else{url.searchParams.set('vs_currencies',currencies);url.searchParams.set('include_last_updated_at','true');}url.searchParams.set('precision','full');
   const text=await providerText(url,rwa?'rwa':'quote',1024*1024,{key,fetcher,signal}),parsed=parseProviderEvidence(()=>rwa?parseRwaQuoteResults(text,batch,clock()):parseCoinQuoteResults(text,batch,clock()));invalid=parsed.failures;
   if(!parsed.quotes.length&&invalid.length)throw new ProviderFailure('MALFORMED');
   return {outcome:'success',pairFailures:invalid.map(owner),values:parsed.quotes.map(quote=>({index:owners[batch.findIndex(r=>r.marketRef.id===quote.providerAssetId&&r.currency===quote.currency)]!,value:quote}))};
  }catch(error){
   // A failed/ambiguous send remains charged. If settlement itself is unconfirmed,
   // keep the durable DISPATCHED state; there is no cancellation or refund.
   return {outcome:'failure',category:providerFailure(error,signal).category,pairFailures:invalid.map(owner),values:[]};
  }
 };
 const items=await runMarketBatch(works,groups,read,{command,signal,cancelToken,client,clock});
 for(const [i,item] of items.entries()){
  const request=pairs[i]!;
  if(item.value)try{quotes.set(marketRequestKey(request),marketPairEnvelope([request],[item.value as MarketQuote],[],clock()).quotes[0]!);}catch{if(item.ok){fail([request],'MALFORMED');continue;}}
  if(!item.ok)fail([request],item.category??'UNKNOWN');
 }
 return marketPairEnvelope(requests,[...quotes.values()],failures,clock());
}
