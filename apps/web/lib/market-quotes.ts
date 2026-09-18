import {z} from 'zod';
/** Identity is chain/denom/precision, never a display ticker. Future providers add mappings here. */
export const assetIdentitySchema=z.object({network:z.string().min(1).max(100),denom:z.string().min(1).max(250),decimals:z.number().int().min(0).max(18)}).strict();
export const nativeZigIdentity={network:'zigchain-1',denom:'uzig',decimals:6} as const;
export const marketQuoteSchema=z.object({base:assetIdentitySchema,currency:z.string().regex(/^[A-Z]{3,10}$/),price:z.string().regex(/^[1-9]\d{0,77}$/),priceDecimals:z.number().int().min(0).max(30),source:z.string().min(1).max(100),providerAssetId:z.string().min(1).max(100),observedAt:z.iso.datetime(),verification:z.literal('VERIFIED')}).strict();
export type MarketQuote=z.infer<typeof marketQuoteSchema>;
export type ValuationEvidence={state:'fresh'|'stale'|'manual'|'missing';quote?:MarketQuote;observedAt?:string;source?:string};
export const QUOTE_FRESH_MS=5*60*1000;
export function quoteIsStale(quote:MarketQuote,now=Date.now()):boolean {const at=Date.parse(quote.observedAt);return !Number.isFinite(now)||!Number.isFinite(at)||at>now+60000||now-at>QUOTE_FRESH_MS;}
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
export async function boundedQuoteText(response:Response):Promise<string>{
 if(Number(response.headers.get('content-length'))>8192)throw Error('Quote response too large.');
 if(!response.body)throw Error('Empty quote response.');const reader=response.body.getReader();let length=0;const chunks:Uint8Array[]=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>8192)throw Error('Quote response too large.');chunks.push(value);}}finally{await reader.cancel();}
 const data=new Uint8Array(length);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder('utf-8',{fatal:true}).decode(data);
}
export function verifiedNativeQuote(raw:unknown,now=Date.now()):MarketQuote {
 const quote=marketQuoteSchema.parse(raw);
 if(!sameAsset(quote.base,nativeZigIdentity)||quote.currency!=='USD'||quote.source!=='CoinGecko'||quote.providerAssetId!=='zignaly'||Date.parse(quote.observedAt)>now+60000)throw Error('Unsupported market evidence.');
 return quote;
}
