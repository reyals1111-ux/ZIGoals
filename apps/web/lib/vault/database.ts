/** Transactional local records. Plaintext at rest; encryption is a separate upload/backup boundary. */
type Header={revision:number;fields:Record<string,unknown>;arrays:Record<string,string[]>};
type Change={field:string;id:string;value:unknown;deleted:boolean};
export type PendingOperation={space:string;domain:string;operation:string;base:number;revision:number;changes:Change[];header:Header};
const request=<T>(r:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Private storage request failed. No success was recorded.'));});
const done=(t:IDBTransaction)=>new Promise<void>((resolve,reject)=>{t.oncomplete=()=>resolve();t.onabort=()=>reject(Error('Private storage transaction failed. Previous data was preserved.'));t.onerror=()=>{};});
const key=(...parts:string[])=>JSON.stringify(parts);
const byteLength=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v)).length;
function split(data:unknown,revision:number):{header:Header;rows:Map<string,{field:string;id:string;value:unknown}>}{
 if(!data||typeof data!=='object'||Array.isArray(data)||byteLength(data)>32_000_000)throw Error('Private data exceeds the supported 32 MB domain capacity. Export before continuing.');
 const fields:Record<string,unknown>={},arrays:Record<string,string[]>={},rows=new Map<string,{field:string;id:string;value:unknown}>();
 for(const [field,value] of Object.entries(data)){
  if(!Array.isArray(value)){fields[field]=value;continue;}
  if(value.length>50_000)throw Error('Private collection exceeds 50,000 records.');
  const order:string[]=[];const used=new Set<string>();
  value.forEach((item,index)=>{
   if(byteLength(item)>250_000)throw Error('A private record exceeds 250 KB. Split or export the record.');
   const id=typeof item?.id==='string'?item.id:typeof item?.positionId==='string'&&typeof item?.observedAt==='string'?key(item.positionId,item.observedAt):String(index);
   if(used.has(id))throw Error('Duplicate private record identity.');used.add(id);order.push(id);rows.set(key(field,id),{field,id,value:item});
  });arrays[field]=order;
 }
 const header={revision,fields,arrays};if(byteLength(header)>2_000_000)throw Error('Private index capacity reached.');return {header,rows};
}
export class VaultDatabase{
 private connection:Promise<IDBDatabase>|undefined;
 constructor(private name='zigoals-private-vault-v1'){}
 private open(){
  if(!this.connection)this.connection=new Promise<IDBDatabase>((resolve,reject)=>{
   const r=indexedDB.open(this.name,1);
   r.onupgradeneeded=()=>{for(const s of ['headers','records','outbox','receipts','recovery'])r.result.createObjectStore(s);};
   r.onerror=()=>{this.connection=undefined;reject(Error('Private database unavailable. Check browser storage permissions.'));};
   r.onblocked=()=>{reject(Error('Close older ZIGoals tabs, then retry the storage upgrade.'));};
   r.onsuccess=()=>{const db=r.result;db.onversionchange=()=>{db.close();this.connection=undefined;};resolve(db);};
  });return this.connection;
 }
 close(){void this.connection?.then(db=>db.close());this.connection=undefined;}
 async read(space:string,domain:string):Promise<{revision:number;data:Record<string,unknown>}|null>{
  const db=await this.open(),tx=db.transaction(['headers','records'],'readonly'),finish=done(tx);
  const header=await request(tx.objectStore('headers').get(key(space,domain))) as Header|undefined;
  if(!header){await finish;return null;}
  const data={...header.fields};
  await Promise.all(Object.entries(header.arrays).map(async([field,ids])=>{data[field]=await Promise.all(ids.map(id=>request(tx.objectStore('records').get(key(space,domain,field,id)))));}));
  await finish;return {revision:header.revision,data};
 }
 async page(space:string,domain:string,field:string,offset=0,limit=100):Promise<unknown[]>{
  if(!Number.isSafeInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>500)throw Error('Invalid page.');
  const db=await this.open(),tx=db.transaction(['headers','records'],'readonly'),finish=done(tx),h=await request(tx.objectStore('headers').get(key(space,domain))) as Header|undefined;
  const result=await Promise.all((h?.arrays[field]??[]).slice(offset,offset+limit).map(id=>request(tx.objectStore('records').get(key(space,domain,field,id)))));await finish;return result;
 }
 async commit(space:string,domain:string,base:number,data:unknown,operation=crypto.randomUUID(),original?:string):Promise<number>{
  return (await this.commitBatch(space,[{domain,base,data,operation,original}]))[0]!;
 }
 /** Related sections, recovery copies and their outboxes share one IndexedDB transaction. */
 async commitBatch(space:string,inputs:readonly {domain:string;base:number;data:unknown;operation?:string;original?:string}[],fence:()=>void=()=>{}):Promise<number[]>{
  if(!space||!inputs.length||inputs.length>4||new Set(inputs.map(v=>v.domain)).size!==inputs.length)throw Error('Invalid private batch.');
  // Capture all caller values before the first await, then hash outside the transaction.
  const captured=inputs.map(input=>{
   const {domain,base,original}=input,operation=input.operation??crypto.randomUUID();
   if(!domain||!operation||!Number.isSafeInteger(base)||base<0)throw Error('Invalid private operation.');
   const serialized=JSON.stringify(input.data);return {domain,base,original,operation,serialized,prepared:split(JSON.parse(serialized),base+1)};
  });
  if(new Set(captured.map(v=>v.operation)).size!==captured.length)throw Error('Duplicate private operation.');
  const entries=await Promise.all(captured.map(async input=>({...input,digest:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input.serialized)))).map(b=>b.toString(16).padStart(2,'0')).join('')})));
  fence();const db=await this.open(),tx=db.transaction(['headers','records','outbox','receipts','recovery'],'readwrite'),finish=done(tx),revisions:number[]=[];
  try{
   for(const {domain,base,original,operation,prepared,digest}of entries){
    fence();const receiptKey=key(space,operation),receipt=await request(tx.objectStore('receipts').get(receiptKey)) as {domain:string;digest:string;revision:number}|undefined;
    if(receipt){if(receipt.domain!==domain||receipt.digest!==digest)throw Error('Operation identity was reused for different data.');revisions.push(receipt.revision);continue;}
    const headKey=key(space,domain),current=await request(tx.objectStore('headers').get(headKey)) as Header|undefined;
    if((current?.revision??0)!==base)throw Error('Data changed on another tab or device. Reload and review before saving.');
    const changes:Change[]=[];
    for(const [field,ids]of Object.entries(current?.arrays??{}))for(const id of ids)if(!prepared.rows.has(key(field,id))){tx.objectStore('records').delete(key(space,domain,field,id));changes.push({field,id,value:null,deleted:true});}
    for(const row of prepared.rows.values()){
     const rowKey=key(space,domain,row.field,row.id),previous=await request(tx.objectStore('records').get(rowKey));
     if(JSON.stringify(previous)!==JSON.stringify(row.value)){tx.objectStore('records').put(row.value,rowKey);changes.push({...row,deleted:false});}
    }
    fence();tx.objectStore('headers').put(prepared.header,headKey);
    tx.objectStore('outbox').put({space,domain,operation,base,revision:base+1,changes,header:prepared.header} satisfies PendingOperation,receiptKey);
    tx.objectStore('receipts').put({domain,digest,revision:base+1},receiptKey);
    if(original!==undefined)tx.objectStore('recovery').put({space,domain,raw:original},key(space,domain,operation));
    revisions.push(base+1);
   }
   fence();await finish;return revisions;
  }catch(error){try{tx.abort();}catch{}await finish.catch(()=>{});throw error;}
 }
 async pending(space:string):Promise<PendingOperation[]>{const db=await this.open(),tx=db.transaction('outbox','readonly'),finish=done(tx);const all=await request(tx.objectStore('outbox').getAll()) as PendingOperation[];await finish;return all.filter(x=>x.space===space);}
 async acknowledge(space:string,operation:string){const db=await this.open(),tx=db.transaction('outbox','readwrite'),finish=done(tx);tx.objectStore('outbox').delete(key(space,operation));await finish;}
 async recovery(space:string,domain:string):Promise<string[]>{const db=await this.open(),tx=db.transaction('recovery','readonly'),finish=done(tx);const all=await request(tx.objectStore('recovery').getAll()) as {space:string;domain:string;raw:string}[];await finish;return all.filter(x=>x.space===space&&x.domain===domain).map(x=>x.raw);}
}
