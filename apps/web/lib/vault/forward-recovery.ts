import {cloudSnapshot,mergePrivateData,type CloudTransport,type PrivateData,type SyncState,SyncJournal,type Domain} from './cloud-sync';
import {type VaultManifest} from './crypto';
import {encryptBackup} from './backup';
export type ForwardReview={id:string;account:string;original:SyncState;local:PrivateData;cloud:PrivateData;merged:PrivateData;revision:number;domains:Domain[];file:string;recovery:string};
type Validate=(data:PrivateData,prior?:PrivateData)=>void;
export async function prepareForwardRecovery(account:string,local:PrivateData,transport:CloudTransport,journal:SyncJournal,key:CryptoKey,manifest:VaultManifest,validate:Validate,fence:()=>void,domains:Domain[]=['finance','habits','health','settings']):Promise<ForwardReview>{
 if(journal.accountId!==account)throw Error('Recovery account changed.');const original=await journal.read();if(!original.pending)throw Error('No pending queue needs forward recovery.');if((original.pendingPolicy??0)>2)throw Error('A newer sync policy requires an app update. Original queue was preserved.');
 if(original.pending.vault!==manifest.vault)throw Error('Queued work belongs to another vault.');
 if((original.pendingHealth||original.pending.changes.some(r=>r.domain==='health'))&&!domains.includes('health'))throw Error('Review queued Health work only after explicitly enabling Health sync.');
 domains=domains.filter(d=>!original.heldDomains?.includes(d));
 const remote=await cloudSnapshot(transport,key,manifest,original.revision,domains,(original.epoch??1)===manifest.epoch?original.headRevision:0,(original.epoch??1)===manifest.epoch?original.headDigest:null);fence();
 for(const domain of domains)if((original.domainGenerations?.[domain]??0)!==(remote.domainGenerations[domain]??0)&&local[domain]!==undefined)throw Error('A cloud section was deleted. Preserve the queue and review that deletion before forward recovery.');
 const select=(data:PrivateData)=>Object.fromEntries(domains.filter(d=>data[d]!==undefined).map(d=>[d,data[d]]));
 const merged=mergePrivateData(select(original.base),select(local),remote.data);validate(merged,select(original.base));validate(merged,select(local));validate(merged,remote.data);
 const id=crypto.randomUUID(),payload={format:'zigoals-forward-recovery',version:1,id,account,journal:original,local,cloud:remote.data,merged};
 const backup=await encryptBackup({settings:JSON.stringify(payload)});fence();return {id,account,original,local,cloud:remote.data,merged,revision:remote.revision,domains,...backup};
}
export async function confirmForwardRecovery(review:ForwardReview,local:PrivateData,transport:CloudTransport,journal:SyncJournal,key:CryptoKey,manifest:VaultManifest,validate:Validate,apply:(data:PrivateData)=>Promise<void>,fence:()=>void){
 if(journal.accountId!==review.account)throw Error('Recovery account changed.');const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
 if(!same(local,review.local)||!same(await journal.read(),review.original))throw Error('Records or queue changed. Prepare a new recovery review.');
 const remote=await cloudSnapshot(transport,key,manifest,review.revision,review.domains,(review.original.epoch??1)===manifest.epoch?review.original.headRevision:0,(review.original.epoch??1)===manifest.epoch?review.original.headDigest:null);fence();
 if(remote.revision!==review.revision||!same(remote.data,review.cloud))throw Error('Cloud changed. Prepare a new recovery review.');
 const selected=(data:PrivateData)=>Object.fromEntries(review.domains.filter(d=>data[d]!==undefined).map(d=>[d,data[d]]));
 validate(review.merged,selected(review.original.base));validate(review.merged,selected(local));validate(review.merged,remote.data);fence();
 // Applying is repeatable. If interrupted before archival, the original journal still blocks sync.
 await apply(review.merged);fence();
 await journal.recover(review.id,review.original,{version:1,epoch:manifest.epoch,domainGenerations:remote.domainGenerations,heldDomains:review.original.heldDomains,base:{...review.original.base,...remote.data},revision:remote.revision,headRevision:remote.head?.revision??0,headDigest:remote.headDigest,pending:null},fence);
}
