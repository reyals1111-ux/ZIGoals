import {z} from 'zod';
import {marketAssetRefSchema,marketRequestSchema,nativeZigMarketRef,uniqueMarketRequests,type MarketAssetRef,type MarketQuoteRequest} from './market-assets';
import {exactMarketJson,decimalLexeme,JsonNumber} from './exact-market-json';
/** Identity is chain/denom/precision, never a display ticker. Future providers add mappings here. */
export const assetIdentitySchema=z.object({network:z.string().min(1).max(100),denom:z.string().min(1).max(250),decimals:z.number().int().min(0).max(18)}).strict();
export const nativeZigIdentity={network:'zigchain-1',denom:'uzig',decimals:6} as const;
export const marketQuoteSchema=z.object({base:assetIdentitySchema,currency:z.string().regex(/^[A-Z]{3,10}$/),price:z.string().regex(/^[1-9]\d{0,77}$/),priceDecimals:z.number().int().min(0).max(30),source:z.string().min(1).max(100),providerAssetId:z.string().min(1).max(100),observedAt:z.iso.datetime().optional(),fetchedAt:z.iso.datetime().optional(),marketRef:marketAssetRefSchema.optional(),verification:z.literal('VERIFIED')}).strict();
export type MarketQuote=z.infer<typeof marketQuoteSchema>;
export type ValuationEvidence={state:'fresh'|'stale'|'manual'|'missing';quote?:MarketQuote;observedAt?:string;source?:string};
export const QUOTE_FRESH_MS=15*60*1000;
export function quoteIsStale(quote:MarketQuote,now=Date.now()):boolean {const at=Date.parse(quote.observedAt??quote.fetchedAt??'');return !Number.isFinite(now)||!Number.isFinite(at)||at>now+60000||now-at>QUOTE_FRESH_MS;}
export function sameAsset(a:z.infer<typeof assetIdentitySchema>,b:z.infer<typeof assetIdentitySchema>):boolean{return a.network===b.network&&a.denom===b.denom&&a.decimals===b.decimals;}
export function quoteValue(quantity:string,quantityDecimals:number,quote:MarketQuote,targetDecimals:number):string {
 if(!/^(0|[1-9]\d{0,77})$/.test(quantity)||!Number.isInteger(quantityDecimals)||quantityDecimals<0||quantityDecimals>18||!Number.isInteger(targetDecimals)||targetDecimals<0||targetDecimals>18)throw Error('Invalid valuation units.');
 marketQuoteSchema.parse(quote);
 return (BigInt(quantity)*BigInt(quote.price)*10n**BigInt(targetDecimals)/(10n**BigInt(quantityDecimals+quote.priceDecimals))).toString();
}
/** Keep the provider's numeric token exact: JSON.parse would first round it to a JS Number. */
export function parseCoinGeckoQuote(text:string,now=Date.now()):MarketQuote {
 if(text.length>8192)throw Error('Quote response too large.');
 // Validate the original grammar before quoting the price token; otherwise 01 could become a valid string.
 // This Number is used only for validation. Arithmetic still uses the untouched decimal lexeme below.
 z.object({zignaly:z.object({usd:z.number().positive(),last_updated_at:z.number().int().positive().safe()}).strict()}).strict().parse(JSON.parse(text));
 // This fixed response has exactly three object members. Reject duplicate (including escaped) keys.
 const members=[...text.matchAll(/("(?:\\.|[^"\\])*")\s*:/g)].map(match=>JSON.parse(match[1]!) as string);
 if(members.length!==3||new Set(members).size!==3)throw Error('Ambiguous quote response.');
 const token=text.match(/"usd"\s*:\s*(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?=\s*[,}])/);
 if(!token)throw Error('Missing numeric USD quote.');
 const parsed=z.object({zignaly:z.object({usd:z.string(),last_updated_at:z.number().int().positive().safe()}).strict()}).strict().parse(JSON.parse(text.replace(token[0],`"usd":"${token[1]}"`)));
 const [mantissa,exponent='0']=parsed.zignaly.usd.toLowerCase().split('e');const [whole,fraction='']=mantissa!.split('.');
 let priceDecimals=fraction.length-Number(exponent);let digits=(whole!+fraction).replace(/^0+/,'')||'0';
 if(priceDecimals<0){if(priceDecimals< -30)throw Error('Price exceeds supported precision.');digits+='0'.repeat(-priceDecimals);priceDecimals=0;}
 const timestamp=parsed.zignaly.last_updated_at*1000;
 if(!Number.isSafeInteger(timestamp)||timestamp>now+60000)throw Error('Invalid quote timestamp.');
 return marketQuoteSchema.parse({base:nativeZigIdentity,currency:'USD',price:digits,priceDecimals,source:'CoinGecko',providerAssetId:'zignaly',observedAt:new Date(timestamp).toISOString(),verification:'VERIFIED'});
}
/** Bounded body reading protects against absent or dishonest Content-Length headers. */
export async function boundedQuoteText(response:Response,limit=8192):Promise<string>{
 if(Number(response.headers.get('content-length'))>limit)throw Error('Quote response too large.');
 if(!response.body)throw Error('Empty quote response.');const reader=response.body.getReader();let length=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit)throw Error('Quote response too large.');chunks.push(value);}}finally{await reader.cancel();}
 const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder('utf-8',{fatal:true}).decode(data);
}
export function verifiedNativeQuote(raw:unknown,now=Date.now()):MarketQuote {
 const quote=marketQuoteSchema.parse(raw);
 if(!quote.observedAt||!sameAsset(quote.base,nativeZigIdentity)||quote.currency!=='USD'||quote.source!=='CoinGecko'||quote.providerAssetId!=='zignaly'||Date.parse(quote.observedAt??quote.fetchedAt??'')>now+60000)throw Error('Unsupported market evidence.');
 return quote;
}

/** Explicit provider identity wins; ticker-only matching is never accepted. */
export function quoteMatchesPosition(position:{network:string;denom:string;decimals:number;marketRef?:MarketAssetRef;valuationMode?:'manual'|'automatic'},quote:MarketQuote):boolean{
 if(position.valuationMode==='manual')return false;
 if(quote.marketRef&&(quote.providerAssetId!==quote.marketRef.id||quote.source!==(quote.marketRef.kind==='coin'?'CoinGecko':'CoinGecko tokenized RWA reference')))return false;
 if(position.marketRef){const ref=position.marketRef,qref=quote.marketRef;if(!qref)return ref.kind==='coin'&&ref.id==='zignaly'&&sameAsset(position,nativeZigIdentity)&&sameAsset(quote.base,nativeZigIdentity)&&quote.providerAssetId==='zignaly'&&quote.source==='CoinGecko';return ref.provider===qref.provider&&ref.kind===qref.kind&&ref.id===qref.id&&(ref.kind!=='rwa'||(qref.kind==='rwa'&&ref.assetType===qref.assetType));}
 return sameAsset(position,nativeZigIdentity)&&sameAsset(quote.base,nativeZigIdentity)&&quote.providerAssetId==='zignaly'&&quote.source==='CoinGecko'&&(!quote.marketRef||(quote.marketRef.kind==='coin'&&quote.marketRef.id==='zignaly'));
}
export function verifiedMarketQuote(raw:unknown,now=Date.now()):MarketQuote{
 const quote=marketQuoteSchema.parse(raw);if(!quote.marketRef)return verifiedNativeQuote(raw,now);
 if(quote.providerAssetId!==quote.marketRef.id||!['USD','EUR'].includes(quote.currency)||quote.source!==(quote.marketRef.kind==='rwa'?'CoinGecko tokenized RWA reference':'CoinGecko')||!quote.fetchedAt||(quote.marketRef.kind==='rwa'&&quote.currency!=='USD'))throw Error('Unsupported market evidence.');
 for(const stamp of [quote.observedAt,quote.fetchedAt])if(stamp&&Date.parse(stamp)>now+60000)throw Error('Future market evidence.');return quote;
}
const object=(raw:unknown)=>{if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw instanceof JsonNumber)throw Error('Invalid quote object.');return raw as Record<string,unknown>;};
function marketQuote(request:MarketQuoteRequest,rawPrice:unknown,now:number,observedAt?:string):MarketQuote{
 const ref=request.marketRef;return verifiedMarketQuote({base:ref.kind==='coin'&&ref.id===nativeZigMarketRef.id?nativeZigIdentity:{network:`coingecko-${ref.kind}`,denom:ref.id,decimals:0},marketRef:ref,currency:request.currency,...decimalLexeme(rawPrice),source:ref.kind==='coin'?'CoinGecko':'CoinGecko tokenized RWA reference',providerAssetId:ref.id,verification:'VERIFIED',fetchedAt:new Date(now).toISOString(),...(observedAt?{observedAt}:{})},now);
}
export function parseCoinTokenQuote(text:string,request:MarketQuoteRequest,contractAddress:string,now=Date.now()):MarketQuote{
 const ref=marketRequestSchema.parse(request);
 if(ref.marketRef.kind!=='coin')throw Error('Token-address fallback supports coins only.');
 const data=object(exactMarketJson(text));
 const matches=Object.entries(data).filter(([key])=>key.toLowerCase()===contractAddress.toLowerCase());
 if(matches.length!==1||Object.keys(data).length!==1)throw Error('Unexpected token-price identity.');
 const row=object(matches[0]![1]);
 const stamp=row.last_updated_at;
 if(!(stamp instanceof JsonNumber)||!/^[0-9]+$/.test(stamp.lexeme))throw Error('Missing provider observation time.');
 const timestamp=Number(stamp.lexeme)*1000;
 if(!Number.isSafeInteger(timestamp)||timestamp<=0||timestamp>now+60000)throw Error('Invalid quote timestamp.');
 return marketQuote(ref,row[ref.currency.toLowerCase()],now,new Date(timestamp).toISOString());
}
export function parseCoinQuotes(text:string,requests:readonly MarketQuoteRequest[],now=Date.now()):MarketQuote[]{
 const selected=uniqueMarketRequests(requests);if(selected.some(r=>r.marketRef.kind!=='coin'))throw Error('Wrong market kind.');const data=object(exactMarketJson(text));const ids=new Set(selected.map(r=>r.marketRef.id));if(Object.keys(data).some(id=>!ids.has(id)))throw Error('Unexpected market identity.');
 return selected.map(request=>{const row=object(data[request.marketRef.id]);const stamp=row.last_updated_at;if(!(stamp instanceof JsonNumber)||!/^\d+$/.test(stamp.lexeme))throw Error('Missing provider observation time.');const timestamp=Number(stamp.lexeme)*1000;if(!Number.isSafeInteger(timestamp)||timestamp<=0||timestamp>now+60000)throw Error('Invalid quote timestamp.');return marketQuote(request,row[request.currency.toLowerCase()],now,new Date(timestamp).toISOString());});
}
export function parseRwaQuotes(text:string,requests:readonly MarketQuoteRequest[],now=Date.now()):MarketQuote[]{
 const selected=uniqueMarketRequests(requests);if(selected.some(r=>r.marketRef.kind!=='rwa'||r.currency!=='USD'))throw Error('RWA references support USD only.');const data=exactMarketJson(text);if(!Array.isArray(data)||data.length>250)throw Error('Invalid RWA response.');const rows=new Map<string,Record<string,unknown>>();
 for(const raw of data){const row=object(raw);if(typeof row.id!=='string'||rows.has(row.id)||!selected.some(r=>r.marketRef.id===row.id))throw Error('Unexpected RWA identity.');rows.set(row.id,row);}
 return selected.map(request=>{const row=object(rows.get(request.marketRef.id));if(request.marketRef.kind!=='rwa'||row.asset_type!==request.marketRef.assetType)throw Error('RWA type mismatch.');const data=object(row.tokenized_market_data);let observedAt:string|undefined;if(data.last_updated!=null){observedAt=z.iso.datetime().parse(data.last_updated);}return marketQuote(request,data.current_price,now,observedAt);});
}
