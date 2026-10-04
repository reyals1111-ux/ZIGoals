// The push Worker (ADR-010) in Miniflare: the real worker.mjs with a SQLite PushAccount object, the provider fixture
// of private-runtime.mjs, a VAPID key generated here, and every outbound call kept in this process: the provider
// answers from the token alias; anything else is recorded as a push delivery and answered with the status the test
// sets. The decrypt helper uses the Worker's own derivation (workers/push-reminders/webpush.mjs).
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {ACCOUNT,fixtureAlias,fixtureToken} from './private-runtime.mjs';
import {b64url,deriveContentKeys,ecdhSecret} from '../../workers/push-reminders/webpush.mjs';
import {generateVapidKeys} from '../push/make-vapid-keys.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
export const APP_ORIGIN='https://app.test',SUBJECT='mailto:push@zigoals.test';
export {ACCOUNT,fixtureToken};
let bundled;
async function bundle(){bundled??=(await build({entryPoints:[new URL('../../workers/push-reminders/worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',external:['cloudflare:workers']})).outputFiles[0].text;return bundled;}
/**
 * @param {{fixture?:boolean,bindings?:Record<string,string>,omit?:string[]}} [options]
 */
export async function pushRuntime({fixture=true,bindings={},omit=[]}={}){
 const vapid=await generateVapidKeys(),deliveries=[],state={status:201,/** @type {(url:URL)=>number} */statusFor:()=>state.status};
 const outbound=async request=>{
  const url=new URL(request.url);
  if(url.hostname==='fixture.supabase.co'){const alias=fixtureAlias(request);return Response.json(alias==='invalid'?{}:{id:ACCOUNT},{status:alias==='invalid'?401:200});}
  deliveries.push({url:request.url,method:request.method,headers:Object.fromEntries(request.headers),body:new Uint8Array(await request.arrayBuffer())});
  return new Response(null,{status:state.statusFor(url)});
 };
 const vars={AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'public-fixture',APP_ORIGIN,VAPID_SUBJECT:SUBJECT,VAPID_PRIVATE_KEY:JSON.stringify(vapid.privateJwk),PUSH_ALLOWED_HOSTS:'push.test',...(fixture?{ISOLATED_FIXTURE:'true'}:{}),...bindings};
 for(const name of omit)delete vars[name];
 const persist=await mkdtemp(join(tmpdir(),'zigoals-push-'));
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'run11-push-reminders',modules:true,script:await bundle(),compatibilityDate:'2026-09-13',durableObjects:{PUSH_ACCOUNTS:{className:'PushAccount',useSQLite:true}},bindings:vars,outboundService:outbound}],durableObjectsPersist:persist}),resourcePersistencePath:persist});
 /** @param {string} path @param {unknown} [body] @param {{token?:string|null,headers?:Record<string,string>,method?:string}} [options] */
 const call=(path,body,{token='fixture',headers={},method}={})=>mf.dispatchFetch('https://push.test'+path,{method:method??(body?'POST':'GET'),headers:{origin:APP_ORIGIN,...(token===null?{}:{authorization:'Bearer '+fixtureToken(token)}),'x-zigoals-account':ACCOUNT,'content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
 /** The fixture clock and, optionally, one alarm run at that clock. @param {number} now @param {boolean} [alarm] */
 const clock=async(now,alarm=false)=>{const res=await call('/v1/push',{action:'fixture',now,alarm});if(res.status!==200)throw Error('fixture '+res.status+' '+await res.text());return res.json();};
 return {mf,call,clock,deliveries,state,vapid,dispose:()=>mf.dispose()};
}
/** A browser-side subscription: a fresh ECDH pair and a 16-byte authentication secret. @param {string} endpoint */
export async function deviceFixture(endpoint){
 const pair=/** @type {CryptoKeyPair} */(await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']));
 const uaPublic=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey)),auth=crypto.getRandomValues(new Uint8Array(16));
 return {endpoint,p256dh:b64url(uaPublic),auth:b64url(auth),uaPublic,authBytes:auth,privateKey:pair.privateKey};
}
/** RFC 8291 decryption with the user agent's private key: header, ECDH, the same derivation, AES-GCM, the 0x02 delimiter. @param {{body:Uint8Array,privateKey:CryptoKey,uaPublic:Uint8Array,auth:Uint8Array}} input */
export async function decryptPush({body,privateKey,uaPublic,auth}){
 if(body.length<87)throw Error('HEADER');
 const salt=body.slice(0,16),rs=new DataView(body.buffer,body.byteOffset+16,4).getUint32(0),idlen=body[20],asPublic=body.slice(21,21+idlen),ciphertext=body.slice(21+idlen);
 if(rs!==4096||idlen!==65)throw Error('HEADER');
 const secret=await ecdhSecret(privateKey,asPublic),{cek,nonce}=await deriveContentKeys({secret,auth,uaPublic,asPublic,salt});
 const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['decrypt']);
 const record=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},key,ciphertext));
 let end=record.length;while(end>0&&record[end-1]===0)end--;
 if(end===0||record[end-1]!==2)throw Error('DELIMITER');
 return new TextDecoder().decode(record.slice(0,end-1));
}
