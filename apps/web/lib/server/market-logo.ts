import {beginPendingWork,ownPendingWork,waitForPendingWork,workIsPending,createRequestAdmission,type PendingWork} from '../pending-work';
import {validatedLogoUrl,LOGO_FRESH_MS} from '../market-insights';
const MAX_BYTES=512*1024,MAX_ENTRIES=128,MAX_CACHE_BYTES=16*1024*1024;
type Image={bytes:Uint8Array<ArrayBuffer>;contentType:string};
function matches(bytes:Uint8Array,type:string){
 const starts=(prefix:number[])=>prefix.every((value,index)=>bytes[index]===value);
 if(type==='image/png')return starts([137,80,78,71,13,10,26,10]);
 if(type==='image/jpeg')return starts([255,216,255]);
 if(type==='image/gif')return starts([71,73,70,56])&&[55,57].includes(bytes[4]??0)&&bytes[5]===97;
 return type==='image/webp'&&starts([82,73,70,70])&&[87,69,66,80].every((value,index)=>bytes[index+8]===value);
}
/** Fixed CDN/path allowlist plus no redirects. No credentials, SVG, arbitrary hosts or user headers. */
export function createMarketLogoCache(fetcher:typeof fetch=fetch,clock=()=>Date.now()){
 const entries=new Map<string,{image:Image|null;until:number}>(),pending=new Map<string,PendingWork>(),attempts:number[]=[],admission=createRequestAdmission(2,9000);
 function trim(){while(entries.size>MAX_ENTRIES||[...entries.values()].reduce((sum,row)=>sum+(row.image?.bytes.byteLength??0),0)>MAX_CACHE_BYTES)entries.delete(entries.keys().next().value!);}
 async function load(raw:unknown):Promise<Image|null>{
 const url=validatedLogoUrl(raw);if(!url)return null;const now=clock(),cached=entries.get(url);if(cached&&now<cached.until){entries.delete(url);entries.set(url,cached);return cached.image;}const ongoing=pending.get(url);if(ongoing){if(!await waitForPendingWork(ongoing))return cached?.image??null;if(pending.get(url)===ongoing&&!workIsPending(ongoing))pending.delete(url);return load(url);}
 while(attempts.length&&attempts[0]!<=now-60000)attempts.shift();if(attempts.length>=60)return cached?.image??null;attempts.push(now);
 const work=beginPendingWork();pending.set(url,work);await ownPendingWork(work,(async()=>{let image:Image|null=null,permit:symbol|undefined;
 try{permit=await admission.acquire();const response=await fetcher(url,{credentials:'omit',redirect:'manual',referrerPolicy:'no-referrer',cache:'no-store',headers:{Accept:'image/png,image/jpeg,image/webp,image/gif'},signal:AbortSignal.timeout(8000)});if(!response.ok||response.redirected)throw Error('Unavailable');const type=response.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase()??'';if(!['image/png','image/jpeg','image/gif','image/webp'].includes(type)||Number(response.headers.get('Content-Length')??0)>MAX_BYTES)throw Error('Invalid image');
 const reader=response.body?.getReader();if(!reader)throw Error('Empty image');const chunks:Uint8Array[]= [];let length=0;try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>MAX_BYTES)throw Error('Image too large');chunks.push(part.value);}}finally{await reader.cancel().catch(()=>undefined);}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}if(!matches(bytes,type))throw Error('Invalid image');image={bytes,contentType:type};
 }catch{/* Broken/provider images become the UI fallback; no upstream details are exposed. */}finally{if(permit)admission.release(permit);}
 if(pending.get(url)!==work||!workIsPending(work))return;const retained=image??cached?.image??null;entries.delete(url);entries.set(url,{image:retained,until:clock()+(image?LOGO_FRESH_MS:60000)});trim();
 })().finally(()=>{work.done=true;if(pending.get(url)===work)pending.delete(url);}));return entries.get(url)?.image??cached?.image??null;
 }
 return {load};
}
export const serverMarketLogoCache=createMarketLogoCache();
