import {publicMarketWorkKey,type PublicMarketWork} from './market-coordinator';
import {workEvidenceStale} from './market-evidence';
import type {MarketCommand} from './market-charged-read';
type Command={action?:string;works?:PublicMarketWork[];publish?:{work:PublicMarketWork;value:unknown}[];followers?:{id:string;work:PublicMarketWork}[]};
/** Fresh evidence this coordinator isolate has already seen, so a request whose works are all fresh here needs no
 * account command at all (Session R1). An entry answers only while it is fresh by the account's own rule, and the
 * cache holds at most `limit` characters of evidence, oldest out first. It never answers a cold work: leases,
 * admission and every charge stay with the account. Catalogs are not held here. */
export class MarketIsolateCache {
 private rows=new Map<string,{value:unknown;size:number}>();private size=0;
 constructor(private limit=8*1024*1024){}
 /** CACHE_HIT rows for every work, or null when any is missing or stale. */
 answer(works:PublicMarketWork[],now:number):Record<string,unknown>[]|null{
  const rows:Record<string,unknown>[]=[];
  for(const work of works){
   const key=publicMarketWorkKey(work),row=this.rows.get(key);
   if(!row||workEvidenceStale(work,row.value,now)){if(row)this.drop(key);return null;}
   rows.push({ok:true,status:'CACHE_HIT',...(work.operation==='quote'?{quote:row.value}:{value:row.value})});
  }
  return rows;
 }
 remember(work:PublicMarketWork,value:unknown,now:number){
  if(value===null||value===undefined||work.operation==='catalog')return;
  try{if(workEvidenceStale(work,value,now))return;}catch{return;}
  const key=publicMarketWorkKey(work),size=JSON.stringify(value).length;if(size>this.limit/64)return;
  this.drop(key);this.rows.set(key,{value,size});this.size+=size;
  for(const [old,row] of this.rows){if(this.size<=this.limit)break;this.rows.delete(old);this.size-=row.size;}
 }
 private drop(key:string){const row=this.rows.get(key);if(row){this.rows.delete(key);this.size-=row.size;}}
 /** An account command that answers an all-fresh `acquire-many` here, and remembers the hits, the accepted
  * publications and the answered followers that pass through it. */
 wrap(command:MarketCommand,clock:()=>number=Date.now):MarketCommand{
  return async raw=>{
   const c=raw as Command;
   if(c.action==='acquire-many'&&Array.isArray(c.works)){const hits=this.answer(c.works,clock());if(hits)return {ok:true,results:hits,attempts:[]};}
   const result=await command(raw);
   const rows=(list:unknown)=>Array.isArray(list)?list as Record<string,unknown>[]:[];
   if(c.action==='acquire-many')for(const [i,row] of rows(result.results).entries()){const work=c.works?.[i];if(work&&row.ok===true&&row.status==='CACHE_HIT')this.remember(work,row.quote??row.value,clock());}
   if(c.action==='complete')for(const [i,row] of rows(result.published).entries()){const item=c.publish?.[i];if(item&&row.ok===true)this.remember(item.work,item.value,clock());}
   if(c.action==='poll-many')for(const [i,row] of rows(result.followers).entries()){const item=c.followers?.[i];if(item&&row.ok===true&&row.status==='CACHE_HIT')this.remember(item.work,row.quote??row.value,clock());}
   return result;
  };
 }
}
