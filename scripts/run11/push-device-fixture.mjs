// The device push Worker (ADR-036 Q3) in Miniflare: the real workers/push-device/worker.mjs with its two SQLite Durable
// Objects, a VAPID key generated here, and every outbound call kept in this process: each push delivery is recorded and
// answered with the status the test sets. Nothing reaches a network.
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {generateVapidKeys} from '../push/make-vapid-keys.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
export const APP_ORIGIN='https://app.test',SUBJECT='mailto:push@zigoals.test';
let bundled;
async function bundle(){bundled??=(await build({entryPoints:[new URL('../../workers/push-device/worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'})).outputFiles[0].text;return bundled;}
/** @param {{fixture?:boolean,bindings?:Record<string,string>,omit?:string[]}} [options] */
export async function deviceRuntime({fixture=true,bindings={},omit=[]}={}){
 const vapid=await generateVapidKeys(),deliveries=[],state={status:201};
 const outbound=async request=>{deliveries.push({url:request.url,method:request.method,headers:Object.fromEntries(request.headers),body:new Uint8Array(await request.arrayBuffer())});return new Response(null,{status:state.status});};
 const vars={APP_ORIGIN,VAPID_SUBJECT:SUBJECT,VAPID_PRIVATE_KEY:JSON.stringify(vapid.privateJwk),PUSH_ALLOWED_HOSTS:'push.test',KILL_SWITCH:'off',...(fixture?{ISOLATED_FIXTURE:'true'}:{}),...bindings};
 for(const name of omit)delete vars[name];
 const persist=await mkdtemp(join(tmpdir(),'zigoals-push-device-'));
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'push-device',modules:true,script:await bundle(),compatibilityDate:'2026-09-13',durableObjects:{PUSH_DEVICES:{className:'PushDevice',useSQLite:true},PUSH_BUDGET:{className:'PushBudget',useSQLite:true}},bindings:vars,outboundService:outbound}],durableObjectsPersist:persist}),resourcePersistencePath:persist});
 /** @param {string} path @param {unknown} [body] @param {{method?:string,headers?:Record<string,string>}} [options] */
 const call=(path,body,{method,headers={}}={})=>mf.dispatchFetch('https://push-device.test'+path,{method:method??(body?'POST':'GET'),headers:{origin:APP_ORIGIN,'content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
 /** The fixture clock for one device and, optionally, one alarm run at that clock. @param {string} id @param {number} now @param {boolean} [alarm] */
 const clock=async(id,now,alarm=false)=>{const res=await call('/v1/device/fixture',{id,now,alarm});if(res.status!==200)throw Error('fixture '+res.status+' '+await res.text());return res.json();};
 return {mf,call,clock,deliveries,state,vapid,dispose:()=>mf.dispose()};
}
/** A random device identity, as the app makes one. */
export function deviceIdentity(){const bytes=crypto.getRandomValues(new Uint8Array(32));return {id:crypto.randomUUID(),secret:Buffer.from(bytes).toString('base64url')};}
