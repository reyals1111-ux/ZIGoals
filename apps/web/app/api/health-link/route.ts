import {healthLinkRequest} from '../../../lib/server/health-link-route';
import {loadRuntimeBindings} from '../../../lib/server/runtime-bindings';
export const dynamic='force-dynamic';
type Fetcher={fetch:(request:Request)=>Promise<Response>};
type Bindings={ZIGOALS_SYNC_ORIGIN?:string;ZIGOALS_HEALTH_LINK_ORIGIN?:string;PRIVATE_SYNC?:Fetcher;HEALTH_LINK?:Fetcher};
/**
 * Health links (Session W Part 8, [TIER 3]), off by default. The flag is ZIGOALS_HEALTH_LINK_ORIGIN, a secret set with
 * `wrangler secret put` on the app Worker (with ZIGOALS_SYNC_ORIGIN): without it every build answers 503, and the app
 * shows no Connect button unless it was also built with NEXT_PUBLIC_HEALTH_LINK=on. The session check goes through the
 * PRIVATE_SYNC binding like the account route; the Worker through its origin, or a HEALTH_LINK service binding.
 */
async function handle(request:Request){
 const bindings=await loadRuntimeBindings<Bindings>();
 const values=Object.keys(bindings).length?bindings:process.env.NODE_ENV==='development'&&process.env.ZIGOALS_ACCOUNT_LOCAL_MODE==='direct'?process.env:{};
 const {ZIGOALS_SYNC_ORIGIN,ZIGOALS_HEALTH_LINK_ORIGIN}=values;
 const config=ZIGOALS_SYNC_ORIGIN&&ZIGOALS_HEALTH_LINK_ORIGIN?{syncOrigin:ZIGOALS_SYNC_ORIGIN,linkOrigin:ZIGOALS_HEALTH_LINK_ORIGIN}:null;
 const inbound=request.headers.get('x-zigoals-origin');if(inbound){const url=new URL(request.url),trusted=new URL(inbound);if(trusted.origin!==inbound||!['https:','http:'].includes(trusted.protocol))return Response.json({error:'ORIGIN_DENIED'},{status:403});request=new Request(new URL(url.pathname+url.search,inbound),request);}
 const fetcher:typeof fetch=async(input,init)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.href:input.url,origin=new URL(url).origin;
  if(origin===config?.syncOrigin){if(bindings.PRIVATE_SYNC)return bindings.PRIVATE_SYNC.fetch(new Request(input,init));if(values!==process.env)return Response.json({error:'SYNC_BINDING_REQUIRED'},{status:503});}
  if(origin===config?.linkOrigin&&bindings.HEALTH_LINK)return bindings.HEALTH_LINK.fetch(new Request(input,init));
  return fetch(input,init);
 };
 return healthLinkRequest(request,config,fetcher);
}
export const GET=handle;
export const POST=handle;
