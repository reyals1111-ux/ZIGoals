import {z} from 'zod';
import {cloudSnapshot,type CloudTransport,type Domain,type Journal,type PrivateData} from './cloud-sync';
import {type VaultManifest} from './crypto';
import {encryptBackup} from './backup';
export type DomainReview={domain:Domain;kind:'delete'|'restore'|'keep';local:PrivateData;revision:number;generation:number;operation:string;file:string;recovery:string};
export async function prepareDomainReview(kind:DomainReview['kind'],domain:Domain,local:PrivateData,transport:CloudTransport,journal:Journal,key:CryptoKey,manifest:VaultManifest,fence:()=>void):Promise<DomainReview>{
 const state=await journal.read();if(state.pending)throw Error('Resolve pending sync before reviewing cloud deletion.');
 const remote=await cloudSnapshot(transport,key,manifest,state.revision,[domain],state.headRevision,state.headDigest);fence();
 if((kind==='restore'||kind==='keep')&&(!remote.domainGenerations[domain]||local[domain]===undefined))throw Error('Restore review requires retained local records and a previously deleted cloud section.');
 const payload={format:'zigoals-domain-recovery',version:1,domain,local,cloud:remote.data};
 const backup=await encryptBackup({settings:JSON.stringify(payload)});fence();
 return {kind,domain,local,revision:remote.revision,generation:remote.domainGenerations[domain]??0,operation:crypto.randomUUID(),...backup};
}
/** Explicit consent after a downloaded recovery copy. It never sends the obsolete queued operation. */
export async function acceptDomainRestore(review:DomainReview,local:PrivateData,transport:CloudTransport,journal:Journal,key:CryptoKey,manifest:VaultManifest,fence:()=>void){
 if(!['restore','keep'].includes(review.kind)||JSON.stringify(local)!==JSON.stringify(review.local))throw Error('Local records changed. Prepare a new restore review.');
 const state=await journal.read();if(state.pending)throw Error('Resolve pending sync before restoring a deleted cloud section.');
 const remote=await cloudSnapshot(transport,key,manifest,state.revision,[review.domain],state.headRevision,state.headDigest);fence();
 if(remote.revision!==review.revision||remote.domainGenerations[review.domain]!==review.generation)throw Error('Cloud section changed. Prepare a new review.');
 const base={...state.base};if(remote.data[review.domain]===undefined)delete base[review.domain];
 await journal.write({...state,base,heldDomains:review.kind==='keep'?[...new Set([...(state.heldDomains??[]),review.domain])]:(state.heldDomains??[]).filter(d=>d!==review.domain),domainGenerations:{...state.domainGenerations,[review.domain]:review.generation}});fence();
}
export async function deleteCloudDomain(account:string,review:DomainReview,fence:()=>void){
 if(review.kind!=='delete')throw Error('Prepare a deletion review first.');fence();
 const result=await fetch('/api/private-account',{method:'POST',headers:{'content-type':'application/json','x-zigoals-account':account},cache:'no-store',signal:AbortSignal.timeout(20000),body:JSON.stringify({action:'domain',operation:{action:'delete-domain',domain:review.domain,confirm:'DELETE CLOUD '+review.domain.toUpperCase(),operation:review.operation}})});fence();
 if(!result.ok)throw Error('Cloud section deletion was not confirmed. Keep your recovery copy and retry.');
 const raw=await result.text();if(raw.length>4096)throw Error('Deletion acknowledgement exceeds capacity.');
 z.object({deleted:z.literal(true)}).parse(JSON.parse(raw));
}
