import {WorkerEntrypoint} from 'cloudflare:workers';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(status===429?{'Retry-After':'60'}:{})}});
const admissionWorker={fetch(){return reply({error:'NOT_FOUND'},404);}};
export default admissionWorker;
/** Named service only. Raw addresses never enter durable storage or logs. */
export class AdmissionService extends WorkerEntrypoint{
 async fetch(request){
  if(request.method!=='POST')return reply({error:'INVALID_ADMISSION'},400);
  let input;try{const reader=request.body?.getReader();if(!reader)throw Error();let raw='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});for(;;){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1024){await reader.cancel();throw Error();}raw+=decoder.decode(part.value,{stream:true});}input=JSON.parse(raw+decoder.decode());}catch{return reply({error:'INVALID_ADMISSION'},400);}
  if(!['send','verify'].includes(input?.action)||typeof input.email!=='string'||input.email.length>254||!/^\S+@\S+\.\S+$/.test(input.email)||typeof input.ip!=='string'||input.ip.length>64||!/^[:.0-9a-f]+$/i.test(input.ip))return reply({error:'INVALID_ADMISSION'},400);
  if(typeof this.env.AUTH_ADMISSION_KEY!=='string'||this.env.AUTH_ADMISSION_KEY.length<32)return reply({error:'ADMISSION_SETUP_REQUIRED'},503);
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(this.env.AUTH_ADMISSION_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=async value=>[...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
  const email=await hash('email:'+input.email.trim().toLowerCase()),ip=await hash('ip:'+input.ip.toLowerCase());
  return this.env.ADMISSION.get(this.env.ADMISSION.idFromName('auth-admission-v1')).fetch(new Request('https://internal/admit',{method:'POST',body:JSON.stringify({action:input.action,email,ip})}));
 }
}
export class AdmissionAuthority{
 constructor(state,env){this.state=state;this.env=env;}
 async fetch(request){
  const body=await request.json();if(!['send','verify'].includes(body.action)||![body.email,body.ip].every(v=>/^[a-f0-9]{64}$/.test(v??'')))return reply({error:'INVALID_ADMISSION'},400);
  const observed=this.env.ISOLATED_FIXTURE==='true'?Number(this.env.LOCAL_TEST_NOW):Date.now();
  return this.state.storage.transaction(async store=>{
   const last=await store.get('clock')??0;if(!Number.isSafeInteger(observed)||observed<last)return reply({error:'ADMISSION_CLOCK_UNAVAILABLE'},503);await store.put('clock',observed);
   const rules=body.action==='send'?[['email',86400000,6,60000],['ip',3600000,30,0]]:[['email',600000,10,0],['ip',600000,100,0]];
   const all=await store.list({prefix:'rate:'});for(const [key,value]of all)if(value.until<=observed){await store.delete(key);all.delete(key);}
   const writes={};for(const [kind,window,limit,cooldown]of rules){const key='rate:'+body.action+':'+kind+':'+body[kind],old=all.get(key);if(old&&(old.count>=limit||old.next>observed))return reply({error:'TRY_LATER'},429);writes[key]={until:old?.until??observed+window,count:(old?.count??0)+1,next:observed+cooldown};}
   if(all.size+Object.keys(writes).filter(k=>!all.has(k)).length>10000)return reply({error:'ADMISSION_CAPACITY'},503);
   // Both dimensions reserve before provider I/O, including failed attempts.
   await store.put(writes);return reply({allowed:true});
  });
 }
}
