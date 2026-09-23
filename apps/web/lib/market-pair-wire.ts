import {z} from 'zod';
import {marketRequestSchema,marketRequestKey,uniqueMarketRequests,type MarketQuoteRequest} from './market-assets';
import {verifiedMarketQuote,quoteIsStale,type MarketQuote} from './market-quotes';
const failure=z.enum(['THROTTLED','UPSTREAM_5XX','TIMEOUT','NETWORK','AUTHENTICATION','ENTITLEMENT','MALFORMED','UNSUPPORTED','LOCAL_BUDGET','LOCAL_QUEUE','UNKNOWN']);
const status=z.enum(['VERIFIED_FRESH','VERIFIED_STALE','PROVIDER_UNAVAILABLE','PROVIDER_THROTTLED','PROVIDER_MALFORMED','UNSUPPORTED','NOT_ATTEMPTED_BUDGET']);
const envelope=z.object({version:z.literal(1),results:z.array(z.object({request:marketRequestSchema,status,quote:z.unknown().nullable(),failure:failure.nullable()}).strict()).max(500),quotes:z.array(z.unknown()).max(500),complete:z.boolean(),degraded:z.boolean(),error:z.string().max(250).nullable()}).strict();
/** Versioned transport only. Reject unknown versions/fields, reordered/duplicate pairs,
 * inconsistent summaries and legacy inference. Display freshness is still aged locally. */
export function parseMarketPairWire(raw:unknown,requested:readonly MarketQuoteRequest[],now=Date.now()){
 const data=envelope.parse(raw),requests=uniqueMarketRequests(requested);if(data.results.length!==requests.length)throw Error('Missing market pair outcome.');
 const quotes:MarketQuote[]=[];
 data.results.forEach((row,i)=>{const selected=requests[i]!;if(JSON.stringify(row.request)!==JSON.stringify(selected))throw Error('Market pair order or identity changed.');
  if(row.quote!==null){const quote=verifiedMarketQuote(row.quote,now);if(!quote.marketRef||marketRequestKey({marketRef:quote.marketRef,currency:quote.currency as 'USD'|'EUR'})!==marketRequestKey(selected)||selected.marketRef.kind==='rwa'&&(quote.marketRef.kind!=='rwa'||quote.marketRef.assetType!==selected.marketRef.assetType)||!row.status.startsWith('VERIFIED_'))throw Error('Invalid pair quote.');quotes.push(quote);}
  else{const expected=row.failure==='THROTTLED'?'PROVIDER_THROTTLED':row.failure==='MALFORMED'?'PROVIDER_MALFORMED':row.failure==='UNSUPPORTED'?'UNSUPPORTED':row.failure==='LOCAL_BUDGET'?'NOT_ATTEMPTED_BUDGET':'PROVIDER_UNAVAILABLE';if(!row.failure||row.status!==expected)throw Error('Invalid missing pair outcome.');}
 });
 const supplied=data.quotes.map(q=>verifiedMarketQuote(q,now));
 if(JSON.stringify(supplied)!==JSON.stringify(quotes)||data.complete!==data.results.every(r=>r.quote!==null)||data.degraded!==data.results.some(r=>r.status!=='VERIFIED_FRESH'||r.failure!==null)||Boolean(data.error)!==data.degraded)throw Error('Inconsistent market pair summary.');
 const results=data.results.map(row=>row.quote!==null&&quoteIsStale(verifiedMarketQuote(row.quote,now),now)?{...row,status:'VERIFIED_STALE' as const}:row);
 const degraded=data.degraded||results.some(row=>row.status==='VERIFIED_STALE');
 return {...data,results,quotes,degraded,error:degraded?'Market prices could not be refreshed. Last verified evidence is retained.':null};
}
