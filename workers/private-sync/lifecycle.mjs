import {WorkerEntrypoint} from 'cloudflare:workers';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lifecycleWorker={fetch(){return reply({error:'NOT_FOUND'},404);}};
export default lifecycleWorker;
/** Only the private-sync service binding can reach this interface. No public authority endpoint. */
export class LifecycleService extends WorkerEntrypoint{
 async fetch(request){
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
