import 'server-only';
import {z} from 'zod';
import {readSessionCookie} from './session-cookie';
/**
 * `/api/push` (ADR-010): GET answers the VAPID public key or 503 while push is not configured; POST forwards one
 * action to the push Worker with the session bearer, after confirming with private sync that the session is still
 * registered. Nothing here is logged, and the route never sees a title, a count or any content: the actions carry
 * only an endpoint, two browser keys, times, a zone, weekdays and the quiet window.
 */
export type PushConfig={syncOrigin:string;pushOrigin:string;pushPublicKey:string};
const origin=(value:string)=>{try{return new URL(value).origin===value&&value.startsWith('https://');}catch{return false;}};
const configSchema=z.object({syncOrigin:z.string().regex(/^https:\/\/[a-z0-9.-]+\.workers\.dev$/),pushOrigin:z.string().max(253).refine(origin),pushPublicKey:z.string().regex(/^[A-Za-z0-9_-]{87}$/)}).strict();
const TIME=/^(?:[01]\d|2[0-3]):[0-5]\d$/,time=z.string().regex(TIME),zone=z.string().min(1).max(100).regex(/^[A-Za-z0-9_+\-/]+$/);
const quiet=z.object({from:time,to:time}).strict(),schedules=z.array(z.object({time,zone,weekdays:z.number().int().min(1).max(127)}).strict()).max(80);
const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('subscribe'),endpoint:z.string().min(1).max(2048),p256dh:z.string().min(1).max(200),auth:z.string().min(1).max(64),zone,quiet,schedules}).strict(),
 z.object({action:z.literal('schedule'),subscriptionId:z.uuid(),zone,quiet,schedules}).strict(),
 z.object({action:z.literal('unsubscribe'),subscriptionId:z.uuid()}).strict(),
 z.object({action:z.literal('delete-all')}).strict(),
]);
export type PushAction=z.infer<typeof actionSchema>;
export const PUSH_UNAVAILABLE={error:'PUSH_UNAVAILABLE',message:'Reminders while ZIGoals is closed are not available in this build.'};
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function readBounded(response:Request|Response,max:number){
 const reader=response.body?.getReader();if(!reader)throw Error('Missing body');const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>max)throw Error('Too large');chunks.push(part.value);}}catch(e){await reader.cancel().catch(()=>{});throw e;}
 const all=new Uint8Array(total);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(all));
}
export async function pushRequest(request:Request,config:PushConfig|null,fetcher:typeof fetch=fetch):Promise<Response>{
 const self=new URL(request.url).origin;
 if(request.method!=='GET'&&(request.method!=='POST'||request.headers.get('origin')!==self))return reply({error:'ORIGIN_DENIED'},403);
 const parsed=configSchema.safeParse(config);
 if(!parsed.success)return reply(PUSH_UNAVAILABLE,503);
 const cfg=parsed.data;
 if(request.method==='GET')return reply({publicKey:cfg.pushPublicKey});
 if(request.headers.get('content-type')?.split(';')[0]?.trim()!=='application/json')return reply({error:'JSON_REQUIRED'},415);
 let action:PushAction;try{action=actionSchema.parse(await readBounded(request,8192));}catch{return reply({error:'INVALID_PUSH_REQUEST'},400);}
 const cookie=readSessionCookie(request);
 if(cookie.duplicate)return reply({error:'DUPLICATE_SESSION_COOKIE',message:'Sign in again.'},400);
 if(!cookie.token)return reply({error:'SIGN_IN_REQUIRED'},401);
 const account=z.uuid().safeParse(request.headers.get('x-zigoals-account'));if(!account.success)return reply({error:'ACCOUNT_REQUIRED'},400);
 const fence=account.data.toLowerCase(),upstream=(url:string,init:RequestInit)=>fetcher(url,{...init,redirect:'manual',signal:AbortSignal.timeout(10000),cache:'no-store'});
 try{
  // Revocation and sign-out live in private sync's session registry: a session it no longer lists gets nothing here.
  const allowed=await upstream(`${cfg.syncOrigin}/v1/sessions`,{headers:{origin:self,authorization:`Bearer ${cookie.token}`,'x-zigoals-account':fence}});await allowed.body?.cancel().catch(()=>{});
  if(!allowed.ok)return allowed.status===409?reply({error:'ACCOUNT_CHANGED'},409):allowed.status===401||allowed.status===403||allowed.status===410?reply({error:'SIGN_IN_REQUIRED'},401):reply({error:'ACCOUNT_STATUS_UNAVAILABLE'},503);
  const remote=await upstream(`${cfg.pushOrigin}/v1/push`,{method:'POST',headers:{origin:self,authorization:`Bearer ${cookie.token}`,'x-zigoals-account':fence,'content-type':'application/json'},body:JSON.stringify(action)});
  return reply(await readBounded(remote,32768),remote.status);
 }catch{return reply({error:'PUSH_SERVICE_UNAVAILABLE',message:'Reminders while ZIGoals is closed could not be set up right now. Try again later.'},503);}
}
