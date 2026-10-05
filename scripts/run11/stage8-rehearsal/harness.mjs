// Stage 8 rehearsal harness (Session L). Test-only helpers shared by the files in this folder.
//
// Everything stays on this machine: a stand-in for the email-code provider, the real private-sync, lifecycle and
// admission Workers in Miniflare, and the real app route handler (`privateAccountRequest`) behind a Playwright route,
// exactly as scripts/run10/account-browser.test.mjs wires it. Nothing here reaches a provider, an inbox or Cloudflare.
// The existing harness modules are imported read-only.
import {createRequire} from 'node:module';
import {mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {privateAccountRequest} from '../../../apps/web/lib/server/private-account.ts';
import {createPrivateMiniflare,fixtureToken,workerAnswer} from '../private-runtime.mjs';
import {armSyncCompletion} from '../sync-completion.mjs';

const appRequire=createRequire(new URL('../../../apps/web/package.json',import.meta.url));
const workerRequire=createRequire(new URL('../../../apps/web/node_modules/wrangler/package.json',import.meta.url));

/** Browser rehearsals need Chrome and a running production app, like the other integration files. */
export const BROWSER=process.env.RUN10_BROWSER==='1';
export const reviewOrigin=()=>process.env.RUN11_REVIEW_ORIGIN??'http://127.0.0.1:3110';
export const ACCOUNT_CONFIG={authOrigin:'https://fixture.supabase.co',publicKey:'public-fixture',syncOrigin:'https://fixture.workers.dev'};
/** Fictional accounts, chosen by the email address's first letter. */
export const ACCOUNTS={a:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',b:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
export const accountFor=email=>ACCOUNTS[email[0]]??ACCOUNTS.a;
/** The `sub` claim of a fixture token. */
export const identity=authorization=>JSON.parse(Buffer.from(authorization.slice(7).split('.')[1],'base64url').toString()).sub;
export const SYNCED=/Account records synced and acknowledged/;
/** The plain refusal the sign-in panel shows for any refused code (components/account-access.tsx). */
export const CODE_REFUSED='Account access was not confirmed. Check the code and try again.';
export const COOLDOWN_REFUSED='Please wait before requesting another code.';

/**
 * A stricter stand-in for the email-code provider than the existing browser tests use (they accept any code).
 * Each send issues one new six-digit code for that address. A code is accepted once, only while it is the latest for
 * its address and younger than `ttl` on the provider's own clock, which the test moves with `advance`. The test reads
 * codes with `latest(email)`, as a person reads their inbox. Refusals answer like a provider refusal (HTTP 403).
 * The real provider's own rules are not modelled beyond this; Stage 8 checks them with real inboxes.
 */
export function codeProvider({ttl=5*60_000}={}){
 let clock=Date.now(),serial=0;
 const issued=new Map(),used=new Set(),sends=[],refusals=[],accepted=[];
 const refuse=reason=>{refusals.push(reason);return Response.json({code:403,error_code:'otp_expired',msg:'Token has expired or is invalid'},{status:403});};
 return {
  sends,refusals,accepted,
  advance(ms){clock+=ms;},
  latest:email=>issued.get(email)?.code,
  /** The `fetch` stand-in for requests to the provider origin. */
  async handle(url,init){
   const path=new URL(url).pathname,body=init?.body?JSON.parse(init.body):{};
   if(path==='/auth/v1/otp'){sends.push(body.email);issued.set(body.email,{code:String(246800+(++serial)),at:clock});return Response.json({});}
   if(path==='/auth/v1/verify'){
    const entry=issued.get(body.email);
    if(used.has(body.email+':'+body.token))return refuse('reused');
    if(!entry||entry.code!==body.token)return refuse('invalid');
    if(clock-entry.at>ttl)return refuse('expired');
    used.add(body.email+':'+body.token);accepted.push(body.email);const id=accountFor(body.email);
    return Response.json({access_token:fixtureToken(`code-${serial}-${body.email}`,id),expires_in:3600,user:{id}});
   }
   if(path==='/auth/v1/user')return Response.json({id:identity(new Headers(init?.headers).get('authorization'))});
   return Response.json({});
  },
 };
}

/** A provider that accepts any code, like the existing browser tests; for rehearsals that are not about codes. */
export function anyCodeProvider(){
 let serial=0;
 return {async handle(url,init){
  const path=new URL(url).pathname,body=init?.body?JSON.parse(init.body):{};
  if(path==='/auth/v1/verify'){const id=accountFor(body.email);return Response.json({access_token:fixtureToken(`device-${++serial}-${body.email}`,id),expires_in:3600,user:{id}});}
  if(path==='/auth/v1/user')return Response.json({id:identity(new Headers(init?.headers).get('authorization'))});
  return Response.json({});
 }};
}

/** The real private-sync and lifecycle Workers in Miniflare; each token's `sub` is its verified account. */
export async function privateWorkers({origin,recoveryMode='serve',persist}={}){
 persist??=await mkdtemp(join(tmpdir(),'stage8-vault-'));
 const mf=await createPrivateMiniflare({persist,origin,recoveryMode,outboundService:async request=>Response.json({id:identity(request.headers.get('authorization'))})});
 return {mf,persist};
}

/**
 * The real admission Worker (workers/auth-abuse) in Miniflare, set up as in scripts/run11/auth-abuse.test.mjs. Its clock
 * is fixed for each start, so `at(time)` restarts it at that time with the same durable state.
 */
export async function admissionWorker(){
 const {build}=workerRequire('esbuild'),{Miniflare,convertV4MiniflareOptions}=workerRequire('miniflare');
 const script=(await build({entryPoints:[new URL('../../../workers/auth-abuse/worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']})).outputFiles[0].text;
 const persist=await mkdtemp(join(tmpdir(),'stage8-admission-'));let mf;
 return {
  async at(time){await mf?.dispose();mf=new Miniflare({...convertV4MiniflareOptions({workers:[{name:'app',modules:true,script:'export default {fetch(r,e){return e.GATE.fetch(r)}}',serviceBindings:{GATE:{name:'gate',entrypoint:'AdmissionService'}}},{name:'gate',modules:true,script,compatibilityDate:'2026-09-13',durableObjects:{ADMISSION:{className:'AdmissionAuthority',useSQLite:true}},bindings:{AUTH_ADMISSION_KEY:'fixture-secret-00000000000000000000',ISOLATED_FIXTURE:'true',LOCAL_TEST_NOW:String(time)},outboundService:()=>{throw Error('No network authorized');}}]}),resourcePersistencePath:persist});},
  /** The call the app route makes (app/api/private-account/route.ts), from one fixed fictional address. */
  admit:(action,email)=>mf.dispatchFetch('https://auth-admission.internal/admit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,email,ip:'192.0.2.10'})}),
  close:()=>mf?.dispose(),
 };
}

/** The app's account route handler with the fixture services behind it. */
export function accountHandler({mf,provider,admit}){
 return request=>privateAccountRequest(request,ACCOUNT_CONFIG,async(url,init)=>new URL(url).hostname==='fixture.workers.dev'?mf.dispatchFetch(url,init):provider.handle(url,init),admit);
}

/**
 * Answers the browser's account requests with `accountHandler`, as the existing browser tests do.
 * `afterVault(method, operation)` runs after the Worker has answered a `/v1/vault` request (`operation` is the parsed
 * request body, or null) and before the browser gets the answer:
 * it may wait (a held acknowledgement) or return 'drop', so the browser sees a dropped connection although the Worker
 * already applied the request (a lost acknowledgement).
 */
export async function routeAccount(context,{mf,provider,admit,afterVault}){
 let offline=false;
 await context.route('**/api/private-account*',async route=>{
  if(offline){await route.abort('internetdisconnected');return;}
  const r=route.request(),headers=await r.allHeaders();let drop=false;
  const result=await privateAccountRequest(new Request(r.url(),{method:r.method(),headers,...(r.postData()?{body:r.postData()}:{})}),ACCOUNT_CONFIG,async(url,init)=>{
   const u=new URL(url);if(u.hostname!=='fixture.workers.dev')return provider.handle(url,init);
   const response=await workerAnswer(mf,url,init);
   if(u.pathname==='/v1/vault'&&afterVault&&await afterVault(init?.method??'GET',init?.body?JSON.parse(init.body):null)==='drop')drop=true;
   return response;
  },admit);
  // A reload while a reply is held leaves no request to answer.
  try{
   if(drop){await route.abort('connectionreset');return;}
   const cookies=result.headers.getSetCookie();
   await route.fulfill({status:result.status,headers:{...Object.fromEntries(result.headers),...(cookies.length?{'set-cookie':cookies.join('\n')}:{})},body:await result.text()});
  }catch(error){if(!/closed|Target|detached|disposed|handled|cancel|abort/i.test(String(error)))throw error;}
 });
 return {setOffline:async value=>{offline=value;await context.setOffline(value);}};
}

export async function launchChrome(){
 const {chromium}=appRequire('@playwright/test');
 return chromium.launch({channel:'chrome',headless:true});
}

/** Drivers for the existing Settings controls, by their visible names. */
export function accountUi(page){
 const access=()=>page.getByRole('region',{name:'Email account access',exact:true});
 const syncRegion=()=>page.getByRole('region',{name:'Encrypted account sync',exact:true});
 const healthConsent=()=>page.getByLabel('Sync my Health records with this account.',{exact:false});
 const ui={
  access,syncRegion,healthConsent,
  settings:()=>page.goto(reviewOrigin()+'/app/settings'),
  /** Client-side navigation: a reload would lock the in-memory vault session. */
  go:async name=>{await page.getByRole('link',{name,exact:true}).first().click();},
  async requestCode(email){await page.getByLabel('Email address',{exact:true}).fill(email);await page.getByRole('button',{name:'Send email code',exact:true}).click();},
  async enterCode(code){await page.getByLabel('Email code',{exact:true}).fill(code);await page.getByRole('button',{name:'Verify email code',exact:true}).click();},
  /** Waits until verification finished and the vault controls are shown. */
  verified:()=>page.getByRole('button',{name:'Create encrypted account vault',exact:true}).or(page.getByLabel('Vault recovery secret',{exact:true})).waitFor(),
  async signIn(email,code='123456'){await ui.requestCode(email);await ui.enterCode(code);await ui.verified();},
  /** Creates the vault through the existing controls and waits for the first sync. Returns the recovery secret. */
  async createVault({health=false}={}){
   if(health)await healthConsent().check();
   await page.getByRole('button',{name:'Create encrypted account vault',exact:true}).click();
   const recovery=await page.getByLabel('New vault recovery secret',{exact:true}).inputValue();
   await page.getByLabel('I saved this vault recovery secret separately.').check();
   const done=await armSyncCompletion(page);await page.getByRole('button',{name:'Confirm and create vault',exact:true}).click();await done();
   return recovery;
  },
  async unlock(recovery,{health=false}={}){
   if(health)await healthConsent().check();
   await page.getByLabel('Vault recovery secret',{exact:true}).fill(recovery);
   const done=await armSyncCompletion(page);await page.getByRole('button',{name:'Unlock account vault',exact:true}).click();await done();
  },
  /** "Sync now" from Settings, waiting for a completion that happened after the click. */
  async syncNow(){const done=await armSyncCompletion(page);await page.getByRole('button',{name:'Sync now',exact:true}).click();await done();await syncRegion().getByText(SYNCED).waitFor();},
 };
 return ui;
}

/** Whether this context holds a non-empty app session cookie (either cookie name the route may use). */
export async function hasSession(context){
 return (await context.cookies()).some(c=>/^(__Host-)?zigoals_session$/.test(c.name)&&c.value!=='');
}

/** The encrypted records the Worker holds for an account, as the existing account test reads them. */
export async function workerRecords(mf,{origin,token,account}){
 const response=await mf.dispatchFetch('https://fixture.workers.dev/v1/vault',{headers:{origin,authorization:'Bearer '+token,'x-zigoals-account':account}});
 return {status:response.status,body:response.ok?await response.json():null};
}

/** The session token the route stored in this context's cookie. */
export async function sessionToken(context,origin){
 return (await context.cookies(origin+'/api/private-account')).find(c=>/^(__Host-)?zigoals_session$/.test(c.name))?.value;
}
