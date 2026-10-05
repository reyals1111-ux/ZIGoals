import {expect,test} from 'vitest';
import {createRequire} from 'node:module';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,stat,chmod,rm} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import JSON5 from 'json5';
import {CONFIGS,ADMIN_CONFIG,privatePath} from './activation-check.mjs';
import {makePrivateConfigs,makeAdminConfig} from './make-private-configs.mjs';
import {run,parseArgs,adminCall,writeCheckpointFile,checkpointDigest,readCheckpointFile} from './recovery-admin.mjs';

// ADR-007 option A end to end, locally: the real admin Worker (workers/recovery-admin/worker.mjs) reaches the real
// lifecycle authority (workers/private-sync/lifecycle.mjs) through a LOCAL service binding to the
// LifecycleRecoveryAdmin entrypoint, standing in for wrangler's remote binding. The CLI talks to it over
// 127.0.0.1 exactly as it would to `wrangler dev`. Fictional identities, as in lifecycle-recovery.test.mjs.
// Outbound requests throw: recovery never calls a provider.
const require=createRequire(new URL('../../apps/web/node_modules/wrangler/package.json',import.meta.url)),{build}=require('esbuild'),{Miniflare,convertV4MiniflareOptions}=require('miniflare');
const account='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',family='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',operation='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const repo=resolve(import.meta.dirname,'../..'),compatibilityDate='2026-09-13';
const adminScript=readFileSync(join(repo,'workers/recovery-admin/worker.mjs'),'utf8');
let lifecycleCode;
const lifecycleScript=async()=>lifecycleCode??=(await build({entryPoints:[join(repo,'workers/private-sync/lifecycle.mjs')],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers']})).outputFiles[0].text;
const noOutbound=()=>{throw Error('Recovery must never call external providers');};
const lifecycleWorker=async(mode,anchor)=>({name:'lifecycle',modules:true,script:await lifecycleScript(),compatibilityDate,durableObjects:{LIFECYCLES:{className:'LifecycleAuthority',useSQLite:true}},bindings:{RECOVERY_MODE:mode,...(anchor?{RECOVERY_ACCOUNT_ID:account,RECOVERY_CHECKPOINT_SHA256:anchor}:{})},outboundService:noOutbound});
const miniflare=async(persist,workers)=>new Miniflare({...convertV4MiniflareOptions({workers,durableObjectsPersist:persist}),resourcePersistencePath:persist});

/** The fictional history: one Health section deletion, then the account deletion, through the ordinary service. */
async function seed(persist){
 const mf=await miniflare(persist,[{name:'harness',modules:true,script:'export default {fetch(r,e){return e.LIFE.fetch(r)}}',serviceBindings:{LIFE:{name:'lifecycle',entrypoint:'LifecycleService'}},compatibilityDate},await lifecycleWorker('serve')]);
 const call=body=>mf.dispatchFetch('https://fixture/account',{method:'POST',headers:{'x-verified-account':account,'content-type':'application/json'},body:JSON.stringify(body)});
 try{expect((await call({action:'delete-domain',domain:'health',generation:0,operation})).status).toBe(200);expect((await call({action:'delete',confirm:'DELETE CLOUD DATA',generation:1,family})).status).toBe(200);}finally{await mf.dispose();}
}
/** Stand-in for launchWrangler: the admin Worker first (it serves 127.0.0.1), bound locally to the lifecycle entrypoint. */
function launcher(persist,{mode='serve',anchor}={},calls=[]){
 return async({adminConfig,token})=>{
  calls.push(adminConfig);
  const mf=await miniflare(persist,[{name:'recovery-admin',modules:true,script:adminScript,compatibilityDate,bindings:{ADMIN_SESSION_TOKEN:token},serviceBindings:{ADMIN:{name:'lifecycle',entrypoint:'LifecycleRecoveryAdmin'}},outboundService:noOutbound},await lifecycleWorker(mode,anchor)]);
  return {url:String(await mf.ready).replace(/\/$/,''),stop:()=>mf.dispose(),mf};
 };
}
/** A throwaway git checkout with the seven ignored 0600 owner configs (fictional values). */
async function checkout(){
 const root=await mkdtemp(join(tmpdir(),'recovery-admin-cli-'));execFileSync('git',['init','-q'],{cwd:root});
 for(const path of [...Object.values(CONFIGS),ADMIN_CONFIG]){await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(repo,path),join(root,path));}
 await copyFile(join(repo,'.gitignore'),join(root,'.gitignore'));
 const policy=join(root,'policy.json');await writeFile(policy,JSON.stringify({resetTimeZone:'UTC'}));
 makePrivateConfigs(root,{authRef:'abcdefghijklmnopqrst',workersSubdomain:'fictional-team',appOrigin:'https://acctest.fictional-owner.net',namePrefix:'zigoals-acctest',marketAccountId:'fictional-account',marketPolicyFile:policy});
 makeAdminConfig(root);return root;
}
const outside=async()=>mkdtemp(join(tmpdir(),'recovery-admin-custody-'));
const answers=(values,asked=[])=>async question=>{asked.push(question);return values.shift();};
// Personal fields that must never reach the terminal.
const PERSONAL=[account,family,operation,'deletedAt','authorizedFamily','health','domainDecisions','"generation"'];
function cli(root,launch,prompt=answers([])){
 const lines=[];
 return {lines,run:argv=>run(argv,{root,launch,prompt,print:line=>lines.push(line)}),assertPrivate(){const text=lines.join('\n');for(const value of PERSONAL)expect(text,value).not.toContain(value);}};
}
async function editVars(root,vars){const path=join(root,privatePath(CONFIGS.lifecycle)),c=JSON5.parse(await readFile(path,'utf8'));c.vars={...c.vars,...vars};await writeFile(path,JSON.stringify(c),{mode:0o600});}

test('export → verify → dry-run → reconcile → re-export → replay after a total lifecycle loss; output names digests and counts only',async()=>{
 const root=await checkout(),original=await mkdtemp(join(tmpdir(),'recovery-admin-original-'));await seed(original);
 const custody=await outside(),file=join(custody,'lifecycle-checkpoint.json'),calls=[];
 let c=cli(root,launcher(original,{mode:'serve'},calls));
 await c.run(['export','--account',account,'--out',file]);
 expect(calls).toEqual([join(root,'workers/recovery-admin/wrangler.acctest.owner.jsonc')]);
 expect((await stat(file)).mode&0o777).toBe(0o600);
 const envelope=JSON.parse(await readFile(file,'utf8')),digest=envelope.digest;
 expect(Object.keys(envelope).sort()).toEqual(['checkpoint','digest']);expect(checkpointDigest(envelope.checkpoint)).toBe(digest);
 expect(envelope.checkpoint).toMatchObject({version:1,account,lifecycle:{deleted:true,generation:2,authorizedFamily:family,domainGenerations:{health:1}},receipts:[{operation,domain:'health',generation:1}]});
 expect(c.lines.join('\n')).toContain(`SHA-256 digest: ${digest}`);expect(c.lines.join('\n')).toContain('Receipts: 1');
 await c.run(['verify','--file',file,'--digest',digest]);expect(c.lines.at(-1)).toMatch(/^MATCH/);
 // Serving authority: dry-run is refused by the Worker itself (the local config says reconcile).
 await expect(c.run(['dry-run','--account',account,'--file',file,'--digest',digest])).rejects.toThrow('not in RECOVERY_MODE=reconcile');
 c.assertPrivate();

 // Total loss: an empty authority in reconcile mode, anchored to the custodied digest.
 const restored=await mkdtemp(join(tmpdir(),'recovery-admin-restored-')),asked=[];
 c=cli(root,launcher(restored,{mode:'reconcile',anchor:digest}),answers([account,digest],asked));
 await c.run(['dry-run','--account',account,'--file',file,'--digest',digest]);
 const dryLine=c.lines.at(-1);expect(dryLine).toMatch(/^DRY RUN OK: .* Result digest: [0-9a-f]{64}\./);expect(asked).toEqual([]);
 await c.run(['reconcile','--account',account,'--file',file,'--digest',digest]);
 expect(asked).toEqual(['Type the account UUID to confirm reconcile: ','Type the expected checkpoint digest: ']);
 const result=c.lines.join('\n').match(/RECONCILED: result digest ([0-9a-f]{64})/)?.[1];expect(result).toBeTruthy();
 expect(dryLine).toContain(result);expect(c.lines.at(-1)).toContain('Re-export digest matches');
 const after=join(await outside(),'after.json');await c.run(['export','--account',account,'--out',after]);
 const exported=JSON.parse(await readFile(after,'utf8'));expect(exported.digest).toBe(result);
 expect(exported.checkpoint.lifecycle).toMatchObject({deleted:true,generation:2,domainGenerations:{health:1}});expect(exported.checkpoint.receipts).toEqual(envelope.checkpoint.receipts);
 // The same checkpoint again is a replay: reported, no confirmation asked, nothing changed.
 asked.length=0;await c.run(['reconcile','--account',account,'--file',file,'--digest',digest]);
 expect(c.lines.at(-1)).toMatch(/^ALREADY RECONCILED/);expect(asked).toEqual([]);
 c.assertPrivate();
},60000);

test('refusals before anything starts: wrong digest, wrong account, readable or changed file, serve mode, foreign anchor, unsafe output, stray binding',async()=>{
 const root=await checkout(),persist=await mkdtemp(join(tmpdir(),'recovery-admin-refuse-'));await seed(persist);
 const custody=await outside(),file=join(custody,'checkpoint.json');await cli(root,launcher(persist)).run(['export','--account',account,'--out',file]);
 const {digest}=JSON.parse(await readFile(file,'utf8')),other='0'.repeat(64),otherAccount='dddddddd-dddd-4ddd-8ddd-dddddddddddd',calls=[];
 const c=cli(root,launcher(persist,{mode:'reconcile',anchor:digest},calls));
 await expect(c.run(['dry-run','--account',account,'--file',file,'--digest',other])).rejects.toThrow('does not match --digest');
 await expect(c.run(['reconcile','--account',otherAccount,'--file',file,'--digest',digest])).rejects.toThrow('another account');
 await expect(c.run(['verify','--file',file,'--digest',other])).rejects.toThrow('MISMATCH');
 await chmod(file,0o644);
 await expect(c.run(['dry-run','--account',account,'--file',file,'--digest',digest])).rejects.toThrow('not mode 0600');
 await expect(c.run(['verify','--file',file,'--digest',digest])).rejects.toThrow('not mode 0600');
 await chmod(file,0o600);
 const changed=join(custody,'changed.json'),envelope=JSON.parse(await readFile(file,'utf8'));envelope.checkpoint.lifecycle.deleted=false;await writeFile(changed,JSON.stringify(envelope),{mode:0o600});
 await expect(c.run(['dry-run','--account',account,'--file',changed,'--digest',digest])).rejects.toThrow('changed after export');
 await editVars(root,{RECOVERY_MODE:'serve'});
 await expect(c.run(['reconcile','--account',account,'--file',file,'--digest',digest])).rejects.toThrow('not in RECOVERY_MODE=reconcile');
 await editVars(root,{RECOVERY_MODE:'reconcile',RECOVERY_CHECKPOINT_SHA256:other});
 await expect(c.run(['dry-run','--account',account,'--file',file,'--digest',digest])).rejects.toThrow('anchor in the private lifecycle config');
 await editVars(root,{RECOVERY_CHECKPOINT_SHA256:digest});
 await expect(c.run(['export','--account',account,'--out',join(root,'checkpoint.json')])).rejects.toThrow('outside this checkout');
 await expect(c.run(['export','--account',account,'--out',file])).rejects.toThrow('already exists');
 await expect(c.run(['export','--account',account,'--out',join(custody,'missing-folder','x.json')])).rejects.toThrow('folder does not exist');
 await writeFile(join(root,'workers/recovery-admin/.dev.vars'),'ADMIN_SESSION_TOKEN=fixed\n',{mode:0o600});
 await expect(c.run(['status'])).rejects.toThrow('.dev.vars');
 await rm(join(root,'workers/recovery-admin/.dev.vars'));
 const market=join(root,privatePath(CONFIGS.market)),m=JSON5.parse(await readFile(market,'utf8'));m.services=[{binding:'RECOVERY',service:'zigoals-acctest-lifecycle',entrypoint:'LifecycleRecoveryAdmin'}];await writeFile(market,JSON.stringify(m),{mode:0o600});
 await expect(c.run(['export','--account',account,'--out',join(custody,'new.json')])).rejects.toThrow('binds the recovery admin entrypoint');
 await chmod(join(root,privatePath(ADMIN_CONFIG)),0o644);
 await expect(c.run(['status'])).rejects.toThrow('not mode 0600');
 expect(calls).toEqual([]);
 c.assertPrivate();
},60000);

test('Worker-side refusals: a foreign anchor, and a reconcile without both typed confirmations changes nothing',async()=>{
 const root=await checkout(),persist=await mkdtemp(join(tmpdir(),'recovery-admin-worker-'));await seed(persist);
 const file=join(await outside(),'checkpoint.json');await cli(root,launcher(persist)).run(['export','--account',account,'--out',file]);
 const {digest}=JSON.parse(await readFile(file,'utf8')),restored=await mkdtemp(join(tmpdir(),'recovery-admin-worker-restored-'));
 await expect(cli(root,launcher(restored,{mode:'reconcile',anchor:'f'.repeat(64)})).run(['dry-run','--account',account,'--file',file,'--digest',digest])).rejects.toThrow('not the anchor configured on the Worker');
 const anchored=launcher(restored,{mode:'reconcile',anchor:digest}),before=join(await outside(),'before.json');
 await cli(root,anchored).run(['export','--account',account,'--out',before]);
 for(const typed of [[],[account,''],[account,'1'.repeat(64)],[account.replace('a','d'),digest]]){
  const c=cli(root,anchored,answers(typed));
  await expect(c.run(['reconcile','--account',account,'--file',file,'--digest',digest])).rejects.toThrow(/needs both confirmations|does not match --account/);
 }
 const unchanged=join(await outside(),'unchanged.json');await cli(root,anchored).run(['export','--account',account,'--out',unchanged]);
 expect(JSON.parse(await readFile(unchanged,'utf8')).digest).toBe(JSON.parse(await readFile(before,'utf8')).digest);
 expect(JSON.parse(await readFile(unchanged,'utf8')).checkpoint.lifecycle.deleted).toBe(false);
},60000);

test('the admin Worker refuses requests without the session token, other paths, methods and bodies, and never reaches the ordinary service',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'recovery-admin-direct-')),token='t'.repeat(43),admin=await launcher(persist)({adminConfig:'x',token});
 try{
  expect(new URL(admin.url).hostname).toBe('127.0.0.1');
  expect((await adminCall(admin.url,'','/admin/export',{account})).status).toBe(403);
  expect((await adminCall(admin.url,'u'.repeat(43),'/admin/export',{account})).status).toBe(403);
  expect((await adminCall(admin.url,token,'/status')).json).toEqual({ok:true,service:'zigoals-recovery-admin'});
  expect((await adminCall(admin.url,token,'/admin/export')).status).toBe(403);
  expect((await adminCall(admin.url,token,'/admin/export',{account:account.toUpperCase()})).status).toBe(403);
  expect((await adminCall(admin.url,token,'/admin/export?x=1',{account})).status).toBe(404);
  expect((await adminCall(admin.url,token,'/account',{account})).status).toBe(404);
  expect((await adminCall(admin.url,token,'/admin/reconcile',{account})).status).toBe(405);
  expect((await adminCall(admin.url,token,'/admin/export',{account})).status).toBe(200);
  const text=await admin.mf.dispatchFetch(admin.url+'/admin/dry-run',{method:'POST',headers:{'x-admin-session':token,'x-verified-account':account,'content-type':'text/plain'},body:'{}'});expect(text.status).toBe(415);
  // The lifecycle Worker's public fetch stays closed.
  expect((await (await admin.mf.getWorker('lifecycle')).fetch('https://fixture/admin/export',{headers:{'x-verified-account':account,'x-lifecycle-recovery-admin':'1'}})).status).toBe(404);
 }finally{await admin.stop();}
 const unset=await (async()=>{const mf=await miniflare(persist,[{name:'recovery-admin',modules:true,script:adminScript,compatibilityDate,serviceBindings:{ADMIN:{name:'lifecycle',entrypoint:'LifecycleRecoveryAdmin'}}},await lifecycleWorker('serve')]);try{const res=await mf.dispatchFetch('http://127.0.0.1/status');await res.arrayBuffer();return res.status;}finally{await mf.dispose();}})();
 expect(unset).toBe(503);
},60000);

test('an output location that does not keep mode 0600 is refused and the file removed',async()=>{
 const root=await checkout(),dir=await outside(),file=join(dir,'checkpoint.json');
 const fs={...await import('node:fs')},loose={...fs,statSync:path=>{const info=fs.statSync(path);return {isFile:()=>info.isFile(),mode:info.mode|0o044};}};
 expect(()=>writeCheckpointFile(root,file,'{}',loose)).toThrow('did not keep the file private');expect(existsSync(file)).toBe(false);
 expect(writeCheckpointFile(root,file,'{}')).toBe(file);expect((await stat(file)).mode&0o777).toBe(0o600);
});

test('arguments: exact flags per command, lowercase UUID and digest, values never echoed',()=>{
 const digest='a'.repeat(64);
 expect(parseArgs(['status'])).toMatchObject({command:'status'});
 expect(parseArgs(['export','--account',account,'--out','/x/y.json'])).toEqual({command:'export',account,out:'/x/y.json',file:undefined,digest:undefined});
 expect(parseArgs(['reconcile','--file','f','--digest',digest,'--account',account])).toMatchObject({command:'reconcile',account,file:'f',digest});
 for(const argv of [[],['deploy'],['status','--account',account],['export','--account',account],['export','--account',account,'--out','f','--out','g'],['verify','--file','f','--digest',digest,'--token','x'],['export','--account','--out','f'],['dry-run','--account',account,'--file','f','--digest',digest,'extra']])expect(()=>parseArgs(argv),argv.join(' ')).toThrow('Usage');
 const upper=account.toUpperCase();let message='';try{parseArgs(['export','--account',upper,'--out','f']);}catch(error){message=error.message;}
 expect(message).toBe('--account must be the lowercase account UUID.');
 expect(()=>parseArgs(['verify','--file','f','--digest',digest.toUpperCase()])).toThrow('--digest must be');
 expect(()=>parseArgs(['verify','--file','f','--digest','abc'])).toThrow('--digest must be');
});

test('the committed rehearsal fixture is a valid fictional checkpoint that reconciles into an empty authority',async()=>{
 const fixture=join(repo,'scripts/run11/fixtures/recovery-rehearsal-checkpoint.json'),copy=join(await outside(),'rehearsal.json');
 await writeFile(copy,await readFile(fixture),{mode:0o600});
 const {checkpoint,digest}=readCheckpointFile(copy);
 expect(checkpoint).toMatchObject({account,lifecycle:{deleted:true,authorizedFamily:family},receipts:[{operation}]});
 const root=await checkout(),restored=await mkdtemp(join(tmpdir(),'recovery-admin-rehearsal-')),c=cli(root,launcher(restored,{mode:'reconcile',anchor:digest}),answers([account,digest]));
 await c.run(['verify','--file',copy,'--digest',digest]);
 await c.run(['reconcile','--account',account,'--file',copy,'--digest',digest]);expect(c.lines.at(-1)).toContain('Re-export digest matches');
 c.assertPrivate();
},60000);
