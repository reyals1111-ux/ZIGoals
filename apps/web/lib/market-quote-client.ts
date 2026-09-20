import {uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {boundedQuoteText,verifiedMarketQuote,type MarketQuote} from './market-quotes';
/** Browser-to-app transport is bounded independently from the deduplicated portfolio size. */
export async function fetchPublicMarketQuotes(raw:readonly MarketQuoteRequest[],force=false,fetcher:typeof fetch=fetch):Promise<{quotes:MarketQuote[];error:string|null}>{
 const requests=uniqueMarketRequests(raw),quotes:MarketQuote[]=[];let error:string|null=null;
 for(let offset=0;offset<requests.length;offset+=500){try{
 const response=await fetcher('/api/market-quotes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:requests.slice(offset,offset+500),refresh:force}),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Verified quote unavailable.');const body=JSON.parse(await boundedQuoteText(response,1024*1024));const rows=body.quotes??(body.quote?[body.quote]:null);if(!Array.isArray(rows)||rows.length>500)throw Error('Invalid market response.');quotes.push(...rows.map(row=>verifiedMarketQuote(row)));if(body.error)error='Market prices could not be refreshed. Last verified evidence is retained.';
 }catch{error='Market prices could not be refreshed. Last verified evidence is retained.';}}
 return {quotes,error};
}
