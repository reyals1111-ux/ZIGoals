import {privateAccountRequest} from '../../../lib/server/private-account';
import {loadRuntimeBindings} from '../../../lib/server/runtime-bindings';
export const dynamic='force-dynamic';
type Bindings={ZIGOALS_AUTH_ORIGIN?:string;ZIGOALS_AUTH_PUBLIC_KEY?:string;ZIGOALS_SYNC_ORIGIN?:string;PRIVATE_SYNC?:{fetch:(request:Request)=>Promise<Response>};AUTH_ABUSE?:{fetch:(request:Request)=>Promise<Response>}};
async function handle(request:Request){
 const bindings=await loadRuntimeBindings<Bindings>();
 const values=Object.keys(bindings).length?bindings:process.env.NODE_ENV==='development'&&process.env.ZIGOALS_ACCOUNT_LOCAL_MODE==='direct'?process.env:{};
 const {ZIGOALS_AUTH_ORIGIN,ZIGOALS_AUTH_PUBLIC_KEY,ZIGOALS_SYNC_ORIGIN}=values;
 const config=ZIGOALS_AUTH_ORIGIN&&ZIGOALS_AUTH_PUBLIC_KEY&&ZIGOALS_SYNC_ORIGIN?{authOrigin:ZIGOALS_AUTH_ORIGIN,publicKey:ZIGOALS_AUTH_PUBLIC_KEY,syncOrigin:ZIGOALS_SYNC_ORIGIN}:null;
 // OpenNext reconstructs route URLs with localhost. Middleware overwrites this
 // header from the actual inbound URL on every matched request; never use Origin
 // or a client-supplied forwarded host as the expected same-origin authority.
 const inbound=request.headers.get('x-zigoals-origin');if(inbound){const url=new URL(request.url),trusted=new URL(inbound);if(trusted.origin!==inbound||!['https:','http:'].includes(trusted.protocol))return Response.json({error:'ORIGIN_DENIED'},{status:403});request=new Request(new URL(url.pathname+url.search,inbound),request);}
 const fetcher:typeof fetch=async(input,init)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(new URL(url).origin===config?.syncOrigin){if(bindings.PRIVATE_SYNC)return bindings.PRIVATE_SYNC.fetch(new Request(input,init));if(values!==process.env)return Response.json({error:'SYNC_BINDING_REQUIRED'},{status:503});}return fetch(input,init);};
 const admit=async(action:'send'|'verify',email:string)=>bindings.AUTH_ABUSE?bindings.AUTH_ABUSE.fetch(new Request('https://auth-admission.internal/admit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,email,ip:request.headers.get('cf-connecting-ip')??''})})):Response.json({error:'AUTH_ADMISSION_REQUIRED'},{status:503});
 return privateAccountRequest(request,config,fetcher,admit);
}
export const GET=handle;
export const POST=handle;
