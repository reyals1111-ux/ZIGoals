import {privateAccountRequest} from '../../../lib/server/private-account';
import {loadRuntimeBindings} from '../../../lib/server/runtime-bindings';
export const dynamic='force-dynamic';
type Bindings={ZIGOALS_AUTH_ORIGIN?:string;ZIGOALS_AUTH_PUBLIC_KEY?:string;ZIGOALS_SYNC_ORIGIN?:string;PRIVATE_SYNC?:{fetch:(request:Request)=>Promise<Response>}};
async function handle(request:Request){
 const bindings=await loadRuntimeBindings<Bindings>();
 const values=Object.keys(bindings).length?bindings:process.env.NODE_ENV==='development'&&process.env.ZIGOALS_ACCOUNT_LOCAL_MODE==='direct'?process.env:{};
 const {ZIGOALS_AUTH_ORIGIN,ZIGOALS_AUTH_PUBLIC_KEY,ZIGOALS_SYNC_ORIGIN}=values;
 const config=ZIGOALS_AUTH_ORIGIN&&ZIGOALS_AUTH_PUBLIC_KEY&&ZIGOALS_SYNC_ORIGIN?{authOrigin:ZIGOALS_AUTH_ORIGIN,publicKey:ZIGOALS_AUTH_PUBLIC_KEY,syncOrigin:ZIGOALS_SYNC_ORIGIN}:null;
 const fetcher:typeof fetch=async(input,init)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(bindings.PRIVATE_SYNC&&new URL(url).origin===config?.syncOrigin)return bindings.PRIVATE_SYNC.fetch(new Request(input,init));return fetch(input,init);};
 return privateAccountRequest(request,config,fetcher);
}
export const GET=handle;
export const POST=handle;
