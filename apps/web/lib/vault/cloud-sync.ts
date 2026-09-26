import {z} from 'zod';
import {manifestSchema,envelopeSchema,epochSchema,sealRecord,openRecord,type VaultManifest} from './crypto';
export const DOMAINS=['finance','habits','health','settings'] as const;
export type Domain=typeof DOMAINS[number];
export type PrivateData=Partial<Record<Domain,string>>;
const PENDING_POLICY=2;
const generationsSchema=z.partialRecord(z.enum(DOMAINS),z.number().int().nonnegative());
export type DomainGenerations=Partial<Record<Domain,number>>;
const HEAD='00000000-0000-4000-8000-000000000001';
export const rowSchema=z.object({id:z.uuid(),domain:z.enum(DOMAINS),revision:z.number().int().positive(),epoch:epochSchema,envelope:envelopeSchema,deleted:z.boolean()}).strict();
export type Row=z.infer<typeof rowSchema>;
export type CloudOperation={protocol:1;vault:string;operation:string;base:number;changes:Row[];manifest?:VaultManifest;domainGenerations?:DomainGenerations};
const pageSchema=z.object({protocol:z.literal(1),revision:z.number().int().nonnegative(),manifest:manifestSchema.nullable(),records:z.array(rowSchema).max(100),cursor:z.string().nullable(),domainGenerations:generationsSchema.optional()}).strict();
const entrySchema=z.object({generation:z.number().int().nonnegative().optional(),parts:z.array(z.uuid()).min(1).max(700),bytes:z.number().int().positive().max(32_000_000),digest:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const catalogSchema=z.object({kind:z.literal('zigoals-private-catalog'),version:z.literal(1),domains:z.object({finance:entrySchema.optional(),habits:entrySchema.optional(),health:entrySchema.optional(),settings:entrySchema.optional()}).strict()}).strict();
type Catalog=z.infer<typeof catalogSchema>;
export type SyncState={version:1;epoch?:number;domainGenerations?:DomainGenerations;heldDomains?:Domain[];base:PrivateData;revision:number;headRevision:number;headDigest:string|null;pending:CloudOperation|null;pendingHealth?:boolean;pendingPolicy?:number};
export const syncStateSchema=z.object({version:z.literal(1),epoch:epochSchema.optional(),domainGenerations:generationsSchema.optional(),heldDomains:z.array(z.enum(DOMAINS)).max(4).optional(),base:z.partialRecord(z.enum(DOMAINS),z.string().max(32_000_000)),revision:z.number().int().nonnegative(),headRevision:z.number().int().nonnegative(),headDigest:z.string().regex(/^[a-f0-9]{64}$/).nullable(),pendingHealth:z.boolean().optional(),pendingPolicy:z.number().int().positive().optional(),pending:z.object({protocol:z.literal(1),vault:z.uuid(),operation:z.uuid(),base:z.number().int().nonnegative(),changes:z.array(rowSchema).max(100),manifest:manifestSchema.optional(),domainGenerations:generationsSchema.optional()}).strict().nullable()}).strict();
export type Journal={read:()=>Promise<SyncState>;write:(state:SyncState)=>Promise<void>};
export type CloudTransport={read:(cursor:string|null)=>Promise<unknown>;write:(operation:CloudOperation)=>Promise<{revision:number}>};
const bytes=(v:string)=>new TextEncoder().encode(v).length;
const context=(manifest:VaultManifest,row:Pick<Row,'id'|'domain'|'revision'>)=>({vault:manifest.vault,object:row.id,domain:row.domain,revision:row.revision,epoch:manifest.epoch});
async function digest(raw:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function cloudSnapshot(transport:CloudTransport,key:CryptoKey,manifest:VaultManifest,minimum=0,allowed:readonly Domain[]=DOMAINS,minimumHead=0,knownHeadDigest:string|null=null){
 const rows=new Map<string,Row>();let cursor:string|null=null,revision:number|undefined,total=0;const cursors=new Set<string>();let domainGenerations:DomainGenerations|undefined;
 do{const p=pageSchema.parse(await transport.read(cursor));if(domainGenerations&&JSON.stringify(domainGenerations)!==JSON.stringify(p.domainGenerations??{}))throw Error('Cloud deletion policy changed during download.');domainGenerations=p.domainGenerations??{};total+=bytes(JSON.stringify(p));if(total>36_000_000)throw Error('Cloud download exceeds supported capacity.');if(!p.manifest||JSON.stringify(p.manifest)!==JSON.stringify(manifest))throw Error('Account or vault changed. Lock and verify your account.');if(p.revision<minimum)throw Error('Older cloud revision refused.');if(revision!==undefined&&revision!==p.revision)throw Error('Cloud changed during download. Retry; no partial data was applied.');revision=p.revision;for(const row of p.records){if(row.epoch!==manifest.epoch)throw Error('Cloud record epoch mismatch.');if(rows.has(row.id))throw Error('Duplicate cloud record.');rows.set(row.id,row);}cursor=p.cursor;if(cursor){if(!/^record:[0-9a-f-]{36}$/i.test(cursor)||cursors.has(cursor)||cursors.size>=500)throw Error('Invalid cloud page.');cursors.add(cursor);}}while(cursor);
 const head=rows.get(HEAD);if((head?.revision??0)<minimumHead)throw Error('Older encrypted catalog refused.');const headDigest=head?await digest(JSON.stringify(head.envelope)):null;if(head?.revision===minimumHead&&knownHeadDigest!==null&&headDigest!==knownHeadDigest)throw Error('Encrypted catalog fork refused.');
 const catalog:Catalog=head?catalogSchema.parse(await openRecord(key,context(manifest,head),head.envelope)):{kind:'zigoals-private-catalog',version:1,domains:{}};
 if(head&&(head.domain!=='settings'||head.deleted))throw Error('Invalid encrypted catalog.');
 const data:PrivateData={};for(const domain of allowed){const item=catalog.domains[domain];if(!item||(item.generation??0)<(domainGenerations?.[domain]??0))continue;if(new Set(item.parts).size!==item.parts.length)throw Error('Duplicate snapshot part.');let raw='';for(const id of item.parts){const row=rows.get(id);if(!row||row.domain!==domain||row.deleted)throw Error('Snapshot is incomplete. Local records were preserved.');const value=await openRecord(key,context(manifest,row),row.envelope);if(typeof value!=='string'||value.length>48000)throw Error('Invalid snapshot part.');raw+=value;}if(bytes(raw)!==item.bytes||await digest(raw)!==item.digest)throw Error('Snapshot integrity check failed.');data[domain]=raw;}
 return {data,catalog,domainGenerations:domainGenerations??{},revision:revision!,head,headDigest,rows,storedBytes:[...rows.values()].reduce((n,r)=>n+bytes(JSON.stringify(r)),0)};
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function identity(value:unknown):string|null{if(!value||typeof value!=='object')return null;const r=value as Record<string,unknown>;return typeof r.id==='string'?r.id:typeof r.sourceId==='string'&&typeof r.sourceKind==='string'?JSON.stringify([r.sourceKind,r.sourceId]):null;}
function mergeValue(base:unknown,local:unknown,remote:unknown,path:string):unknown{
 if(same(local,remote))return local;if(same(local,base))return remote;if(same(remote,base))return local;
 // Two clients may independently initialize a formerly absent optional group.
 // Only identity arrays/objects can merge; divergent scalar values still conflict.
 if(base===undefined&&Array.isArray(local)&&Array.isArray(remote))base=[];
 if(base===undefined&&[local,remote].every(v=>v!==null&&typeof v==='object'&&!Array.isArray(v)))base={};
 if([base,local,remote].every(v=>Array.isArray(v))){
  const lists=[base,local,remote] as unknown[][];if(lists.every(a=>a.every(v=>identity(v)!==null))){const maps=lists.map(a=>new Map(a.map(v=>[identity(v)!,v])));if(maps.some((m,i)=>m.size!==lists[i]!.length))throw Error('Duplicate sync identity.');const orders=maps.map(m=>[...m.keys()]),common=orders[0]!.filter(id=>maps[1]!.has(id)&&maps[2]!.has(id));const localOrder=orders[1]!.filter(id=>common.includes(id)),remoteOrder=orders[2]!.filter(id=>common.includes(id));if(!same(localOrder,common)&&!same(remoteOrder,common)&&!same(localOrder,remoteOrder))throw Error('Conflicting record order. Both versions were preserved.');const ordered=!same(localOrder,common)?orders[1]!:!same(remoteOrder,common)?orders[2]!:orders[0]!;const all=new Set([...ordered,...orders[1]!,...orders[2]!]);return [...all].flatMap(id=>{const [b,l,r]=maps.map(m=>m.get(id));const result=mergeValue(b,l,r,path+' record');return result===undefined?[]:[result];});}
 }
 if([base,local,remote].every(v=>v!==null&&typeof v==='object'&&!Array.isArray(v))){const all=new Set([base,local,remote].flatMap(v=>Object.keys(v as object)));const result:Record<string,unknown>={};for(const name of all){const value=mergeValue((base as Record<string,unknown>)[name],(local as Record<string,unknown>)[name],(remote as Record<string,unknown>)[name],path+' field');if(value!==undefined)result[name]=value;}return result;}
 throw Error(`Conflicting ${path}. Both local and cloud versions were preserved; review before syncing.`);
}
// These two receipt sets are append-only idempotency records, not editable lists.
// Inspect them before generic equality shortcuts so identical removals cannot pass.
function reconcileHealthReceipts(base:unknown,local:unknown,remote:unknown){
 const daily=(v:unknown):Record<string,unknown>|undefined=>v&&typeof v==='object'&&'daily' in v&&v.daily&&typeof v.daily==='object'?v.daily as Record<string,unknown>:undefined;
 const groups=[base,local,remote].map(daily);
 for(const field of ['waterOperations','copyOperations']){
  const lists=groups.map(g=>g?.[field]??[]);
  if(!lists.every(v=>Array.isArray(v)&&v.every(id=>typeof id==='string')&&new Set(v).size===v.length))throw Error('Invalid Health operation receipt set.');
  const [prior,left,right]=lists as string[][];
  if(prior!.some(id=>!left!.includes(id)||!right!.includes(id)))throw Error('Health operation receipt removal refused.');
  if(groups[1]&&groups[2]){
   const merged=[...prior!,...[...new Set([...left!,...right!])].filter(id=>!prior!.includes(id)).sort()];
   groups[1][field]=merged;groups[2][field]=merged;
  }
 }
}
export function mergePrivateData(base:PrivateData,local:PrivateData,remote:PrivateData):PrivateData{
 const result:PrivateData={};for(const domain of DOMAINS){if(local[domain]===undefined){if(remote[domain]!==undefined)result[domain]=remote[domain];continue;}
  const b=base[domain],l=local[domain],r=remote[domain];if(r===undefined){result[domain]=l;continue;}if(b===undefined){if(l!==r)throw Error('Unlinked local and cloud records differ. Export both before choosing what to keep.');result[domain]=r;continue;}
  if(domain==='finance'){if(l!==b&&r!==b&&l!==r)throw Error('Conflicting financial changes. Local and cloud evidence remain separate; export both before reconciling.');result[domain]=l===b?r:l;}
  else {const parsed=[b,l,r].map(v=>JSON.parse(v));if(domain==='health')reconcileHealthReceipts(parsed[0],parsed[1],parsed[2]);result[domain]=JSON.stringify(mergeValue(parsed[0],parsed[1],parsed[2],domain));}
 }return result;
}
export class RevisionConflict extends Error{constructor(){super('Cloud changed. Local records were preserved. Retry to reconcile.');}}
/** Immutable encrypted chunks stage first; one CAS-protected catalog publishes the complete snapshot. */
export async function synchronize(transport:CloudTransport,journal:Journal,key:CryptoKey,manifest:VaultManifest,local:PrivateData,validate:(data:PrivateData,prior?:PrivateData)=>void,fence:()=>void,allowed:readonly Domain[]=DOMAINS){
 let state=await journal.read(),requiresHealth=false;allowed=allowed.filter(d=>!state.heldDomains?.includes(d));
 if((state.epoch??1)!==manifest.epoch){if(state.pending)throw Error('Pending work uses a retired epoch. Preserve its recovery copy before reviewing it.');state={...state,epoch:manifest.epoch,headRevision:0,headDigest:null};}
 async function send(operation:CloudOperation){fence();await journal.write({...state,pending:operation,pendingHealth:requiresHealth,pendingPolicy:PENDING_POLICY});fence();let answer:{revision:number};try{answer=await transport.write(operation);}catch(error){if(error instanceof RevisionConflict){state={...state,pending:null};await journal.write(state);}throw error;}if(answer.revision!==operation.base+1)throw Error('Unexpected cloud acknowledgement.');state={...state,revision:answer.revision,pending:null};await journal.write(state);return answer.revision;}
 if(state.pending){if(state.pendingPolicy!==PENDING_POLICY)throw Error(state.pendingPolicy!==undefined&&state.pendingPolicy>PENDING_POLICY?'Pending work uses a newer sync policy. Update the app; queued work was preserved and not sent.':'Pending work uses an older sync policy. Export your records and review recovery before retrying; queued work was preserved and not sent.');requiresHealth=!!state.pendingHealth||state.pending.changes.some(row=>row.domain==='health');if(requiresHealth&&!allowed.includes('health'))throw Error('Pending Health transfer requires your Health sync permission. It was not sent.');if(state.pending.vault!==manifest.vault)throw Error('Pending work belongs to another vault.');await send(state.pending);}
 fence();const remote=await cloudSnapshot(transport,key,manifest,state.revision,allowed,state.headRevision,state.headDigest);fence();for(const domain of allowed){if((state.domainGenerations?.[domain]??0)!==(remote.domainGenerations[domain]??0)&&local[domain]!==undefined)throw Error(`${domain==='health'?'Health':domain} cloud copy was deleted. Local records were kept; review before restoring them to cloud.`);}const next=mergePrivateData(Object.fromEntries(allowed.map(d=>[d,state.base[d]])),Object.fromEntries(allowed.map(d=>[d,local[d]])),remote.data);const selected=(data:PrivateData)=>Object.fromEntries(allowed.filter(d=>data[d]!==undefined).map(d=>[d,data[d]]));validate(next,selected(state.base));validate(next,remote.data);validate(next,selected(local));requiresHealth=next.health!==undefined&&next.health!==remote.data.health;
 const catalog:Catalog=structuredClone(remote.catalog),chunks:Row[]=[];let revision=remote.revision,headRevision=remote.head?.revision??0,headDigest=remote.headDigest;
 for(const domain of allowed){const raw=next[domain];if(raw===undefined||raw===remote.data[domain])continue;if(bytes(raw)>32_000_000)throw Error('Domain exceeds supported sync capacity.');const parts:string[]=[];
  for(let offset=0;offset<raw.length;offset+=48000){const row={id:crypto.randomUUID(),domain,revision:1,epoch:manifest.epoch,deleted:false};parts.push(row.id);chunks.push({...row,envelope:await sealRecord(key,context(manifest,row),raw.slice(offset,offset+48000))});}
  catalog.domains[domain]={generation:remote.domainGenerations[domain]??0,parts,bytes:bytes(raw),digest:await digest(raw)};
 }
 if(chunks.length){
  const headBase={id:HEAD,domain:'settings' as const,revision:(remote.head?.revision??0)+1,epoch:manifest.epoch,deleted:false},head={...headBase,envelope:await sealRecord(key,context(manifest,headBase),catalogSchema.parse(catalog))};
  if(remote.storedBytes+chunks.reduce((n,r)=>n+bytes(JSON.stringify(r)),0)+bytes(JSON.stringify(head))>31_000_000)throw Error('Cloud capacity is nearly full. Export before continuing; existing history was not compacted.');
  let batch:Row[]=[];for(const row of chunks){if(batch.length&&bytes(JSON.stringify([...batch,row]))>850000){revision=await send({protocol:1,vault:manifest.vault,operation:crypto.randomUUID(),domainGenerations:remote.domainGenerations,base:revision,changes:batch});batch=[];}batch.push(row);}if(batch.length)revision=await send({protocol:1,vault:manifest.vault,operation:crypto.randomUUID(),domainGenerations:remote.domainGenerations,base:revision,changes:batch});
  // The catalog remains unchanged if any staged chunk write fails. CAS refuses another writer's head.
  revision=await send({protocol:1,vault:manifest.vault,operation:crypto.randomUUID(),domainGenerations:remote.domainGenerations,base:revision,changes:[head]});headRevision=head.revision;headDigest=await digest(JSON.stringify(head.envelope));
 }
 fence();return {data:next,revision,commit:async()=>{fence();await journal.write({version:1,epoch:manifest.epoch,domainGenerations:remote.domainGenerations,heldDomains:state.heldDomains,base:{...state.base,...next},revision,headRevision,headDigest,pending:null});}};
}
export class SyncJournal implements Journal{
 constructor(private account:string){z.uuid().parse(account);}
 get accountId(){return this.account;}
 private async database(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('zigoals-account-sync-v1',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('state'))r.result.createObjectStore('state');if(!r.result.objectStoreNames.contains('recovery'))r.result.createObjectStore('recovery');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Sync journal unavailable.'));r.onblocked=()=>reject(Error('Close older tabs before syncing.'));});}
 async read():Promise<SyncState>{const db=await this.database();try{return await new Promise((resolve,reject)=>{const r=db.transaction('state').objectStore('state').get(this.account);r.onsuccess=()=>{const value=r.result;if(value&&value.version!==1){reject(Error('Newer sync journal requires an app update.'));return;}try{if(value)syncStateSchema.parse(value);resolve(value??{version:1,base:{},revision:0,headRevision:0,headDigest:null,pending:null});}catch{reject(Error('Sync journal is damaged. Export before recovery.'));}};r.onerror=()=>reject(Error('Sync journal unreadable.'));});}finally{db.close();}}
 async recover(id:string,original:SyncState,replacement:SyncState,fence:()=>void){z.uuid().parse(id);syncStateSchema.parse(replacement);const db=await this.database();try{await new Promise<void>((resolve,reject)=>{const t=db.transaction(['state','recovery'],'readwrite'),state=t.objectStore('state'),read=state.get(this.account);let reason='Recovery transaction failed. Original queue was preserved.';read.onsuccess=()=>{try{fence();if(JSON.stringify(read.result)!==JSON.stringify(original))throw Error('Queue changed. Prepare a new recovery review.');t.objectStore('recovery').put({id,original:structuredClone(original)},JSON.stringify([this.account,id]));state.put(structuredClone(replacement),this.account);}catch(error){reason=error instanceof Error?error.message:reason;t.abort();}};t.oncomplete=()=>resolve();t.onabort=()=>reject(Error(reason));t.onerror=()=>{};});}finally{db.close();}}
 async recoveryHistory():Promise<{id:string;original:SyncState}[]>{const db=await this.database();try{return await new Promise((resolve,reject)=>{const prefix=JSON.stringify([this.account]).slice(0,-1)+',';const r=db.transaction('recovery').objectStore('recovery').getAll(IDBKeyRange.bound(prefix,prefix+'\uffff'));r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Recovery archive unavailable.'));});}finally{db.close();}}
 async write(value:SyncState){const db=await this.database();try{await new Promise<void>((resolve,reject)=>{const t=db.transaction('state','readwrite');t.objectStore('state').put(structuredClone(value),this.account);t.oncomplete=()=>resolve();t.onerror=()=>reject(Error('Sync journal write failed.'));t.onabort=()=>reject(Error('Sync journal write aborted.'));});}finally{db.close();}}
}
