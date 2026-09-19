/** Fixed public pair only. No request payload or credentials ever reach the provider. */
import {boundedQuoteText,parseCoinGeckoQuote} from '../../../lib/market-quotes';
import {createQuoteCache} from '../../../lib/market-quote-cache';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const cache=createQuoteCache(async()=>{
 const response=await fetch('https://api.coingecko.com/api/v3/simple/price?ids=zignaly&vs_currencies=usd&include_last_updated_at=true&precision=full',{method:'GET',credentials:'omit',headers:{Accept:'application/json'},redirect:'error',referrerPolicy:'no-referrer',cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('Public price unavailable.');return parseCoinGeckoQuote(await boundedQuoteText(response));
});
export async function GET(request:Request):Promise<Response>{
 if(new URL(request.url).search) return Response.json({error:'Only the supported native ZIG/USD market pair is available.'},{status:400,headers});
 await cache.refresh();const {quotes,error}=cache.getSnapshot();
 return quotes[0]?Response.json({quote:quotes[0],error},{headers}):Response.json({error:'Verified market valuation unavailable. Previous local evidence is unchanged.'},{status:502,headers});
}
