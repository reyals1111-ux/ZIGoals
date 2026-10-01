import {expect,test} from 'vitest';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,stat,chmod} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import JSON5 from 'json5';
import {CONFIGS,ADMIN_CONFIG,privatePath,privateFileProblems,validateAdminConfig,strayAdminBindings,checkAdmin,validatePrivateCopies} from './activation-check.mjs';
import {makePrivateConfigs,makeAdminConfig,parseArgs} from './make-private-configs.mjs';

// ADR-007 option A: the seventh, local-only recovery admin config. Runs in throwaway git repositories
// holding copies of the Worker configs and this .gitignore; all values are fictional.
const repo=resolve(import.meta.dirname,'../..');
const template=()=>JSON5.parse(readFileSync(join(repo,ADMIN_CONFIG),'utf8'));
const OTHER_CONFIGS=['apps/web/wrangler.alpha.jsonc','landing/wrangler.jsonc'];
async function sandbox(){
 const root=await mkdtemp(join(tmpdir(),'recovery-admin-config-'));execFileSync('git',['init','-q'],{cwd:root});
 for(const path of [...Object.values(CONFIGS),ADMIN_CONFIG,...OTHER_CONFIGS]){await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(repo,path),join(root,path));}
 await copyFile(join(repo,'.gitignore'),join(root,'.gitignore'));
 const policy=join(root,'policy.json');await writeFile(policy,JSON.stringify({resetTimeZone:'UTC',monthlyCredits:10000}));
 return {root,input:{authRef:'abcdefghijklmnopqrst',workersSubdomain:'fictional-team',appOrigin:'https://acctest.fictional-owner.net',namePrefix:'zigoals-acctest',marketAccountId:'fictional-account',marketPolicyFile:policy}};
}
const readJson=async(root,path)=>JSON5.parse(await readFile(join(root,path),'utf8'));

test('the reviewed template is local only, binds only the lifecycle recovery entrypoint remotely, and nothing else in the checkout binds it',()=>{
 const t=template();
 expect(validateAdminConfig(t,t,'zigoals-lifecycle-local')).toEqual([]);
 expect(t).toMatchObject({workers_dev:false,preview_urls:false,services:[{binding:'ADMIN',service:'zigoals-lifecycle-local',entrypoint:'LifecycleRecoveryAdmin',remote:true}]});
 expect(t.routes??t.route??t.triggers).toBeUndefined();
 expect(strayAdminBindings(repo)).toEqual([]);
});

test.each([
 ['a route',c=>{c.route='admin.example.net/*';}],
 ['routes',c=>{c.routes=[{pattern:'admin.example.net/*',zone_name:'example.net'}];}],
 ['workers.dev',c=>{c.workers_dev=true;}],
 ['a missing workers_dev',c=>{delete c.workers_dev;}],
 ['preview urls',c=>{c.preview_urls=true;}],
 ['a cron trigger',c=>{c.triggers={crons:['0 * * * *']};}],
 ['a queue consumer',c=>{c.queues={consumers:[{queue:'admin'}]};}],
 ['a KV binding',c=>{c.kv_namespaces=[{binding:'STORE',id:'x'}];}],
 ['a Durable Object',c=>{c.durable_objects={bindings:[{name:'X',class_name:'X'}]};}],
 ['vars',c=>{c.vars={ADMIN_SESSION_TOKEN:'fixed'};}],
 ['an account id',c=>{c.account_id='0123456789abcdef0123456789abcdef';}],
 ['a second service binding',c=>{c.services.push({binding:'SYNC',service:'zigoals-private-sync-local'});}],
 ['a local (non-remote) binding',c=>{c.services[0].remote=false;}],
 ['a missing remote flag',c=>{delete c.services[0].remote;}],
 ['the ordinary lifecycle entrypoint',c=>{c.services[0].entrypoint='LifecycleService';}],
 ['another service',c=>{c.services[0].service='zigoals-alpha';}],
 ['request logging',c=>{c.observability.enabled=true;}],
 ['the Alpha name',c=>{c.name='zigoals-alpha';}],
 ['another main module',c=>{c.main='../private-sync/lifecycle.mjs';}],
])('the admin check rejects %s',(_,mutate)=>{const c=template();mutate(c);expect(validateAdminConfig(c,template(),'zigoals-lifecycle-local').length).toBeGreaterThan(0);});

test.each([...Object.values(CONFIGS),...OTHER_CONFIGS])('a recovery admin binding added to %s is reported',async path=>{
 const {root}=await sandbox();expect(strayAdminBindings(root)).toEqual([]);
 const c=await readJson(root,path);c.services=[...(c.services??[]),{binding:'RECOVERY',service:'zigoals-lifecycle-local',entrypoint:'LifecycleRecoveryAdmin'}];
 await writeFile(join(root,path),JSON.stringify(c));
 expect(strayAdminBindings(root)).toEqual([path+': binds the recovery admin entrypoint; only the local recovery-admin config may.']);
});

test('generates the seventh copy after Stage 4: ignored, 0600, bound to the private lifecycle Worker, passing the admin check',async()=>{
 const {root,input}=await sandbox();makePrivateConfigs(root,input);
 const line=makeAdminConfig(root),path=privatePath(ADMIN_CONFIG),full=join(root,path);
 expect(path).toBe('workers/recovery-admin/wrangler.acctest.owner.jsonc');
 expect((await stat(full)).mode&0o777).toBe(0o600);expect(spawnSync('git',['check-ignore','-q',full],{cwd:root}).status).toBe(0);expect(privateFileProblems(root,path)).toEqual([]);
 const copy=await readJson(root,path);
 expect(copy).toEqual({...template(),name:'zigoals-acctest-recovery-admin-local-only',services:[{binding:'ADMIN',service:'zigoals-acctest-lifecycle',entrypoint:'LifecycleRecoveryAdmin',remote:true}]});
 expect(validateAdminConfig(copy,template(),'zigoals-acctest-lifecycle',{privateCopy:true})).toEqual([]);
 expect(checkAdmin(root)).toMatch(/^PASS/);
 for(const value of ['abcdefghijklmnopqrst','fictional'])expect(line).not.toContain(value);
 // The six runtime copies are unchanged by it and still pass.
 const load=async pathOf=>Object.fromEntries(await Promise.all(Object.entries(CONFIGS).map(async([k,p])=>[k,await readJson(root,pathOf(p))])));
 expect(validatePrivateCopies(await load(privatePath),await load(p=>p))).toEqual([]);
});

test('refuses before the Stage 4 copies exist, and never overwrites an existing admin copy',async()=>{
 const {root,input}=await sandbox(),target=join(root,privatePath(ADMIN_CONFIG));
 expect(()=>makeAdminConfig(root)).toThrow('Stage 4');expect(existsSync(target)).toBe(false);
 makePrivateConfigs(root,input);await writeFile(target,'{"owner":"edits"}',{mode:0o600});
 expect(()=>makeAdminConfig(root)).toThrow('Refusing to overwrite');expect(await readFile(target,'utf8')).toBe('{"owner":"edits"}');
});

test('refuses when the lifecycle copy is readable by others',async()=>{
 const {root,input}=await sandbox();makePrivateConfigs(root,input);await chmod(join(root,privatePath(CONFIGS.lifecycle)),0o644);
 expect(()=>makeAdminConfig(root)).toThrow('not mode 0600');expect(existsSync(join(root,privatePath(ADMIN_CONFIG)))).toBe(false);
});

test.each([
 ['a readable admin copy',async(root,path)=>{await chmod(join(root,path),0o644);},'not mode 0600'],
 ['an admin copy aimed at another Worker',async(root,path)=>{const c=await readJson(root,path);c.services[0].service='zigoals-acctest-private-sync';await writeFile(join(root,path),JSON.stringify(c),{mode:0o600});},'exactly one remote ADMIN binding'],
 ['a route in the admin copy',async(root,path)=>{const c=await readJson(root,path);c.routes=['admin.fictional-owner.net/*'];await writeFile(join(root,path),JSON.stringify(c),{mode:0o600});},'remove routes'],
 ['a stray binding in the private app copy',async root=>{const p=privatePath(CONFIGS.app),c=await readJson(root,p);c.services.push({binding:'RECOVERY',service:'zigoals-acctest-lifecycle',entrypoint:'LifecycleRecoveryAdmin'});await writeFile(join(root,p),JSON.stringify(c),{mode:0o600});},'apps/web/wrangler.run11.acctest.owner.jsonc: binds the recovery admin entrypoint'],
 ['private sync bound to another lifecycle Worker',async root=>{const p=privatePath(CONFIGS.private),c=await readJson(root,p);c.services[0].service='zigoals-other-lifecycle';await writeFile(join(root,p),JSON.stringify(c),{mode:0o600});},'private sync must bind the same lifecycle Worker'],
])('the --admin check rejects %s',async(_,mutate,message)=>{
 const {root,input}=await sandbox();makePrivateConfigs(root,input);makeAdminConfig(root);
 await mutate(root,privatePath(ADMIN_CONFIG));expect(()=>checkAdmin(root)).toThrow(message);
});

test('the --private check reports a missing admin copy as optional; --admin requires it',async()=>{
 const {root,input}=await sandbox();makePrivateConfigs(root,input);
 expect(checkAdmin(root,{required:false})).toMatch(/no private copy yet/);
 expect(()=>checkAdmin(root)).toThrow('missing');
});

test('the generator flag stands alone',()=>{
 expect(parseArgs(['--recovery-admin'])).toEqual({recoveryAdmin:true});
 expect(()=>parseArgs(['--recovery-admin','--name-prefix','x'])).toThrow('Usage');
});
