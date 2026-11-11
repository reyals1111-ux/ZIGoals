/** Revocation authority for verified bearer tokens. Never stores token bytes. */
/** @param {unknown} body @param {number} [status] */
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const HASH=/^[a-f0-9]{64}$/;
/** Session U Part 5 (FIX_PLAN C7 for sessions, FINDINGS Q-PRIV-03): how long a revoked session's record is kept. */
export const REVOKED_RETENTION_MS=90*86400000;
/** @param {RecordTransaction} store @param {string|null|undefined} hash */
export async function sessionAllowed(store,hash){if(!HASH.test(hash??''))return false;return (await store.get(`session:${hash}`))?.active===true;}
/**
 * Session U Part 5: 90 days after a revocation, the revoked session's record (its label, token hash and dates) is deleted
 * and its family keeps only a dateless {active:false} tombstone, so that family can never be registered or refreshed
 * again; the tombstones stay bounded by the lifetime registration cap (`session-count`, never decremented).
 * `revoked-sweep-at` holds the earliest moment a revoked record becomes due: before then nothing is listed.
 * @param {RecordTransaction} store @param {number} now
 */
export async function sweepRevokedSessions(store,now){
 const due=await store.get('revoked-sweep-at');if(typeof due!=='number'||due>now)return;
 let next=Infinity;
 for(const prefix of ['session:','family:']){
  /** @type {string|undefined} */let cursor;
  for(;;){
   const page=await store.list({prefix,startAfter:cursor,limit:256});if(!page.size)break;cursor=[...page.keys()].at(-1);
   for(const [key,row]of page){
    if(row?.active!==false||typeof row.revokedAt!=='string')continue;
    const at=Date.parse(row.revokedAt)+REVOKED_RETENTION_MS;if(!Number.isFinite(at))continue;
    if(at>now){next=Math.min(next,at);continue;}
    if(prefix==='session:')await store.delete(key);else await store.put(key,{active:false});
   }
  }
 }
 if(next===Infinity)await store.delete('revoked-sweep-at');else await store.put('revoked-sweep-at',next);
}
/**
 * The vault's one alarm when no domain deletion is pending: the next revoked-session sweep, or none. A pending domain
 * deletion keeps its own 60-second retries and calls this when it ends.
 * @param {RecordTransaction} store @param {(due:number)=>number} [alarmAt]
 */
export async function armSweep(store,alarmAt=due=>due){const due=await store.get('revoked-sweep-at');if(typeof due==='number')await store.setAlarm(alarmAt(due));else await store.deleteAlarm();}
/**
 * @param {Request} request @param {RecordState} state @param {(request:Request,limit:number)=>Promise<any>} boundedJSON
 * @param {()=>number} [now] @param {(due:number)=>number} [alarmAt]
 */
export async function sessionsRequest(request,state,boundedJSON,now=Date.now,alarmAt=due=>due){
 const hash=request.headers.get('x-zigoals-token-hash');if(!HASH.test(hash??''))return reply({error:'SIGN_IN_REQUIRED'},401);
 /** @type {any} */
 let action;if(request.method==='POST'){try{action=await boundedJSON(request,8192);}catch{return reply({error:'INVALID_SESSION_REQUEST'},400);}}
 return state.storage.transaction(async store=>{
  if(await store.get('account-deleted'))return reply({error:'ACCOUNT_DELETED'},410);
  await sweepRevokedSessions(store,now());
  const current=await store.get(`session:${hash}`),family=request.headers.get('x-zigoals-session-family');
  if(!/^[0-9a-f-]{36}$/i.test(family??''))return reply({error:'VERIFIED_SESSION_REQUIRED'},401);
  const lineage=await store.get(`family:${family}`);if(lineage&&!lineage.active)return reply({error:'SESSION_REVOKED'},401);
  if(action?.action==='refresh'){
   if(Object.keys(action).sort().join(',')!=='action,previous'||!/^[-A-Za-z0-9._]{1,4096}$/.test(action.previous??''))return reply({error:'INVALID_SESSION_REQUEST'},400);
   const previous=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('Bearer '+action.previous)))].map(v=>v.toString(16).padStart(2,'0')).join(''),prior=await store.get(`session:${previous}`);
   if(lineage?.active&&lineage.currentHash===hash&&lineage.previousHash===previous&&current?.active)return reply({registered:true,id:current.id});
   if(!prior?.active||prior.family!==family||current&&!current.active||previous===hash)return reply({error:'SESSION_REVOKED'},401);
   if(current)return reply({error:'SESSION_CONFLICT'},409);
   await store.put({[`session:${hash}`]:{...prior,active:true},[`family:${family}`]:{active:true,currentHash:hash,previousHash:previous}});await store.delete(`session:${previous}`);return reply({registered:true,id:prior.id});
  }
  if(action?.action==='register'){
   if(Object.keys(action).some(k=>!['action','label'].includes(k))||typeof action.label!=='string'||!action.label.trim()||action.label.length>80)return reply({error:'INVALID_SESSION_REQUEST'},400);
   if(current)return current.active?reply({registered:true,id:current.id}):reply({error:'SESSION_REVOKED'},401);
   if(lineage)return reply({error:'SESSION_REFRESH_REQUIRED'},401);
   const count=await store.get('session-count')??0;if(count>=5000)return reply({error:'SESSION_CAPACITY'},507);
   const record={id:crypto.randomUUID(),family,label:action.label.trim(),createdAt:new Date(now()).toISOString(),active:true};await store.put({[`session:${hash}`]:record,[`family:${family}`]:{active:true,currentHash:hash},'session-count':count+1});return reply({registered:true,id:record.id});
  }
  if(!current?.active)return reply({error:'SESSION_REVOKED'},401);
  const records=await store.list({prefix:'session:',limit:5001});if(records.size>5000)return reply({error:'SESSION_CAPACITY'},507);
  if(request.method==='GET')return reply({sessions:[...records.values()].filter(r=>r.active).map(r=>({id:r.id,label:r.label,createdAt:r.createdAt,current:r.id===current.id}))});
  if(!action||!['revoke','revoke-others','signout'].includes(action.action)||Object.keys(action).some(k=>!['action','id'].includes(k))||action.action==='revoke'&&typeof action.id!=='string')return reply({error:'INVALID_SESSION_REQUEST'},400);
  const selected=[...records].filter(([,r])=>r.active&&(action.action==='signout'?r.id===current.id:action.action==='revoke-others'?r.id!==current.id:r.id===action.id));
  if(action.action==='revoke'&&!selected.length)return reply({error:'SESSION_NOT_FOUND'},404);
  const revokedAt=new Date(now()).toISOString();
  for(const [key,record]of selected){await store.put({[key]:{...record,active:false,revokedAt},[`family:${record.family}`]:{active:false,revokedAt}});}
  if(selected.length){
   const due=Date.parse(revokedAt)+REVOKED_RETENTION_MS,prior=await store.get('revoked-sweep-at');
   if(typeof prior!=='number'||due<prior)await store.put('revoked-sweep-at',due);
   if(!await store.get('domain-delete-intent'))await armSweep(store,alarmAt);
  }
  return reply({revoked:selected.length,currentRevoked:selected.some(([,r])=>r.id===current.id)});
 });
}
