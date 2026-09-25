import {uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {boundedQuoteText,verifiedMarketQuote,type MarketQuote} from './market-quotes';
import {parseMarketPairWire} from './market-pair-wire';
import {z} from 'zod';
type PairResult=ReturnType<typeof parseMarketPairWire>['results'][number];
const legacy=z.union([z.object({quotes:z.array(z.unknown()).max(500),error:z.string().max(500).nullable().optional()}).strict(),z.object({quote:z.unknown(),error:z.string().max(500).nullable().optional()}).strict()]);
/** Browser-to-app transport is bounded independently from the deduplicated portfolio size. */
export async function fetchPublicMarketQuotes(raw:readonly MarketQuoteRequest[],force=false,fetcher:typeof fetch=fetch):Promise<{quotes:MarketQuote[];error:string|null;results?:PairResult[]}>{
 const requests=uniqueMarketRequests(raw),quotes:MarketQuote[]=[],results:PairResult[]=[];let error:string|null=null,versioned=true;
 for(let offset=0;offset<requests.length;offset+=500){try{
 const response=await fetcher('/api/market-quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:requests.slice(offset,offset+500),refresh:force}),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(30000)});
 const body=JSON.parse(await boundedQuoteText(response,1024*1024));
 if(body&&Object.hasOwn(body,'version')){if(!response.ok&&response.status!==503)throw Error('Market route unavailable.');const pair=parseMarketPairWire(body,requests.slice(offset,offset+500));quotes.push(...pair.quotes);results.push(...pair.results);if(pair.error)error=pair.error;}
 else{versioned=false;if(!response.ok)throw Error('Verified quote unavailable.');const parsed=legacy.parse(body),rows='quotes' in parsed?parsed.quotes:[parsed.quote];quotes.push(...rows.map(row=>verifiedMarketQuote(row)));if(parsed.error)error='Market prices could not be refreshed. Last verified evidence is retained.';}
 }catch{versioned=false;error='Market prices could not be refreshed. Last verified evidence is retained.';}}
 return {quotes,error,...(versioned?{results}:{})};
}
