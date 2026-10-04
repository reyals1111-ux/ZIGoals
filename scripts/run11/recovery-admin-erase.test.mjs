import {expect,test} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,stat} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import {CONFIGS,ADMIN_CONFIG} from './activation-check.mjs';
import {makePrivateConfigs,makeAdminConfig} from './make-private-configs.mjs';
import {run,parseArgs,checkpointDigest} from './recovery-admin.mjs';

// Session S Part 5 (FIX_PLAN H1, Q-OPS-06): the owner's erase command, end to end with the stand-in harness of
// recovery-admin.test.mjs. The real admin Worker reaches the real lifecycle authority through a LOCAL binding to the
// LifecycleRecoveryAdmin entrypoint (standing in for wrangler's remote binding); the CLI talks to it over 127.0.0.1.
// Fictional identities. Outbound requests throw: erase itself never calls a provider.
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',family='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',operation='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OWNER_ERASE_FAMILY='00000000-0000-4000-8000-0000000000ad';
const repo=resolve(import.meta.dirname,'../..'),compatibilityDate='2026-09-13';
const adminScript=readFileSync(join(repo,'workers/recovery-admin/worker.mjs'),'utf8');
let lifecycleCode;
const lifecycleScript=async()=>lifecycleCode??=(await build({entryPoints:[join(repo,'workers/private-sync/lifecycle.mjs')],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']})).outputFiles[0].text;
const noOutbound=()=>{throw Error('Erase must never call external providers');};
const lifecycleWorker=async mode=>({name:'lifecycle',modules:true,script:await lifecycleScript(),compatibilityDate,durableObjects:{LIFECYCLES:{className:'LifecycleAuthority',useSQLite:true}},bindings:{RECOVERY_MODE:mode},outboundService:noOutbound});
const miniflare=async(persist,workers)=>new Miniflare({...convertV4MiniflareOptions({workers,durableObjectsPersist:persist}),resourcePersistencePath:persist});
/** The ordinary service path: a Health section deletion, and optionally the app's own account deletion. */
async function seed(persist,{deleteAccount=false}={}){
 const mf=await miniflare(persist,[{name:'harness',modules:true,script:'export default {fetch(r,e){return e.LIFE.fetch(r)}}',serviceBindings:{LIFE:{name:'lifecycle',entrypoint:'LifecycleService'}},compatibilityDate},await lifecycleWorker('serve')]);
 const call=body=>mf.dispatchFetch('https://fixture/account',{method:'POST',headers:{'x-verified-account':account,'content-type':'application/json'},body:JSON.stringify(body)});
 try{
  expect((await call({action:'delete-domain',domain:'health',generation:0,operation})).status).toBe(200);
  if(deleteAccount)expect((await call({action:'delete',confirm:'DELETE CLOUD DATA',generation:1,family})).status).toBe(200);
  // The ordinary service never serves the admin paths.
  expect((await mf.dispatchFetch('https://fixture/admin/erase',{method:'POST',headers:{'x-verified-account':account},body:'{}'})).status).toBe(404);
 }finally{await mf.dispose();}
}
/** Stand-in for launchWrangler. `between` runs on the lifecycle object between the export and the erase. */
function launcher(persist,{mode='serve'}={}){
 const state={};
 const launch=async({token})=>{
  const mf=await miniflare(persist,[{name:'recovery-admin',modules:true,script:adminScript,compatibilityDate,bindings:{ADMIN_SESSION_TOKEN:token},serviceBindings:{ADMIN:{name:'lifecycle',entrypoint:'LifecycleRecoveryAdmin'}},outboundService:noOutbound},await lifecycleWorker(mode),probeWorker]);
  state.mf=mf;return {url:String(await mf.ready).replace(/\/$/,''),stop:()=>mf.dispose()};
 };
 return {launch,state};
}
async function checkout(){
 const root=await mkdtemp(join(tmpdir(),'recovery-admin-erase-'));execFileSync('git',['init','-q'],{cwd:root});
 for(const path of [...Object.values(CONFIGS),ADMIN_CONFIG]){await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(repo,path),join(root,path));}
 await copyFile(join(repo,'.gitignore'),join(root,'.gitignore'));
 const policy=join(root,'policy.json');await writeFile(policy,JSON.stringify({resetTimeZone:'UTC'}));
 makePrivateConfigs(root,{authRef:'abcdefghijklmnopqrst',workersSubdomain:'fictional-team',appOrigin:'https://acctest.fictional-owner.net',namePrefix:'zigoals-acctest',marketAccountId:'fictional-account',marketPolicyFile:policy});
 makeAdminConfig(root);return root;
}
const outside=async()=>mkdtemp(join(tmpdir(),'recovery-admin-erase-custody-'));
// Personal fields that must never reach the terminal.
const PERSONAL=[account,family,operation,OWNER_ERASE_FAMILY,'deletedAt','authorizedFamily','health','domainDecisions','"generation"'];
function cli(root,launch,answers=[]){
 const lines=[],asked=[],values=[...answers];
 return {lines,asked,run:argv=>run(argv,{root,launch,prompt:async question=>{asked.push(question);return typeof values[0]==='function'?await values.shift()():values.shift();},print:line=>lines.push(line)}),assertPrivate(){const text=lines.join('\n');for(const value of PERSONAL)expect(text,value).not.toContain(value);}};
}
// The test reads and changes the lifecycle object through this probe on its own loopback socket, not through Miniflare's
// object proxies: those free remote stubs from a FinalizationRegistry with a request whose response is never read, and a
// dispose() that overlaps it raised an unhandled "terminated" (an intermittent failure under load, Session S Part 10).
const probeWorker={name:'probe',modules:true,compatibilityDate,script:"export default {fetch(r,e){return e.LIFECYCLES.get(e.LIFECYCLES.idFromName(r.headers.get('x-probe-account'))).fetch(r)}}",durableObjects:{LIFECYCLES:{className:'LifecycleAuthority',scriptName:'lifecycle'}},unsafeDirectSockets:[{host:'127.0.0.1',port:0}]};
const lifecycle=async mf=>{const base=await mf.unsafeGetDirectURL('probe');return {fetch:(url,init={})=>fetch(new URL(new URL(url).pathname,base),{...init,headers:{...init.headers,'x-probe-account':account}})};};

test('erase: export into custody, typed account and export digest, deletion recorded, identity deletion pending, re-export',async()=>{
 const root=await checkout(),persist=await mkdtemp(join(tmpdir(),'erase-persist-'));await seed(persist);
 const custody=await outside(),file=join(custody,'before.json');
 // The typed digest is read from the export the command itself just wrote, as the owner would copy it from the screen.
 const typedDigest=async()=>JSON.parse(await readFile(file,'utf8')).digest;
 const {launch}=launcher(persist),c=cli(root,launch,[account,typedDigest]);
 await c.run(['erase','--account',account,'--out',file]);
 expect(c.asked).toEqual(['Type the account UUID to confirm erase: ','Type the digest of the export just written: ']);
 for(const path of [file,join(custody,'before-after-erase.json')])expect((await stat(path)).mode&0o777).toBe(0o600);
 const before=JSON.parse(await readFile(file,'utf8')),after=JSON.parse(await readFile(join(custody,'before-after-erase.json'),'utf8'));
 expect(checkpointDigest(before.checkpoint)).toBe(before.digest);expect(before.checkpoint.lifecycle.deleted).toBe(false);
 expect(after.checkpoint.lifecycle).toMatchObject({deleted:true,generation:2,provider:'pending',authorizedFamily:OWNER_ERASE_FAMILY,account});
 // The existing receipts survive: the erase is a monotonic deletion decision, nothing is reset.
 expect(after.checkpoint.receipts).toEqual(before.checkpoint.receipts);
 const text=c.lines.join('\n');
 expect(text).toContain(`SHA-256 digest: ${before.digest}`);expect(text).toContain(`SHA-256 digest: ${after.digest}`);
 expect(text).toMatch(/ERASED: identity deletion pending/);expect(text).toContain('The encrypted vault rows stay stored, unreachable');
 c.assertPrivate();
 // A second erase is idempotent and reports it.
 const again=join(await outside(),'again.json'),c2=cli(root,launcher(persist).launch,[account,async()=>JSON.parse(await readFile(again,'utf8')).digest]);
 await c2.run(['erase','--account',account,'--out',again]);expect(c2.lines.join('\n')).toMatch(/ALREADY DELETED: identity deletion pending/);
},60000);

test('erase refuses a wrong typed account or digest, a missing terminal, and a change after the export; nothing is erased',async()=>{
 const root=await checkout(),persist=await mkdtemp(join(tmpdir(),'erase-refuse-'));await seed(persist);
 const deleted=async()=>{const h=launcher(persist),admin=await h.launch({token:'x'.repeat(43)});try{return (await (await lifecycle(h.state.mf)).fetch('https://internal/account')).json();}finally{await admin.stop();}};
 const attempt=async answers=>{const file=join(await outside(),'e.json'),h=launcher(persist),c=cli(root,h.launch,typeof answers==='function'?answers(file,h):answers);await expect(c.run(['erase','--account',account,'--out',file])).rejects.toThrow(/Nothing was erased/);c.assertPrivate();return file;};
 await attempt(['dddddddd-dddd-4ddd-8ddd-dddddddddddd','0'.repeat(64)]);
 await attempt([account,async()=>'1'.repeat(64)]);
 await attempt([undefined,undefined]);
 // Between the export and the erase, another section deletion lands: the export is no longer the latest state.
 await attempt((file,h)=>[account,async()=>{const res=await (await lifecycle(h.state.mf)).fetch('https://internal/account',{method:'POST',headers:{'x-verified-account':account,'content-type':'application/json'},body:JSON.stringify({action:'delete-domain',domain:'finance',generation:0,operation:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'})});expect(res.status).toBe(200);await res.text();return JSON.parse(await readFile(file,'utf8')).digest;}]);
 expect(await deleted()).toMatchObject({deleted:false});
},90000);

test('erase after the app deleted cloud data only requests the identity deletion, keeping the app\'s decision',async()=>{
 const root=await checkout(),persist=await mkdtemp(join(tmpdir(),'erase-app-deleted-'));await seed(persist,{deleteAccount:true});
 const file=join(await outside(),'b.json'),c=cli(root,launcher(persist).launch,[account,async()=>JSON.parse(await readFile(file,'utf8')).digest]);
 await c.run(['erase','--account',account,'--out',file]);
 const after=JSON.parse(await readFile(file.replace('.json','-after-erase.json'),'utf8'));
 expect(after.checkpoint.lifecycle).toMatchObject({deleted:true,generation:2,provider:'pending',authorizedFamily:family});
 expect(c.lines.join('\n')).toMatch(/ALREADY DELETED: identity deletion pending/);c.assertPrivate();
},60000);

test('erase needs exactly --account and --out',()=>{
 expect(parseArgs(['erase','--account',account,'--out','x.json'])).toMatchObject({command:'erase',account,out:'x.json'});
 for(const argv of [['erase','--account',account],['erase','--out','x'],['erase','--account',account,'--out','x','--digest','0'.repeat(64)],['erase','--account','AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA','--out','x']])expect(()=>parseArgs(argv)).toThrow();
});
