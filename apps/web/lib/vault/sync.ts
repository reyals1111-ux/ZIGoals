/** Encrypted record coordination. Integration must provide account-scoped durable journal storage. */
import {z} from 'zod';
import {envelopeSchema,manifestSchema,openRecord,sealRecord,type VaultManifest} from './crypto';
const rowSchema=z.object({id:z.uuid(),domain:z.enum(['finance','habits','health','settings']),revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),epoch:z.literal(1),envelope:envelopeSchema,deleted:z.boolean()}).strict();
const pageSchema=z.object({protocol:z.literal(1),revision:z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),manifest:manifestSchema.nullable(),records:z.array(rowSchema).max(100),cursor:z.string().regex(/^record:[0-9a-f-]{36}$/i).nullable()}).strict();
export type SyncRow=z.infer<typeof rowSchema>;
export type PlainRecord={id:string;domain:SyncRow['domain'];value:unknown;deleted:boolean};
export type Snapshot={revision:number;manifest:VaultManifest;rows:SyncRow[];records:PlainRecord[]};
export type Transport={read:(cursor:string|null)=>Promise<unknown>;write:(operation:Operation)=>Promise<{revision:number;replayed?:boolean}>};
export type Operation={protocol:1;operation:string;base:number;changes:SyncRow[];manifest?:VaultManifest};
export class SyncConflict extends Error{constructor(public records:string[]){super('Concurrent records need review. Neither version was overwritten.');}}
export async function pullVault(transport:Transport,key:CryptoKey,expected:VaultManifest,minimumRevision=0):Promise<Snapshot>{
 const rows:SyncRow[]=[],seen=new Set<string>(),cursors=new Set<string>();let cursor:string|null=null,revision:number|undefined;let bytes=0;
 do{
  const raw=await transport.read(cursor),page=pageSchema.parse(raw);bytes+=new TextEncoder().encode(JSON.stringify(raw)).length;
  if(bytes>34_000_000)throw Error('Vault exceeds the supported download capacity.');
  if(!page.manifest||JSON.stringify(page.manifest)!==JSON.stringify(expected))throw Error('Account or vault changed. Lock and verify the intended account.');
  if(page.revision<minimumRevision)throw Error('Older server revision refused. Local records were preserved.');
  if(revision!==undefined&&page.revision!==revision)throw Error('Vault changed while downloading. Retry without applying this partial page.');revision=page.revision;
  for(const row of page.records){if(seen.has(row.id))throw Error('Duplicate encrypted record.');seen.add(row.id);rows.push(row);}
  cursor=page.cursor;if(cursor){if(cursors.has(cursor)||cursors.size>=500)throw Error('Invalid vault pagination.');cursors.add(cursor);}
 }while(cursor);
 const records:PlainRecord[]=[];
 for(const row of rows){const value=await openRecord(key,{vault:expected.vault,domain:row.domain,object:row.id,revision:row.revision,epoch:1},row.envelope);
  // Tombstone meaning is authenticated, not trusted from unauthenticated metadata alone.
  const payload=z.object({deleted:z.boolean(),value:z.unknown()}).strict().parse(value);if(payload.deleted!==row.deleted)throw Error('Tombstone integrity check failed.');
  records.push({id:row.id,domain:row.domain,value:payload.value,deleted:payload.deleted});
 }
 return {revision:revision!,manifest:expected,rows,records};
}
const same=(a:PlainRecord|undefined,b:PlainRecord|undefined)=>JSON.stringify(a)===JSON.stringify(b);
/** Conservative three-way record merge. Financial same-record conflicts never get LWW. */
export function reconcile(base:PlainRecord[],local:PlainRecord[],remote:PlainRecord[]):PlainRecord[]{
 const maps=[base,local,remote].map(list=>{const m=new Map<string,PlainRecord>();for(const r of list){if(m.has(r.id))throw Error('Duplicate record identity.');m.set(r.id,r);}return m;});
 const ids=new Set(maps.flatMap(m=>[...m.keys()])),merged:PlainRecord[]=[],conflicts:string[]=[];
 for(const id of ids){const [b,l,r]=maps.map(m=>m.get(id));
  // Absence is not a deletion; callers must retain explicit tombstones.
  if(b&&(!l||!r)){conflicts.push(id);continue;}
  if([b,l,r].filter(Boolean).some(v=>v!.domain!==(b??l??r)!.domain)){conflicts.push(id);continue;}
  if(same(l,r)){if(l)merged.push(l);continue;}
  if(same(l,b)){if(r)merged.push(r);continue;}if(same(r,b)){if(l)merged.push(l);continue;}
  conflicts.push(id);
 }
 if(conflicts.length)throw new SyncConflict(conflicts);return merged;
}
/** Persist the returned ciphertext operation BEFORE transport.write; retry these exact bytes. */
export async function prepareOperation(key:CryptoKey,remote:Snapshot,next:PlainRecord[]):Promise<Operation|null>{
 const before=new Map(remote.records.map(r=>[r.id,r])),rows=new Map(remote.rows.map(r=>[r.id,r])),seen=new Set<string>(),changes:SyncRow[]=[];
 for(const record of next){if(seen.has(record.id))throw Error('Duplicate record identity.');seen.add(record.id);if(same(before.get(record.id),record))continue;
  const old=rows.get(record.id);if(old&&old.domain!==record.domain)throw Error('Record domain cannot change.');const revision=(old?.revision??0)+1;
  const envelope=await sealRecord(key,{vault:remote.manifest.vault,domain:record.domain,object:record.id,revision,epoch:1},{deleted:record.deleted,value:record.value});
  changes.push(rowSchema.parse({id:record.id,domain:record.domain,revision,epoch:1,envelope,deleted:record.deleted}));
 }
 if(remote.records.some(r=>!seen.has(r.id)))throw Error('Deletion requires an explicit retained tombstone.');if(!changes.length)return null;
 const operation:Operation={protocol:1,operation:crypto.randomUUID(),base:remote.revision,changes};
 if(changes.length>100||new TextEncoder().encode(JSON.stringify(operation)).length>990_000)throw Error('Atomic sync batch capacity reached. Local edits remain pending; export before resolving.');
 return operation;
}
