import {uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {boundedQuoteText,verifiedMarketQuote,type MarketQuote} from './market-quotes';
import {parseMarketPairWire} from './market-pair-wire';
import {z} from 'zod';
type PairResult=ReturnType<typeof parseMarketPairWire>['results'][number];
const legacy=z.union([z.object({quotes:z.array(z.unknown()).max(500),error:z.string().max(500).nullable().optional()}).strict(),z.object({quote:z.unknown(),error:z.string().max(500).nullable().optional()}).strict()]);
/** Browser-to-app transport is bounded independently from the deduplicated portfolio size. */
export async function fetchPublicMarketQuotes(raw:readonly MarketQuoteRequest[],force=false,fetcher:typeof fetch=fetch,signal?:AbortSignal):Promise<{quotes:MarketQuote[];error:string|null;results?:PairResult[]}>{
 const requests=uniqueMarketRequests(raw),quotes:MarketQuote[]=[],results:PairResult[]=[];let error:string|null=null,versioned=true;
 for(let offset=0;offset<requests.length;offset+=500){
 const cancelToken=crypto.randomUUID(),leaving=new AbortController(),requestSignal=AbortSignal.any([AbortSignal.timeout(30000),leaving.signal,...(signal?[signal]:[])]);
 const cancel=()=>{void fetcher('/api/market-quotes/cancel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cancelToken}),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',keepalive:true}).catch(()=>{});};
 const pagehide=()=>leaving.abort();
 requestSignal.addEventListener('abort',cancel,{once:true});if(typeof window!=='undefined')window.addEventListener('pagehide',pagehide,{once:true});
 try{
 if(requestSignal.aborted)throw Error('Cancelled');
 const response=await fetcher('/api/market-quotes',{method:'POST',headers:{'Content-Type':'application/json','x-market-cancel-token':cancelToken},body:JSON.stringify({requests:requests.slice(offset,offset+500),refresh:force}),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:requestSignal});
 const body=JSON.parse(await boundedQuoteText(response,1024*1024));
 if(body&&Object.hasOwn(body,'version')){if(!response.ok&&response.status!==503)throw Error('Market route unavailable.');const pair=parseMarketPairWire(body,requests.slice(offset,offset+500));quotes.push(...pair.quotes);results.push(...pair.results);if(pair.error)error=pair.error;}
 else{versioned=false;if(!response.ok)throw Error('Verified quote unavailable.');const parsed=legacy.parse(body),rows='quotes' in parsed?parsed.quotes:[parsed.quote];quotes.push(...rows.map(row=>verifiedMarketQuote(row)));if(parsed.error)error='Market prices could not be refreshed. Last verified evidence is retained.';}
 }catch{versioned=false;error='Market prices could not be refreshed. Last verified evidence is retained.';}finally{requestSignal.removeEventListener('abort',cancel);if(typeof window!=='undefined')window.removeEventListener('pagehide',pagehide);}
 if(signal?.aborted||leaving.signal.aborted)break;}
 return {quotes,error,...(versioned?{results}:{})};
}
