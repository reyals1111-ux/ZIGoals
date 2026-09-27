import {WorkerEntrypoint} from 'cloudflare:workers';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lifecycleWorker={fetch(){return reply({error:'NOT_FOUND'},404);}};
export default lifecycleWorker;
/** Only the private-sync service binding can reach this interface. No public authority endpoint. */
export class LifecycleService extends WorkerEntrypoint{
 async fetch(request){
  if(new URL(request.url).pathname.startsWith('/admin'))return reply({error:'NOT_FOUND'},404);
  const account=request.headers.get('x-verified-account');if(!UUID.test(account??''))return reply({error:'IDENTITY_REQUIRED'},403);
  if(this.env.RECOVERY_MODE!=='serve')return reply({error:'LIFECYCLE_RECONCILIATION_REQUIRED'},503);
  return this.env.LIFECYCLES.get(this.env.LIFECYCLES.idFromName(account)).fetch(request);
 }
}
export class LifecycleAuthority{
 constructor(state,env){this.state=state;this.env=env;}
 async attemptProviderDeletion(){
  const current=await this.state.storage.get('lifecycle');if(!current?.deleted||current.provider!=='pending')return;
  // Durable intent and alarm precede the irreversible upstream request.
  await this.state.storage.setAlarm(Date.now()+60000);
  if(this.env.RECOVERY_MODE!=='serve'||!this.env.AUTH_ADMIN_KEY||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(this.env.AUTH_ORIGIN??''))return;
  try{
   const response=await fetch(`${this.env.AUTH_ORIGIN}/auth/v1/admin/users/${current.account}`,{method:'DELETE',headers:{authorization:'Bearer '+this.env.AUTH_ADMIN_KEY,apikey:this.env.AUTH_ADMIN_KEY},redirect:'manual',signal:AbortSignal.timeout(8000)});
   const deleted=response.ok||response.status===404;await response.body?.cancel();if(!deleted)return;
   await this.state.storage.transaction(async store=>{const latest=await store.get('lifecycle');if(latest?.generation===current.generation&&latest.provider==='pending')await store.put('lifecycle',{...latest,provider:'deleted'});});await this.state.storage.deleteAlarm();
  }catch{/* Alarm retries without needing credentials for the deleted identity. */}
 }
 async alarm(){await this.attemptProviderDeletion();}
 async fetch(request){
  if(new URL(request.url).pathname.startsWith('/admin'))return recoveryRequest(this.state.storage,this.env,request);
  if(this.env.RECOVERY_MODE!=='serve')return reply({error:'LIFECYCLE_RECONCILIATION_REQUIRED'},503);
  let body;if(request.method==='POST'){try{const text=await request.text();if(text.length>2048)throw Error();body=JSON.parse(text);}catch{return reply({error:'INVALID_LIFECYCLE'},400);}}
  const result=await this.state.storage.transaction(async store=>{
   const current=await store.get('lifecycle')??{generation:1,deleted:false,provider:'retained'};
   if(request.method==='GET')return reply(current);
   if(body?.action==='delete'&&body.confirm==='DELETE CLOUD DATA'&&Number.isSafeInteger(body.generation)&&UUID.test(body.family??'')){
    if(current.deleted)return reply(current);
    if(body.generation!==current.generation)return reply({error:'LIFECYCLE_CHANGED'},409);
    const next={generation:current.generation+1,deleted:true,provider:'retained',authorizedFamily:body.family,account:request.headers.get('x-verified-account'),deletedAt:new Date().toISOString()};await store.put('lifecycle',next);return reply(next);
   }
   if(body?.action==='delete-domain'&&!current.deleted&&['finance','habits','health','settings'].includes(body.domain)&&UUID.test(body.operation??'')){
    const receipt=await store.get('domain-operation:'+body.operation);if(receipt)return receipt.domain===body.domain?reply(current):reply({error:'OPERATION_REUSED'},409);
    const count=await store.get('domain-operations')??0;if(count>=50000)return reply({error:'LIFECYCLE_CAPACITY'},507);
    if(body.generation!==(current.domainGenerations?.[body.domain]??0))return reply({error:'DOMAIN_GENERATION_CHANGED'},409);
    const generation=body.generation+1,next={...current,domainGenerations:{...current.domainGenerations,[body.domain]:generation},domainDecisions:{...current.domainDecisions,[body.domain]:{generation,operation:body.operation,at:new Date().toISOString()}}};
    await store.put({'lifecycle':next,['domain-operation:'+body.operation]:{domain:body.domain,generation},'domain-operations':count+1});return reply(next);
   }
   if(body?.action==='request-provider-delete'&&current.deleted){
    if(body.family!==current.authorizedFamily)return reply({error:'SESSION_REVOKED'},401);
    const next={...current,provider:current.provider==='deleted'?'deleted':'pending'};await store.put('lifecycle',next);if(next.provider==='pending')await store.setAlarm(Date.now()+60000);return reply(next);
   }
   if(body?.action==='resume-provider'&&current.deleted&&current.provider==='pending')return reply(current);
   return reply({error:'INVALID_LIFECYCLE'},400);
  });
  if(result.ok&&['request-provider-delete','resume-provider'].includes(body?.action)){await this.attemptProviderDeletion();return reply(await this.state.storage.get('lifecycle'));}
  return result;
 }
}

/** Bind only to separately authorized administration, never a public/app route.
 * An external checkpoint anchor is required; restored storage cannot attest that
 * its own deletion history is current. No production binding enables this here. */
export class LifecycleRecoveryAdmin extends WorkerEntrypoint{
 async fetch(request){
  const account=request.headers.get('x-verified-account'),url=new URL(request.url);
  if(!UUID.test(account??''))return reply({error:'IDENTITY_REQUIRED'},403);
  if(url.search||!['/admin/export','/admin/reconcile','/admin/dry-run'].includes(url.pathname))return reply({error:'NOT_FOUND'},404);
  if(!['serve','reconcile'].includes(this.env.RECOVERY_MODE))return reply({error:'RECOVERY_DISABLED'},503);
  const headers=new Headers(request.headers);headers.set('x-lifecycle-recovery-admin','1');
  return this.env.LIFECYCLES.get(this.env.LIFECYCLES.idFromName(account)).fetch(new Request(request,{headers}));
 }
}
const domains=['finance','habits','health','settings'];
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>keys.includes(key));
const integer=value=>Number.isSafeInteger(value)&&value>=0&&value<=50000;
const iso=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)&&Number.isFinite(Date.parse(value));
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item);
async function digest(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(value))))].map(value=>value.toString(16).padStart(2,'0')).join('');}
function validateCheckpoint(raw,account){
 if(!exact(raw,['version','account','lifecycle','receipts'])||raw.version!==1||raw.account!==account||!Array.isArray(raw.receipts)||raw.receipts.length>50000)throw Error('INVALID_CHECKPOINT');
 const s=raw.lifecycle;
 if(!exact(s,['generation','deleted','provider','account','authorizedFamily','deletedAt','domainGenerations','domainDecisions'])||typeof s.deleted!=='boolean'||s.generation!==(s.deleted?2:1)||!['retained','pending','deleted'].includes(s.provider))throw Error('INVALID_CHECKPOINT');
 if(s.deleted?(!UUID.test(s.authorizedFamily??'')||s.account!==account||!iso(s.deletedAt)):(s.provider!=='retained'||s.account!==undefined||s.authorizedFamily!==undefined||s.deletedAt!==undefined))throw Error('INVALID_CHECKPOINT');
 if(s.domainGenerations!==undefined&&!exact(s.domainGenerations,domains)||s.domainDecisions!==undefined&&!exact(s.domainDecisions,domains))throw Error('INVALID_CHECKPOINT');
 const receipts=[],ids=new Set(),generations=new Set(),max={};
 for(const row of raw.receipts){
  if(!exact(row,['operation','domain','generation'])||!UUID.test(row.operation??'')||!domains.includes(row.domain)||!integer(row.generation)||!row.generation||ids.has(row.operation)||generations.has(row.domain+':'+row.generation))throw Error('INVALID_CHECKPOINT');
  ids.add(row.operation);generations.add(row.domain+':'+row.generation);max[row.domain]=Math.max(max[row.domain]??0,row.generation);receipts.push(row);
 }
 const domainGenerations={};
 for(const domain of domains){
  const declared=s.domainGenerations?.[domain]??0,count=max[domain]??0;if(!integer(declared)||declared>count||(!s.deleted&&declared!==count))throw Error('INCOMPLETE_CHECKPOINT');
  for(let generation=1;generation<=count;generation++)if(!generations.has(domain+':'+generation))throw Error('INCOMPLETE_CHECKPOINT');
  if(count)domainGenerations[domain]=count;
  const decision=s.domainDecisions?.[domain];
  if(decision&&(!exact(decision,['generation','operation','at'])||decision.generation!==count||!iso(decision.at)||!receipts.some(row=>row.domain===domain&&row.generation===count&&row.operation===decision.operation)))throw Error('INVALID_CHECKPOINT');
  if(count&&!s.deleted&&!decision)throw Error('INCOMPLETE_CHECKPOINT');
 }
 return {version:1,account,lifecycle:{...s,...(Object.keys(domainGenerations).length?{domainGenerations}:{})},receipts:receipts.sort((a,b)=>a.operation.localeCompare(b.operation))};
}
async function allReceipts(store){
 const result=[];let cursor;
 for(;;){const rows=await store.list({prefix:'domain-operation:',limit:1000,...(cursor?{startAfter:cursor}:{})});for(const [key,value] of rows){result.push({operation:key.slice('domain-operation:'.length),...value});cursor=key;}if(result.length>50000)throw Error('RECOVERY_CAPACITY');if(rows.size<1000)return result;}
}
async function checkpointFromStore(store,account){
 const lifecycle=await store.get('lifecycle')??{generation:1,deleted:false,provider:'retained'},receipts=await allReceipts(store);
 if((await store.get('domain-operations')??0)!==receipts.length)throw Error('INCOMPLETE_CHECKPOINT');
 return validateCheckpoint({version:1,account,lifecycle,receipts},account);
}
function mergeCheckpoints(current,incoming){
 const a=current.lifecycle,b=incoming.lifecycle,byId=new Map(current.receipts.map(row=>[row.operation,row])),byGeneration=new Map(current.receipts.map(row=>[row.domain+':'+row.generation,row.operation]));
 for(const row of incoming.receipts){const old=byId.get(row.operation),at=byGeneration.get(row.domain+':'+row.generation);if(old&&canonical(old)!==canonical(row)||at&&at!==row.operation)throw Error('CHECKPOINT_CONFLICT');byId.set(row.operation,row);byGeneration.set(row.domain+':'+row.generation,row.operation);}
 if(a.deleted&&b.deleted&&a.authorizedFamily!==b.authorizedFamily)throw Error('CHECKPOINT_CONFLICT');
 const lifecycle={...(b.deleted&&!a.deleted?b:a)},domainGenerations={},domainDecisions={};
 for(const domain of domains){const left=a.domainGenerations?.[domain]??0,right=b.domainGenerations?.[domain]??0,generation=Math.max(left,right);if(generation)domainGenerations[domain]=generation;const decision=(right>left?b:a).domainDecisions?.[domain];if(decision)domainDecisions[domain]=decision;}
 lifecycle.generation=Math.max(a.generation,b.generation);lifecycle.deleted=a.deleted||b.deleted;lifecycle.provider=['retained','pending','deleted'][Math.max(['retained','pending','deleted'].indexOf(a.provider),['retained','pending','deleted'].indexOf(b.provider))];
 delete lifecycle.domainGenerations;delete lifecycle.domainDecisions;
 if(Object.keys(domainGenerations).length)lifecycle.domainGenerations=domainGenerations;if(Object.keys(domainDecisions).length)lifecycle.domainDecisions=domainDecisions;
 return validateCheckpoint({version:1,account:current.account,lifecycle,receipts:[...byId.values()]},current.account);
}
async function boundedCheckpoint(request){
 const reader=request.body?.getReader();if(!reader)throw Error('INVALID_CHECKPOINT');const chunks=[];let length=0;
 for(;;){const row=await reader.read();if(row.done)break;length+=row.value.byteLength;if(length>16*1024*1024){await reader.cancel();throw Error('RECOVERY_CAPACITY');}chunks.push(row.value);}
 const bytes=new Uint8Array(length);let offset=0;for(const row of chunks){bytes.set(row,offset);offset+=row.byteLength;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
async function recoveryRequest(storage,env,request){
 const account=request.headers.get('x-verified-account'),path=new URL(request.url).pathname;
 if(request.headers.get('x-lifecycle-recovery-admin')!=='1'||!UUID.test(account??''))return reply({error:'RECOVERY_ADMIN_REQUIRED'},403);
 if(!['serve','reconcile'].includes(env.RECOVERY_MODE))return reply({error:'RECOVERY_DISABLED'},503);
 if(path==='/admin/export'&&request.method==='GET'){
  try{return await storage.transaction(async store=>{const checkpoint=await checkpointFromStore(store,account);return reply({checkpoint,digest:await digest(checkpoint)});});}catch{return reply({error:'INCOMPLETE_CHECKPOINT'},409);}
 }
 if(!['/admin/reconcile','/admin/dry-run'].includes(path)||request.method!=='POST')return reply({error:'NOT_FOUND'},404);
 if(env.RECOVERY_MODE!=='reconcile'||env.RECOVERY_ACCOUNT_ID!==account||! /^[0-9a-f]{64}$/.test(env.RECOVERY_CHECKPOINT_SHA256??''))return reply({error:'EXTERNAL_CHECKPOINT_REQUIRED'},503);
 let incoming,hash;try{incoming=validateCheckpoint(await boundedCheckpoint(request),account);hash=await digest(incoming);}catch{return reply({error:'INVALID_CHECKPOINT'},409);}
 if(hash!==env.RECOVERY_CHECKPOINT_SHA256)return reply({error:'CHECKPOINT_ANCHOR_MISMATCH'},409);
 try{return await storage.transaction(async store=>{
  const current=await checkpointFromStore(store,account),merged=mergeCheckpoints(current,incoming),receiptKey='recovery-receipt:'+hash,prior=await store.get(receiptKey);
  if(prior)return reply({...prior,replay:true});
  const count=await store.get('recovery-receipt-count')??0;if(count>=128)throw Error('RECOVERY_CAPACITY');
  const receipt={applied:true,replay:false,checkpointDigest:hash,resultDigest:await digest(merged),generation:merged.lifecycle.generation,deleted:merged.lifecycle.deleted};
  if(path==='/admin/dry-run')return reply({...receipt,applied:false,dryRun:true});
  for(let offset=0;offset<merged.receipts.length;offset+=128){await store.put(Object.fromEntries(merged.receipts.slice(offset,offset+128).map(({operation,...row})=>['domain-operation:'+operation,row])));}
  await store.put({'lifecycle':merged.lifecycle,'domain-operations':merged.receipts.length,[receiptKey]:receipt,'recovery-receipt-count':count+1});
  if(merged.lifecycle.provider==='pending')await store.setAlarm(Date.now()+60000);
  return reply(receipt);
 });}catch(error){return reply({error:['CHECKPOINT_CONFLICT','RECOVERY_CAPACITY','INCOMPLETE_CHECKPOINT'].includes(error.message)?error.message:'INVALID_CHECKPOINT'},409);}
}
