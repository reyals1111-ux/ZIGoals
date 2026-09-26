import {boundedQuoteText,cleanupMarketBody} from '../market-quotes';
import {isJsonMediaType} from '../json-media-type';
import {ProviderTransportError,ProviderValidationError} from '../provider-validation';
import type {ProviderAttempt} from './market-coordinator';
import {ProviderFailure,providerHttpFailure,parseProviderEvidence,type ProviderFailureCategory} from './provider-failure';
export type MarketCommand=(command:unknown)=>Promise<Record<string,unknown>>;
export type ChargedOperation='catalog'|'history'|'insights'|'token'|'rwa';
export function admissionFailure(reason:unknown):ProviderFailureCategory{return ['BREAKER_OPEN','CONCURRENT_LIMIT','QUEUE_LIMIT','FENCED','RESERVATION_EXPIRED','OWNERSHIP_EXPIRED'].includes(String(reason))?'LOCAL_QUEUE':'LOCAL_BUDGET';}
/** The caller supplies only internally constructed CoinGecko URLs. One physical
 * read owns one reservation; failure after dispatch remains charged, including a
 * lost/failed body stream. No retry or fallback is hidden in this function. */
export async function chargedMarketRead(url:URL,operation:ChargedOperation,limit:number,{command,key,fetcher=fetch,fallback,work,validate}:{command:MarketCommand;key?:string;fetcher?:typeof fetch;validate?:(text:string)=>unknown;fallback?:{parentId:string;associations:ProviderAttempt['associations'];onAttempt:(id:string)=>void};work?:{associations:ProviderAttempt['associations'];onAttempt:(id:string)=>void}}):Promise<string>{
 if(!key?.trim())throw new ProviderFailure('AUTHENTICATION');
 const paths={catalog:/^\/api\/v3\/(coins|rwas)\/list$/,history:/^\/api\/v3\/coins\/[a-z0-9_-]+\/market_chart$/,insights:/^\/api\/v3\/(coins|rwas)\/markets$/,token:/^\/api\/v3\/simple\/token_price\/ethereum$/,rwa:/^\/api\/v3\/rwas\/markets$/};
 if(url.origin!=='https://api.coingecko.com'||!paths[operation].test(url.pathname))throw new ProviderFailure('UNSUPPORTED');
 let id:string|undefined,dispatched=false;
 try{
  const row=await command({action:'enqueue-read',operation,...(fallback?{parentId:fallback.parentId,associations:fallback.associations}:work?{associations:work.associations}:{})});if(row.ok!==true||typeof row.id!=='string')throw new ProviderFailure(admissionFailure(row.reason));id=row.id;fallback?.onAttempt(id);work?.onAttempt(id);
  for(const action of ['reserve','own','dispatch']){const decision=await command({action,id});if(decision.ok!==true)throw new ProviderFailure(admissionFailure(decision.reason));if(action==='dispatch')dispatched=true;}
  const response=await fetcher(url.href,{method:'GET',headers:{Accept:'application/json','x-cg-demo-api-key':key.trim()},credentials:'omit',redirect:'manual',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(8000)});
  const failure=response.redirected?new ProviderFailure('UNKNOWN'):!response.ok?providerHttpFailure(response.status):!isJsonMediaType(response.headers.get('content-type'))?new ProviderFailure('MALFORMED'):null;
  if(failure){await cleanupMarketBody(()=>response.body?.cancel()??Promise.resolve());throw failure;}
  const text=await boundedQuoteText(response,limit);
  if(validate)parseProviderEvidence(()=>validate(text));
  const settled=await command({action:'settle',id,outcome:'success'});if(settled.ok!==true)throw new ProviderFailure('UNKNOWN');
  return text;
 }catch(error){
  const failure=error instanceof ProviderFailure?error:new ProviderFailure(error instanceof ProviderValidationError?'MALFORMED':error instanceof ProviderTransportError?error.category:error instanceof Error&&['TimeoutError','AbortError'].includes(error.name)?'TIMEOUT':error instanceof TypeError?'NETWORK':'UNKNOWN');
  if(id)await command(dispatched?{action:'settle',id,outcome:'failure',category:failure.category}:{action:'cancel',id}).catch(()=>{});throw failure;
 }
}
