import {MARKET_REQUEST_CHUNK,uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {boundedQuoteText} from './market-quotes';
import {DETAIL_UNAVAILABLE,detailAnswerFor,verifiedDetailAnswer,type MarketDetailAnswer} from './market-detail';
/** Session W Part 15: asks the app's /api/market-detail for public coin identities only (never a quantity, account or
 * key), 32 pairs per request; every detail is verified against the pair it answers. */
export async function fetchPublicMarketDetails(raw:readonly MarketQuoteRequest[],force=false,fetcher:typeof fetch=fetch,now=Date.now()):Promise<MarketDetailAnswer>{
 const requests=uniqueMarketRequests(raw),answer:MarketDetailAnswer={results:{},error:null};
 for(let offset=0;offset<requests.length;offset+=MARKET_REQUEST_CHUNK){
  const batch=requests.slice(offset,offset+MARKET_REQUEST_CHUNK);let part:MarketDetailAnswer;
  try{
   const response=await fetcher('/api/market-detail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requests:batch,refresh:force}),credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(30000)});
   part=verifiedDetailAnswer(JSON.parse(await boundedQuoteText(response,4*1024*1024)),batch,now);
  }catch{part=detailAnswerFor(batch,DETAIL_UNAVAILABLE);}
  Object.assign(answer.results,part.results);if(part.error&&answer.error!==DETAIL_UNAVAILABLE)answer.error=part.error;
 }
 return answer;
}
