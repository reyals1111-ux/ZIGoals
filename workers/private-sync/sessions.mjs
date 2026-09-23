/** Revocation authority for verified bearer tokens. Never stores token bytes. */
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const HASH=/^[a-f0-9]{64}$/;
export async function sessionAllowed(store,hash){if(!HASH.test(hash??''))return false;return (await store.get(`session:${hash}`))?.active===true;}
export async function sessionsRequest(request,state,boundedJSON){
 const hash=request.headers.get('x-zigoals-token-hash');if(!HASH.test(hash??''))return reply({error:'SIGN_IN_REQUIRED'},401);
 let action;if(request.method==='POST'){try{action=await boundedJSON(request,2048);}catch{return reply({error:'INVALID_SESSION_REQUEST'},400);}}
 return state.storage.transaction(async store=>{
  const current=await store.get(`session:${hash}`);
  if(action?.action==='register'){
   if(Object.keys(action).some(k=>!['action','label'].includes(k))||typeof action.label!=='string'||!action.label.trim()||action.label.length>80)return reply({error:'INVALID_SESSION_REQUEST'},400);
   if(current)return current.active?reply({registered:true,id:current.id}):reply({error:'SESSION_REVOKED'},401);
   const count=await store.get('session-count')??0;if(count>=5000)return reply({error:'SESSION_CAPACITY'},507);
   const record={id:crypto.randomUUID(),label:action.label.trim(),createdAt:new Date().toISOString(),active:true};await store.put({[`session:${hash}`]:record,'session-count':count+1});return reply({registered:true,id:record.id});
  }
  if(!current?.active)return reply({error:'SESSION_REVOKED'},401);
  const records=await store.list({prefix:'session:',limit:5001});if(records.size>5000)return reply({error:'SESSION_CAPACITY'},507);
  if(request.method==='GET')return reply({sessions:[...records.values()].filter(r=>r.active).map(r=>({id:r.id,label:r.label,createdAt:r.createdAt,current:r.id===current.id}))});
  if(!action||!['revoke','revoke-others','signout'].includes(action.action)||Object.keys(action).some(k=>!['action','id'].includes(k))||action.action==='revoke'&&typeof action.id!=='string')return reply({error:'INVALID_SESSION_REQUEST'},400);
  const selected=[...records].filter(([,r])=>r.active&&(action.action==='signout'?r.id===current.id:action.action==='revoke-others'?r.id!==current.id:r.id===action.id));
  if(action.action==='revoke'&&!selected.length)return reply({error:'SESSION_NOT_FOUND'},404);
  for(const [key,record]of selected)await store.put(key,{...record,active:false,revokedAt:new Date().toISOString()});
  return reply({revoked:selected.length,currentRevoked:selected.some(([,r])=>r.id===current.id)});
 });
}
