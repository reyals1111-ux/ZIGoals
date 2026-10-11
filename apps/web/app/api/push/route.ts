import {pushRequest} from '../../../lib/server/push-route';
import {loadRuntimeBindings} from '../../../lib/server/runtime-bindings';
export const dynamic='force-dynamic';
type Fetcher={fetch:(request:Request)=>Promise<Response>};
type Bindings={ZIGOALS_SYNC_ORIGIN?:string;ZIGOALS_PUSH_ORIGIN?:string;ZIGOALS_PUSH_PUBLIC_KEY?:string;PRIVATE_SYNC?:Fetcher;PUSH_REMINDERS?:Fetcher};
/**
 * Push reminders (ADR-010). The flag is the pair ZIGOALS_PUSH_ORIGIN and ZIGOALS_PUSH_PUBLIC_KEY, set with
 * `wrangler secret put` on the app Worker: without them every build answers 503 and the app shows only "Not available
 * in this build". The session check goes through the PRIVATE_SYNC binding like the account route; the push Worker is
 * reached through its origin, or through a PUSH_REMINDERS service binding when the owner adds one.
 */
async function handle(request:Request){
 const bindings=await loadRuntimeBindings<Bindings>();
 const values=Object.keys(bindings).length?bindings:process.env.NODE_ENV==='development'&&process.env.ZIGOALS_ACCOUNT_LOCAL_MODE==='direct'?process.env:{};
 const {ZIGOALS_SYNC_ORIGIN,ZIGOALS_PUSH_ORIGIN,ZIGOALS_PUSH_PUBLIC_KEY}=values;
 const config=ZIGOALS_SYNC_ORIGIN&&ZIGOALS_PUSH_ORIGIN&&ZIGOALS_PUSH_PUBLIC_KEY?{syncOrigin:ZIGOALS_SYNC_ORIGIN,pushOrigin:ZIGOALS_PUSH_ORIGIN,pushPublicKey:ZIGOALS_PUSH_PUBLIC_KEY}:null;
 // As in the account route: the middleware's inbound origin is the only same-origin authority.
 const inbound=request.headers.get('x-zigoals-origin');if(inbound){const url=new URL(request.url),trusted=new URL(inbound);if(trusted.origin!==inbound||!['https:','http:'].includes(trusted.protocol))return Response.json({error:'ORIGIN_DENIED'},{status:403});request=new Request(new URL(url.pathname+url.search,inbound),request);}
 const fetcher:typeof fetch=async(input,init)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url,origin=new URL(url).origin;
  if(origin===config?.syncOrigin){if(bindings.PRIVATE_SYNC)return bindings.PRIVATE_SYNC.fetch(new Request(input,init));if(values!==process.env)return Response.json({error:'SYNC_BINDING_REQUIRED'},{status:503});}
  if(origin===config?.pushOrigin&&bindings.PUSH_REMINDERS)return bindings.PUSH_REMINDERS.fetch(new Request(input,init));
  return fetch(input,init);
 };
 return pushRequest(request,config,fetcher);
}
export const GET=handle;
export const POST=handle;
