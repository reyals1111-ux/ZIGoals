import {zigiRequest} from '../../../lib/server/zigi-route';
import {loadRuntimeBindings} from '../../../lib/server/runtime-bindings';
export const dynamic='force-dynamic';
type Fetcher={fetch:(request:Request)=>Promise<Response>};
type Bindings={ZIGOALS_SYNC_ORIGIN?:string;ZIGOALS_ZIGI_RELAY_ORIGIN?:string;PRIVATE_SYNC?:Fetcher;ZIGI_RELAY?:Fetcher};
/**
 * ZIGoals hosted (Session V Part 17, ADR-014 S2), off by default. The flag is ZIGOALS_ZIGI_RELAY_ORIGIN, a secret set
 * with `wrangler secret put` on the app Worker (with ZIGOALS_SYNC_ORIGIN, as for push): without it every build answers
 * 503 and the app never shows the route (it also needs NEXT_PUBLIC_ZIGI_HOSTED=on at build time). The session check
 * goes through the PRIVATE_SYNC binding like the account route; the relay is reached through its origin, or through a
 * ZIGI_RELAY service binding when the owner adds one.
 */
async function handle(request:Request){
 const bindings=await loadRuntimeBindings<Bindings>();
 const values=Object.keys(bindings).length?bindings:process.env.NODE_ENV==='development'&&process.env.ZIGOALS_ACCOUNT_LOCAL_MODE==='direct'?process.env:{};
 const {ZIGOALS_SYNC_ORIGIN,ZIGOALS_ZIGI_RELAY_ORIGIN}=values;
 const config=ZIGOALS_SYNC_ORIGIN&&ZIGOALS_ZIGI_RELAY_ORIGIN?{syncOrigin:ZIGOALS_SYNC_ORIGIN,relayOrigin:ZIGOALS_ZIGI_RELAY_ORIGIN}:null;
 // As in the account and push routes: the middleware's inbound origin is the only same-origin authority.
 const inbound=request.headers.get('x-zigoals-origin');if(inbound){const url=new URL(request.url),trusted=new URL(inbound);if(trusted.origin!==inbound||!['https:','http:'].includes(trusted.protocol))return Response.json({error:'ORIGIN_DENIED'},{status:403});request=new Request(new URL(url.pathname+url.search,inbound),request);}
 const fetcher:typeof fetch=async(input,init)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url,origin=new URL(url).origin;
  if(origin===config?.syncOrigin){if(bindings.PRIVATE_SYNC)return bindings.PRIVATE_SYNC.fetch(new Request(input,init));if(values!==process.env)return Response.json({error:'SYNC_BINDING_REQUIRED'},{status:503});}
  if(origin===config?.relayOrigin&&bindings.ZIGI_RELAY)return bindings.ZIGI_RELAY.fetch(new Request(input,init));
  return fetch(input,init);
 };
 return zigiRequest(request,config,fetcher);
}
export const GET=handle;
export const POST=handle;
