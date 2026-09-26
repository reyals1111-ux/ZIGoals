import type {AtomicMarketStorage} from './durable-market-account';
import type {WorkState} from './market-work-fence';
export type CachePointer={marketChunks:number;bytes:number;prefix:string};
const pointer=(value:unknown):value is CachePointer=>!!value&&typeof value==='object'&&'marketChunks'in value;
export const cacheValueBytes=(value:unknown)=>pointer(value)?value.bytes:new TextEncoder().encode(JSON.stringify(value??null)).length;
export async function loadCacheValue(storage:AtomicMarketStorage,value:unknown):Promise<unknown>{
 if(!pointer(value))return value;
 let text='';for(let i=0;i<value.marketChunks;i++){const part=await storage.get<string>(value.prefix+i);if(typeof part!=='string')throw Error('Incomplete retained evidence.');text+=part;}
 if(new TextEncoder().encode(text).length!==value.bytes)throw Error('Incomplete retained evidence.');return JSON.parse(text);
}
export async function removeCacheValue(storage:AtomicMarketStorage,value:unknown){if(pointer(value))for(let i=0;i<value.marketChunks;i++)await storage.delete(value.prefix+i);}
export async function storeCacheValue(storage:AtomicMarketStorage,key:string,generation:number,value:unknown):Promise<CachePointer>{
 const text=JSON.stringify(value),bytes=new TextEncoder().encode(text).length;
 if(bytes>16*1024*1024)throw Error('Public evidence capacity.');
 // At most 24k UTF-16 code units (<96 KiB UTF-8) per SQLite-backed storage value.
 const prefix=`cache:${key}:${generation}:`,marketChunks=Math.ceil(text.length/24000);
 for(let i=0;i<marketChunks;i++)await storage.put(prefix+i,text.slice(i*24000,(i+1)*24000));return {prefix,marketChunks,bytes};
}
/** Never evict a live owner's state. A retired state's UUID lease cannot match any
 * successor even when its storage slot is reused. Budget receipts are independent. */
export async function evictMarketWork(storage:AtomicMarketStorage,index:string[],now:number,except:string,bytesNeeded:number,maxBytes:number,maxWorks:number){
 const rows=await Promise.all(index.map(async key=>({key,state:await storage.get<WorkState<unknown>>(`work:${key}`)})));
 let bytes=rows.reduce((n,r)=>n+(r.state?.evidence?cacheValueBytes(r.state.evidence.value):0),0),keys=[...index];
 const candidates=rows.filter(r=>r.key!==except&&(!r.state?.lease||now>=Math.min(r.state.lease.deadline,r.state.lease.expiresAt))).sort((a,b)=>(a.state?.lastTime??0)-(b.state?.lastTime??0));
 while((bytes+bytesNeeded>maxBytes||!keys.includes(except)&&keys.length>=maxWorks)&&candidates.length){const oldest=candidates.shift()!;if(oldest.state?.evidence){bytes-=cacheValueBytes(oldest.state.evidence.value);await removeCacheValue(storage,oldest.state.evidence.value);}await storage.delete(`work:${oldest.key}`);await storage.delete(`owner:${oldest.key}`);keys=keys.filter(key=>key!==oldest.key);}
 if(keys.length!==index.length)await storage.put('work-index',keys);
 return {ok:bytes+bytesNeeded<=maxBytes&&(keys.includes(except)||keys.length<maxWorks),index:keys};
}
