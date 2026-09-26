import {lockAccount} from '../account-session';
import {RevisionConflict,type CloudTransport,type CloudOperation,type CloudCompaction} from './cloud-sync';
export function accountTransport(account:string,fence:()=>void):CloudTransport{
 async function request(cursor:string|null,operation?:CloudOperation|CloudCompaction,ids?:string[]){
  fence();const response=await fetch('/api/private-account'+(operation?'':ids?'?ids='+encodeURIComponent(ids.join(',')):cursor?'?cursor='+encodeURIComponent(cursor):''),{method:operation?'POST':'GET',headers:{'X-Zigoals-Account':account,...(operation?{'Content-Type':'application/json'}:{})},...(operation?{body:JSON.stringify({action:'sync',operation})}:{}),cache:'no-store',signal:AbortSignal.timeout(20000)});
  const reader=response.body?.getReader();if(!reader)throw Error('Sync response unavailable.');const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>(operation?32768:36_000_000))throw Error('Sync response exceeds capacity.');chunks.push(value);}}catch(error){await reader.cancel().catch(()=>{});throw error;}
  fence();const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
  if(!response.ok){if(response.status===409&&data.error==='REVISION_CONFLICT')throw new RevisionConflict();if(data.error==='REPLAY_HORIZON_REQUIRES_RECOVERY')throw Error('Queued work is outside the retained replay horizon. Prepare forward recovery; the original queue was preserved.');if(response.status===401||data.error==='ACCOUNT_CHANGED'){lockAccount();throw Error('Account access changed. Sign in and unlock again.');}throw Error(response.status===503?'Hosted encrypted sync is not configured.':response.status===507?'Cloud capacity reached. Export your records before continuing.':'Sync was not confirmed. Local records were preserved.');}return data;
 }
 return {read:cursor=>request(cursor),readRows:ids=>request(null,undefined,ids),write:operation=>request(null,operation),compact:operation=>request(null,operation)};
}
