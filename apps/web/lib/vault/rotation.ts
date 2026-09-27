import {z} from 'zod';
import {manifestSchema,openRecord,sealRecord,type VaultManifest} from './crypto';
import {cloudSnapshot,rowSchema,type CloudTransport,type Journal,type Row} from './cloud-sync';
export type RotationTransport={request:(operation?:unknown)=>Promise<unknown>};
const statusSchema=z.object({rotation:z.object({operation:z.uuid(),base:z.number().int().nonnegative(),manifest:manifestSchema}).nullable()});
/** The new secret must be saved before entry. Retry uses the same staged manifest and recovery key. */
export async function rotateVault(transport:CloudTransport,rotation:RotationTransport,journal:Journal,oldKey:CryptoKey,oldManifest:VaultManifest,nextKey:CryptoKey,nextManifest:VaultManifest,fence:()=>void){
 const state=await journal.read();if(state.pending)throw Error('Resolve or export pending work before rotating.');
 if(nextManifest.vault!==oldManifest.vault||nextManifest.epoch!==oldManifest.epoch+1)throw Error('Rotation must advance exactly one vault epoch.');
 fence();const published=z.object({manifest:manifestSchema.nullable()}).parse(await transport.read(null));fence();
 if(JSON.stringify(published.manifest)===JSON.stringify(nextManifest)){
  // A commit may have landed before the response/journal acknowledgement was lost.
  // Authenticate every published part under the saved next key before accepting it.
  const recovered=await cloudSnapshot(transport,nextKey,nextManifest,state.revision);fence();
  await journal.write({...state,epoch:nextManifest.epoch,revision:recovered.revision,headRevision:recovered.head?.revision??0,headDigest:recovered.headDigest,pending:null});return {revision:recovered.revision,epoch:nextManifest.epoch,rotated:true as const};
 }
 fence();const snapshot=await cloudSnapshot(transport,oldKey,oldManifest,state.revision,undefined,state.headRevision,state.headDigest);fence();
 const {rotation:pending}=statusSchema.parse(await rotation.request());fence();
 if(pending&&JSON.stringify(pending.manifest)!==JSON.stringify(nextManifest))throw Error('A different rotation is staged. Resume with its saved recovery secret or explicitly abort it.');
 const operation=pending?.operation??crypto.randomUUID();
 await rotation.request({action:'begin',operation,base:snapshot.revision,manifest:nextManifest});fence();
 // Retry compares decrypted content, then retains staged bytes. Encryption uses fresh
 // nonces, so the server must return staged rows rather than accept changed replay.
 const staged=new Map<string,Row>();let cursor:string|null=null;const seen=new Set<string>();
 do{const page=z.object({rows:z.array(rowSchema).max(2),cursor:z.string().nullable()}).parse(await rotation.request({action:'staged',operation,cursor}));fence();for(const row of page.rows){if(staged.has(row.id))throw Error('Duplicate staged record.');staged.set(row.id,row);}cursor=page.cursor;if(cursor){if(seen.has(cursor)||seen.size>10000)throw Error('Invalid rotation cursor.');seen.add(cursor);}}while(cursor);
 let batch:Row[]=[];
 async function flush(){if(batch.length){fence();await rotation.request({action:'stage',operation,rows:batch});fence();batch=[];}}
 for(const row of snapshot.rows.values()){
  const oldContext={vault:oldManifest.vault,domain:row.domain,object:row.id,revision:row.revision,epoch:oldManifest.epoch};
  const plain=await openRecord(oldKey,oldContext,row.envelope);fence();const nextContext={...oldContext,epoch:nextManifest.epoch},existing=staged.get(row.id);
  if(existing){if(existing.domain!==row.domain||existing.revision!==row.revision||existing.deleted!==row.deleted||existing.epoch!==nextManifest.epoch||JSON.stringify(await openRecord(nextKey,nextContext,existing.envelope))!==JSON.stringify(plain))throw Error('Staged rotation integrity check failed. Active data was preserved.');continue;}
  const encrypted={...row,epoch:nextManifest.epoch,envelope:await sealRecord(nextKey,nextContext,plain)};fence();
  if(batch.length&&new TextEncoder().encode(JSON.stringify([...batch,encrypted])).length>850000)await flush();batch.push(encrypted);if(batch.length===100)await flush();
 }
 await flush();fence();const result=z.object({revision:z.number().int().positive(),epoch:z.number().int().positive(),rotated:z.literal(true)}).parse(await rotation.request({action:'commit',operation}));fence();
 if(result.revision!==snapshot.revision+1||result.epoch!==nextManifest.epoch)throw Error('Unexpected rotation acknowledgement. Reopen with the saved new secret.');
 await journal.write({...state,epoch:nextManifest.epoch,revision:result.revision,headRevision:0,headDigest:null,pending:null});return result;
}
