import {cloudSnapshot,DOMAINS,SyncJournal,type CloudTransport,type PrivateData,type SyncState,type Domain} from './cloud-sync';
import {type VaultManifest} from './crypto';
import {encryptBackup} from './backup';
import {validateData} from './account-data';
import {platformSchema,allocationBalance,goalProgress} from '../positions';
export type ConflictChoice='local'|'cloud'|'combined';
export type Choices=Record<string,ConflictChoice>;
export type Conflict={id:string;path:string;local:unknown;cloud:unknown;combined?:string};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const identity=(v:unknown)=>object(v)?typeof v.id==='string'?v.id:typeof v.goalId==='string'&&typeof v.positionId==='string'?JSON.stringify([v.goalId,v.positionId]):typeof v.sourceKind==='string'&&typeof v.sourceId==='string'?JSON.stringify([v.sourceKind,v.sourceId]):null:null;
/** A review proposal only: callers must validate and explicitly commit. No LWW. */
export function resolveConflicts(base:PrivateData,local:PrivateData,cloud:PrivateData,choices:Choices){
 const conflicts:Conflict[]=[];let unresolved=0;
 function choose(b:unknown,l:unknown,r:unknown,path:string[]):unknown{
  if(same(l,r))return l;if(same(l,b))return r;if(same(r,b))return l;
  if(path.length===3&&path[0]==='health'&&path[1]==='measurements'&&object(l)&&object(r)&&Array.isArray(l.corrections)&&Array.isArray(r.corrections)){
   const chosen=select(b,l,r,path) as Record<string,unknown>,other=chosen===l?r:l;
   const snapshot=(v:Record<string,unknown>)=>Object.fromEntries(Object.entries(v).filter(([k])=>!['id','createdAt','source','corrections'].includes(k)));
   const history=[...(object(b)&&Array.isArray(b.corrections)?b.corrections:[]),...l.corrections,...r.corrections,snapshot(other)];
   return {...chosen,corrections:[...new Map(history.map(v=>[JSON.stringify(v),v])).values()]};
  }
  if(b===undefined&&object(l)&&object(r))b={};if(b===undefined&&Array.isArray(l)&&Array.isArray(r))b=[];
  if(object(b)&&object(l)&&object(r)){const result:Record<string,unknown>={};for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){const value=choose(b[k],l[k],r[k],[...path,k]);if(value!==undefined)result[k]=value;}return result;}
  if(Array.isArray(b)&&Array.isArray(l)&&Array.isArray(r)){
   if(['waterOperations','copyOperations'].includes(path.at(-1)??'')&&[b,l,r].every(a=>a.every(v=>typeof v==='string'))){if(b.some(v=>!l.includes(v)||!r.includes(v)))throw Error('Operation receipts cannot be removed.');return [...new Set([...b,...l,...r])];}
   if([b,l,r].every(a=>a.every(v=>identity(v)!==null))){const maps=[b,l,r].map(a=>new Map(a.map(v=>[identity(v)!,v])));if(maps.some((m,i)=>m.size!==[b,l,r][i]!.length))throw Error('Duplicate record identity.');
    const prior=[...maps[0]!.keys()].filter(k=>maps[1]!.has(k)&&maps[2]!.has(k)),left=[...maps[1]!.keys()].filter(k=>prior.includes(k)),right=[...maps[2]!.keys()].filter(k=>prior.includes(k));
    const order=!same(left,prior)&&!same(right,prior)&&!same(left,right)?select(prior,left,right,[...path,'order']):!same(left,prior)?left:!same(right,prior)?right:prior;
    return [...new Set([...(order as string[]),...maps[1]!.keys(),...maps[2]!.keys(),...maps[0]!.keys()])].flatMap(k=>{const value=choose(maps[0]!.get(k),maps[1]!.get(k),maps[2]!.get(k),[...path,k]);return value===undefined?[]:[value];});
   }
  }
  return select(b,l,r,path);
 }
 function select(b:unknown,l:unknown,r:unknown,path:string[]){
  if(conflicts.length>=1000)throw Error('This review exceeds 1,000 conflicting fields. Export both copies before a smaller recovery.');
  const id=JSON.stringify(path);let combined:string|undefined;
  if(path[0]==='finance'&&['quantity','value'].includes(path.at(-1)??'')&&[b,l,r].every(v=>typeof v==='string'&&/^(0|[1-9]\d{0,77})$/.test(v))){const value=BigInt(l as string)+BigInt(r as string)-BigInt(b as string);if(value>=0n&&value.toString().length<=78)combined=value.toString();}
  conflicts.push({id,path:path.join(' / '),local:l,cloud:r,...(combined===undefined?{}:{combined})});const choice=choices[id];if(choice==='local')return l;if(choice==='cloud')return r;if(choice==='combined'&&combined!==undefined)return combined;unresolved++;return l;
 }
 const data:PrivateData={};for(const domain of DOMAINS){const parse=(v:string|undefined)=>v===undefined?undefined:JSON.parse(v);const value=choose(parse(base[domain]),parse(local[domain]),parse(cloud[domain]),[domain]);if(value!==undefined)data[domain]=JSON.stringify(value);}return {data,conflicts,unresolved};
}
export type ConflictReview={id:string;account:string;original:SyncState;local:PrivateData;cloud:PrivateData;domains:Domain[];revision:number;file:string;recovery:string};
export function validateResolution(review:Pick<ConflictReview,'original'|'local'|'cloud'>,data:PrivateData){
 for(const prior of [review.original.base,review.local,review.cloud])validateData(data,prior);
 if(data.finance){const candidate=platformSchema.parse(JSON.parse(data.finance));
  for(const position of candidate.positions)if(allocationBalance(candidate,position.id).deficit!=='0')throw Error('Resolution would over-allocate an asset. Choose compatible quantities and allocations.');
  for(const goal of candidate.goals){if(!['VALUE','QUANTITY'].includes(goal.type))continue;const p=goalProgress(candidate,goal.id);if(BigInt(p.current)>BigInt(p.target))throw Error('Resolution would fund a Goal above its target. Review allocation quantities.');}
  // Keep both accepted funding operations' quantity effects. An explicit review
  // may change allocation, but it cannot silently discard either new deposit.
  if(review.original.base.finance&&review.local.finance&&review.cloud.finance){const [base,left,right]=[review.original.base.finance,review.local.finance,review.cloud.finance].map(raw=>platformSchema.parse(JSON.parse(raw)));for(const p of base!.positions){
   const priorIds=new Set(base!.contributions.map(e=>e.id));const added=[...new Map([...left!.contributions,...right!.contributions].filter(e=>!priorIds.has(e.id)&&e.positionId===p.id&&e.fundingMode==='FUND_GOAL'&&!e.reversesId).map(e=>[e.id,e])).values()];if(!added.length)continue;
   const expected=BigInt(p.quantity)+added.reduce((n,e)=>n+BigInt(e.quantity),0n),actual=candidate.positions.find(v=>v.id===p.id);if(!actual||BigInt(actual.quantity)<expected)throw Error('Resolution would discard an accepted funding quantity. Combine the exact changes or reconcile the evidence first.');
  }}
 }
}
export async function prepareConflictReview(account:string,local:PrivateData,transport:CloudTransport,journal:SyncJournal,key:CryptoKey,manifest:VaultManifest,fence:()=>void,domains:Domain[]):Promise<ConflictReview>{
 const original=await journal.read();if(original.pending)throw Error('Preserve and repair pending work before resolving records.');domains=domains.filter(d=>!original.heldDomains?.includes(d));
 const select=(data:PrivateData)=>Object.fromEntries(domains.filter(d=>data[d]!==undefined).map(d=>[d,data[d]]));local=select(local);
 const remote=await cloudSnapshot(transport,key,manifest,original.revision,domains,original.headRevision,original.headDigest);fence();for(const d of domains)if((original.domainGenerations?.[d]??0)!==(remote.domainGenerations[d]??0))throw Error('Review cloud section deletion before resolving records.');
 const id=crypto.randomUUID(),backup=await encryptBackup({settings:JSON.stringify({format:'zigoals-conflict-review',version:1,id,account,journal:original,local,cloud:remote.data})});fence();return {id,account,original,local,cloud:remote.data,domains,revision:remote.revision,...backup};
}
export async function confirmConflictReview(review:ConflictReview,choices:Choices,local:PrivateData,transport:CloudTransport,journal:SyncJournal,key:CryptoKey,manifest:VaultManifest,apply:(data:PrivateData)=>Promise<void>,fence:()=>void){
 if(journal.accountId!==review.account||!same(local,review.local)||!same(await journal.read(),review.original))throw Error('Account, local records or journal changed. Prepare a new review.');
 const selected=(data:PrivateData)=>Object.fromEntries(review.domains.filter(d=>data[d]!==undefined).map(d=>[d,data[d]]));
 const plan=resolveConflicts(selected(review.original.base),review.local,review.cloud,choices);if(plan.unresolved)throw Error('Choose a resolution for every conflicting field.');validateResolution({...review,original:{...review.original,base:selected(review.original.base)}},plan.data);
 const remote=await cloudSnapshot(transport,key,manifest,review.revision,review.domains,review.original.headRevision,review.original.headDigest);fence();if(remote.revision!==review.revision||!same(remote.data,review.cloud))throw Error('Cloud changed. Prepare a new review.');
 await apply(plan.data);fence();await journal.recover(review.id,review.original,{...review.original,epoch:manifest.epoch,base:{...review.original.base,...remote.data},revision:remote.revision,headRevision:remote.head?.revision??0,headDigest:remote.headDigest,domainGenerations:remote.domainGenerations,pending:null},fence);
}
