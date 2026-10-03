import type {AtomicMarketStorage} from './durable-market-account';
const ABSENT=Symbol('absent');
type Slot=unknown|typeof ABSENT;
/** One transaction's reads and writes, held in memory with read-your-writes. Nothing reaches storage until
 * `flush`, which rewrites only values that changed and deletes only keys that exist, so a command that ends
 * without a semantic change, or with the same state, writes no row at all. */
export class BufferedMarketStorage implements AtomicMarketStorage {
 private stored=new Map<string,Slot>();
 private pending=new Map<string,Slot>();
 constructor(private tx:AtomicMarketStorage){}
 private async base(key:string):Promise<Slot>{
  if(!this.stored.has(key)){const value=await this.tx.get(key);this.stored.set(key,value===undefined?ABSENT:value);}
  return this.stored.get(key);
 }
 async get<T>(key:string):Promise<T|undefined>{const value=this.pending.has(key)?this.pending.get(key):await this.base(key);return value===ABSENT?undefined:structuredClone(value) as T;}
 async put(key:string,value:unknown){this.pending.set(key,structuredClone(value));}
 async delete(key:string){const existed=await this.get(key)!==undefined;this.pending.set(key,ABSENT);return existed;}
 transaction<T>(fn:(tx:AtomicMarketStorage)=>Promise<T>):Promise<T>{return fn(this);}
 /** Only the writes that would change what is stored. */
 async changes():Promise<[string,Slot][]>{
  const out:[string,Slot][]=[];
  for(const [key,value] of this.pending){const before=await this.base(key);if(value===ABSENT?before!==ABSENT:before===ABSENT||JSON.stringify(before)!==JSON.stringify(value))out.push([key,value]);}
  return out;
 }
 /** Applies the effective changes to the underlying transaction and returns how many rows were written. */
 async flush():Promise<number>{
  const changes=await this.changes();
  for(const [key,value] of changes){if(value===ABSENT)await this.tx.delete(key);else await this.tx.put(key,value);}
  return changes.length;
 }
}
