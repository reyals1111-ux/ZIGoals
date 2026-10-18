import {readNativePositions} from '../native-positions';
import {snapshotHeight, type ReadMode} from '../position-reader';
export {MAINNET_REFUSED} from '../position-reader';
import type {Position} from '../positions';
/**
 * Session Z-Cloud Part 5 (C4, option a, ADR-019 C38): the read-only positions relay's own limits. One answer per network
 * and address is kept for 60 seconds (requests arriving meanwhile, or while it is being read, share it); a read that
 * fails is never kept. Each client (its connecting address) may start 10 chain reads a minute, and this server 120;
 * an answer from the cache costs nothing. Kept in this server's memory only, never stored.
 *
 * Session AF (ADR-028 H16, H63): right after a signed staking action the browser asks with `minHeight` (the block its
 * transaction confirmed at): a kept answer from a lower block, or one still being read, is not reused, and the new read
 * counts toward the same limits.
 */
export const POSITIONS_CACHE_MS=60_000,CLIENT_READS_PER_MINUTE=10,SERVER_READS_PER_MINUTE=120,CACHE_ENTRIES=500;
export const READS_LIMITED='Too many reads just now. Try again in a minute; your saved snapshots are unchanged.';
type Read=(mode:ReadMode,account:string)=>Promise<Position[]>;
type Entry={at:number;value:Promise<Position[]>;height?:bigint};
export function positionsRelay({now=Date.now,read=readNativePositions as Read}:{now?:()=>number;read?:Read}={}){
 const cache=new Map<string,Entry>(),clients=new Map<string,number[]>(),server:number[]=[];
 const recent=(times:number[],t:number)=>{while(times.length&&t-times[0]!>=60_000)times.shift();return times;};
 return async function answer(mode:ReadMode,account:string,client:string,minHeight?:string):Promise<{positions:Position[]}|{retryAfter:number}>{
  const t=now(),key=mode+':'+account,hit=cache.get(key);
  const highEnough=!minHeight||(hit?.height!==undefined&&hit.height>=BigInt(minHeight));
  if(hit&&t-hit.at<POSITIONS_CACHE_MS&&highEnough)return {positions:await hit.value};
  if(hit&&t-hit.at>=POSITIONS_CACHE_MS)cache.delete(key);
  const mine=recent(clients.get(client)??[],t),all=recent(server,t);
  if(mine.length>=CLIENT_READS_PER_MINUTE||all.length>=SERVER_READS_PER_MINUTE){const first=Math.min(mine.length>=CLIENT_READS_PER_MINUTE?mine[0]!:Infinity,all.length>=SERVER_READS_PER_MINUTE?all[0]!:Infinity);return {retryAfter:Math.max(1,Math.ceil((first+60_000-t)/1000))};}
  mine.push(t);all.push(t);clients.delete(client);clients.set(client,mine);
  // The oldest client windows go first, so a flood of addresses cannot grow this map without bound.
  while(clients.size>CACHE_ENTRIES*4)clients.delete(clients.keys().next().value!);
  const value=read(mode,account),entry:Entry={at:t,value};cache.delete(key);cache.set(key,entry);
  value.then(positions=>{entry.height=snapshotHeight(positions);},()=>{if(cache.get(key)===entry)cache.delete(key);});
  while(cache.size>CACHE_ENTRIES)cache.delete(cache.keys().next().value!);
  return {positions:await value};
 };
}
