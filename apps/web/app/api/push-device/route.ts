import {pushDeviceRequest} from '../../../lib/server/push-device-route';
import {loadRuntimeBindings} from '../../../lib/server/runtime-bindings';
import {PUBLIC_INTEGRATIONS} from '../../../lib/public-integrations';
export const dynamic='force-dynamic';
type Fetcher={fetch:(request:Request)=>Promise<Response>};
type Bindings={ZIGOALS_PUSH_DEVICE_ORIGIN?:string;PUSH_DEVICE?:Fetcher};
/**
 * Device notifications (Session AK Part 2, ADR-036 Q3). Two switches, both the owner's: the committed
 * `pushDeviceEnabled` with the public VAPID key (config/public-integrations.json), and the Worker's origin as the
 * runtime secret ZIGOALS_PUSH_DEVICE_ORIGIN (or a PUSH_DEVICE service binding the owner adds). Until both are set every
 * build answers 503 "being switched on" (docs/run11/PUSH_PUBLIC_ALPHA.md).
 */
async function handle(request:Request){
 const bindings=await loadRuntimeBindings<Bindings>();
 const workerOrigin=bindings.ZIGOALS_PUSH_DEVICE_ORIGIN??null;
 // As in the account route: the middleware's inbound origin is the only same-origin authority.
 const inbound=request.headers.get('x-zigoals-origin');if(inbound){const url=new URL(request.url),trusted=new URL(inbound);if(trusted.origin!==inbound||!['https:','http:'].includes(trusted.protocol))return Response.json({error:'ORIGIN_DENIED'},{status:403});request=new Request(new URL(url.pathname+url.search,inbound),request);}
 const fetcher:typeof fetch=async(input,init)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(workerOrigin&&new URL(url).origin===workerOrigin&&bindings.PUSH_DEVICE)return bindings.PUSH_DEVICE.fetch(new Request(input,init));return fetch(input,init);};
 return pushDeviceRequest(request,{enabled:PUBLIC_INTEGRATIONS.pushDeviceEnabled,publicKey:PUBLIC_INTEGRATIONS.pushVapidPublicKey,workerOrigin},fetcher);
}
export const GET=handle;
export const PUT=handle;
export const DELETE=handle;
export const POST=handle;
