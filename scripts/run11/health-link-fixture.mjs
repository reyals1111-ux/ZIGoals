// The health-link Worker (Session W Part 8) in Miniflare: the real workers/health-link/worker.mjs with its SQLite
// LinkBudget object, and every outbound call kept in this process. The account provider answers from the token's own
// subject; the four providers are MOCK endpoints that record each request and answer with what the test sets. Every log
// line is captured, with a tiny probe Worker as proof that the capture works. Fictional accounts and fake secrets only.
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixtureToken} from './private-runtime.mjs';
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url));
const {build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
export const APP_ORIGIN='https://app.test',PROBE_LINE='LOG_PROBE_5d1c_capture_works';
export const ACCOUNT='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';
export const SECRETS={OURA_CLIENT_SECRET:'FAKE-oura-secret-1',WITHINGS_CLIENT_SECRET:'FAKE-withings-secret-1',POLAR_CLIENT_SECRET:'FAKE-polar-secret-1',STRAVA_CLIENT_SECRET:'FAKE-strava-secret-1'};
let bundled;
async function bundle(){bundled??=(await build({entryPoints:[new URL('../../workers/health-link/worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'})).outputFiles[0].text;return bundled;}
/** @param {Request} request */
const claims=request=>{try{return JSON.parse(Buffer.from(String(request.headers.get('authorization')).slice(7).split('.')[1],'base64url').toString());}catch{return null;}};
const PROVIDER_HOSTS=['api.ouraring.com','wbsapi.withings.net','polarremote.com','www.polaraccesslink.com','www.strava.com'];
/** @param {{bindings?:Record<string,string>,omit?:string[]}} [options] */
export async function linkRuntime({bindings={},omit=[]}={}){
 const providers={/** @type {{method:string,url:string,headers:Record<string,string>,body:string}[]} */requests:[],/** @type {(request:{method:string,url:URL,body:string},n:number)=>Response|Promise<Response>} */reply:()=>Response.json({access_token:'FAKE-ACCESS-AAAA',refresh_token:'FAKE-REFRESH-BBBB',expires_in:3600})};
 /** @param {Request} request */
 const outbound=async request=>{
  const url=new URL(request.url);
  if(url.hostname==='fixture.supabase.co'){const c=claims(request);return !c||c.fixture_alias==='invalid'?Response.json({},{status:401}):Response.json({id:c.sub});}
  if(PROVIDER_HOSTS.includes(url.hostname)){const body=await request.text();providers.requests.push({method:request.method,url:request.url,headers:Object.fromEntries(request.headers),body});return providers.reply({method:request.method,url,body},providers.requests.length);}
  return new Response('unexpected host',{status:599});
 };
 /** @type {Record<string,string>} */
 const vars={AUTH_ORIGIN:'https://fixture.supabase.co',AUTH_PUBLIC_KEY:'public-fixture',APP_ORIGIN,HEALTH_LINK_DAILY_REQUESTS:'6',HEALTH_LINK_GLOBAL_DAILY_REQUESTS:'10',HEALTH_LINK_KILL_SWITCH:'off',ISOLATED_FIXTURE:'true',
  OURA_CLIENT_ID:'fixture-oura',WITHINGS_CLIENT_ID:'fixture-withings',POLAR_CLIENT_ID:'fixture-polar',STRAVA_CLIENT_ID:'12345',...SECRETS,...bindings};
 for(const name of omit)delete vars[name];
 /** @type {string[]} */const logs=[];
 const persist=await mkdtemp(join(tmpdir(),'zigoals-health-link-'));
 const mf=new Miniflare({...convertV4MiniflareOptions({workers:[
  {name:'run11-health-link',modules:true,script:await bundle(),compatibilityDate:'2026-09-13',durableObjects:{LINK_BUDGET:{className:'LinkBudget',useSQLite:true}},bindings:vars,outboundService:outbound},
  {name:'log-probe',modules:true,script:`export default {fetch(){console.log(${JSON.stringify(PROBE_LINE)});return new Response('ok');}};`,compatibilityDate:'2026-09-13'},
 ],durableObjectsPersist:persist}),resourcePersistencePath:persist,handleStructuredLogs:/** @param {{message:string}} log */log=>{logs.push(String(log.message));}});
 /** @param {string} path @param {{account?:string,token?:string|null,body?:unknown,method?:string,headers?:Record<string,string>}} [options] */
 const call=(path,{account=ACCOUNT,token='fixture',body,method,headers={}}={})=>mf.dispatchFetch('https://link.test'+path,{method:method??(body===undefined?'GET':'POST'),headers:{origin:APP_ORIGIN,...(token===null?{}:{authorization:'Bearer '+fixtureToken(token,account)}),'x-zigoals-account':account,'content-type':'application/json',...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
 /** @param {number} now */
 const clock=async now=>(await call('/v1/fixture',{body:{now}})).json();
 const probe=async()=>{const worker=await mf.getWorker('log-probe');await (await worker.fetch('https://probe.test/')).text();};
 return {mf,call,clock,probe,providers,logs,dispose:()=>mf.dispose()};
}
