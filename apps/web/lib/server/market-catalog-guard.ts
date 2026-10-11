import type {AtomicMarketStorage} from './durable-market-account';
import type {PublicMarketWork} from './market-coordinator';
import type {WorkState} from './market-work-fence';
import {FEATURED_MARKET_IDS} from '../market-assets';
/** Session S (FIX_PLAN C2, Q-WRK-02): asset IDs are checked against the server-held catalog before any lease or charge.
 *
 * The index: when catalog evidence is published, the account also writes the partition's IDs as a compact index. One
 * pointer row (`market-catalog-ids:<kind>`) holds a random version, the count and the catalog work's evidence
 * generation; chunk rows hold whole IDs joined by newlines, at most 24k characters each. The rows are outside
 * `work-index`, so evicting the catalog evidence never removes them. A missing or corrupt index counts as absent.
 *
 * An index refuses unknown IDs only when it is authoritative: at least 1,000 coins or 10 RWAs, and not under 90% of
 * the index it replaced (a truncated provider answer never starts refusing valid assets). Without one, the account keeps
 * its earlier behaviour, bounded by Session R1's limits. The app's featured assets are always accepted. */
export const CATALOG_INDEX_MIN={coin:1000,rwa:10} as const;
export type CatalogKind=keyof typeof CATALOG_INDEX_MIN;
type Pointer={version:string;count:number;chunks:number;generation:number;authoritative:boolean};
export type CatalogIds={version:string;ids:Set<string>;authoritative:boolean};
const pointerRow=(kind:CatalogKind)=>`market-catalog-ids:${kind}`;
const chunkRow=(kind:CatalogKind,version:string,index:number)=>`market-catalog-ids:${kind}:${version}:${index}`;
const CHUNK=24000;
/** The ID chunks, split on ID boundaries. */
export function catalogChunks(ids:readonly string[]):string[]{
 const chunks:string[]=[];let current='';
 for(const id of ids){if(current&&current.length+1+id.length>CHUNK){chunks.push(current);current='';}current=current?current+'\n'+id:id;}
 if(current)chunks.push(current);return chunks;
}
/** Writes the index of one catalog partition (called with the publication of its evidence) and removes the old one. */
export async function writeCatalogIndex(tx:AtomicMarketStorage,kind:CatalogKind,ids:readonly string[],generation:number){
 const previous=await tx.get<Pointer>(pointerRow(kind)),version=crypto.randomUUID(),chunks=catalogChunks(ids);
 for(const [index,text] of chunks.entries())await tx.put(chunkRow(kind,version,index),text);
 const authoritative=ids.length>=CATALOG_INDEX_MIN[kind]&&!(previous&&ids.length<previous.count*0.9);
 await tx.put(pointerRow(kind),{version,count:ids.length,chunks:chunks.length,generation,authoritative} satisfies Pointer);
 if(previous)for(let index=0;index<previous.chunks;index++)await tx.delete(chunkRow(kind,previous.version,index));
}
/** Whether stored catalog evidence has its index. Evidence from before Session S has none, so it is treated as cold
 * once and refetched, which writes the index through the normal publication. */
export async function catalogIndexed(tx:AtomicMarketStorage,work:PublicMarketWork,state:WorkState<unknown>){
 if(work.operation!=='catalog')return true;
 const pointer=await tx.get<Pointer>(pointerRow(work.kind));
 return !!pointer&&pointer.generation===state.evidence?.generation;
}
/** The partition's IDs, from the instance cache when the stored version is unchanged. Null when absent or corrupt. */
export async function loadCatalogIds(tx:AtomicMarketStorage,kind:CatalogKind,cache:Map<CatalogKind,CatalogIds>):Promise<CatalogIds|null>{
 const pointer=await tx.get<Pointer>(pointerRow(kind));if(!pointer||typeof pointer.version!=='string')return null;
 const cached=cache.get(kind);if(cached?.version===pointer.version)return cached;
 const ids=new Set<string>();
 for(let index=0;index<pointer.chunks;index++){const text=await tx.get<string>(chunkRow(kind,pointer.version,index));if(typeof text!=='string')return null;for(const id of text.split('\n'))ids.add(id);}
 if(ids.size!==pointer.count)return null;
 const loaded={version:pointer.version,ids,authoritative:pointer.authoritative===true};cache.set(kind,loaded);return loaded;
}
/** Provider 404s for a coin's history, kept 15 minutes, at most 128 coins (the soonest to expire leaves first). */
export const NOT_FOUND_MS=15*60000;
const notFoundRow='market-not-found';
type NotFound={entries:Record<string,number>};
export async function recordNotFound(tx:AtomicMarketStorage,id:string,now:number){
 const entries=Object.entries((await tx.get<NotFound>(notFoundRow))?.entries??{}).filter(([,until])=>until>now);
 const next=[...entries.filter(([key])=>key!=='coin:'+id),['coin:'+id,now+NOT_FOUND_MS] as [string,number]].sort((a,b)=>b[1]-a[1]).slice(0,128);
 await tx.put(notFoundRow,{entries:Object.fromEntries(next)} satisfies NotFound);
}
/** The provider path accepts only these history IDs (market-charged-read.ts); others would be charged and refused. */
const HISTORY_ID=/^[a-z0-9_-]+$/;
const featured=(kind:CatalogKind,id:string)=>(FEATURED_MARKET_IDS[kind] as readonly string[]).includes(id);
/** The reason to refuse a cold work before any lease or charge, or undefined. Catalog works are never refused here. */
export async function assetRefusal(tx:AtomicMarketStorage,work:PublicMarketWork,now:number,cache:Map<CatalogKind,CatalogIds>):Promise<string|undefined>{
 if(work.operation==='catalog')return undefined;
 const {kind,id}=work.pair.marketRef;
 if(work.operation==='history'){
  if(!HISTORY_ID.test(id))return 'UNKNOWN_ASSET';
  const until=(await tx.get<NotFound>(notFoundRow))?.entries?.['coin:'+id];if(until!==undefined&&until>now)return 'NOT_FOUND_RECENTLY';
 }
 if(featured(kind,id))return undefined;
 const index=await loadCatalogIds(tx,kind,cache);
 return index?.authoritative&&!index.ids.has(id)?'UNKNOWN_ASSET':undefined;
}
