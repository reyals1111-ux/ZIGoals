import {sessionAllowed} from './sessions.mjs';
const reply=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
async function rows(store,prefix){const all=new Map();let cursor;for(;;){const page=await store.list({prefix,startAfter:cursor,limit:128});for(const [k,v]of page)all.set(k,v);if(page.size<128)break;cursor=[...page.keys()].at(-1);}return all;}
/** Staging lives beside the active generation; no manifest changes until one transaction publishes every row. */
export async function rotationRequest(request,state,readJSON,validManifest,validEnvelope){
 let input;if(request.method==='POST'){try{input=await readJSON(request);}catch{return reply({error:'INVALID_ROTATION'},400);}}
 const hash=request.headers.get('x-zigoals-token-hash');
 return state.storage.transaction(async store=>{
  if(await store.get('account-deleted'))return reply({error:'ACCOUNT_DELETED'},410);
  if(!await sessionAllowed(store,hash))return reply({error:'SESSION_REVOKED'},401);
  const current=await store.get('manifest'),revision=await store.get('revision')??0,rotation=await store.get('rotation');
  if(request.method==='GET')return reply({rotation:rotation??null});
  if(!input||typeof input.operation!=='string'||!/^[0-9a-f-]{36}$/i.test(input.operation))return reply({error:'INVALID_ROTATION'},400);
  const receipt=await store.get(`rotation-receipt:${input.operation}`);
  if(receipt)return input.action==='commit'?reply(receipt):reply({error:'ROTATION_FINISHED'},409);
  if(input.action==='begin'){
   if(Object.keys(input).sort().join(',')!=='action,base,manifest,operation'||!current||!validManifest(input.manifest)||input.manifest.vault!==current.vault||input.manifest.epoch!==current.epoch+1||input.base!==revision)return reply({error:'ROTATION_CONFLICT'},409);
   if(rotation)return same(rotation,{operation:input.operation,base:input.base,manifest:input.manifest})?reply({staged:true}):reply({error:'ROTATION_IN_PROGRESS'},409);
   await store.put('rotation',{operation:input.operation,base:input.base,manifest:input.manifest});return reply({staged:true});
  }
  if(!rotation||rotation.operation!==input.operation||rotation.base!==revision)return reply({error:'ROTATION_CONFLICT'},409);
  if(input.action==='staged'&&Object.keys(input).every(k=>['action','operation','cursor'].includes(k))){
   const cursor=input.cursor;if(cursor!==undefined&&cursor!==null&&(typeof cursor!=='string'||!/^rotation-row:[0-9a-f-]{36}$/i.test(cursor)))return reply({error:'INVALID_CURSOR'},400);
   const page=await store.list({prefix:'rotation-row:',startAfter:cursor||undefined,limit:3}),entries=[...page.entries()];return reply({rows:entries.slice(0,2).map(([,v])=>v),cursor:entries.length>2?entries[1][0]:null});
  }
  if(input.action==='abort'&&Object.keys(input).length===2){await store.delete([...(await rows(store,'rotation-row:')).keys(),'rotation']);return reply({aborted:true});}
  if(input.action==='stage'&&Object.keys(input).length===3&&Array.isArray(input.rows)&&input.rows.length>0&&input.rows.length<=100){
   const seen=new Set(),writes={};
   for(const row of input.rows){
    if(!row||Object.keys(row).sort().join(',')!=='deleted,domain,envelope,epoch,id,revision'||typeof row.id!=='string'||seen.has(row.id)||row.epoch!==rotation.manifest.epoch||!validEnvelope(row.envelope))return reply({error:'INVALID_ROTATION_RECORD'},400);
    seen.add(row.id);const prior=await store.get(`record:${row.id}`),staged=await store.get(`rotation-row:${row.id}`);
    if(!prior||prior.domain!==row.domain||prior.revision!==row.revision||prior.deleted!==row.deleted)return reply({error:'ROTATION_RECORD_CHANGED'},409);
    if(staged&&!same(staged,row))return reply({error:'ROTATION_REPLAY_CHANGED'},409);
    writes[`rotation-row:${row.id}`]=row;
   }
   await store.put(writes);return reply({staged:input.rows.length});
  }
  if(input.action==='commit'&&Object.keys(input).length===2){
   const active=await rows(store,'record:'),staged=await rows(store,'rotation-row:');
   if(active.size!==staged.size||[...active.keys()].some(k=>!staged.has(k.replace('record:','rotation-row:'))))return reply({error:'ROTATION_INCOMPLETE'},409);
   let bytes=0;for(const row of staged.values())bytes+=JSON.stringify(row).length;
   if(bytes>32_000_000)return reply({error:'VAULT_CAPACITY_EXPORT_REQUIRED'},507);
   for(const row of staged.values())await store.put(`record:${row.id}`,row);
   const result={revision:revision+1,epoch:rotation.manifest.epoch,rotated:true};
   await store.put({manifest:rotation.manifest,revision:revision+1,bytes,[`rotation-receipt:${input.operation}`]:result});
   await store.delete([...staged.keys(),'rotation']);return reply(result);
  }
  return reply({error:'INVALID_ROTATION'},400);
 });
}
