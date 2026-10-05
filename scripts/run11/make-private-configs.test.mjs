import {expect,test} from 'vitest';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,stat,chmod} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import JSON5 from 'json5';
import {makePrivateConfigs,parseArgs} from './make-private-configs.mjs';
import {CONFIGS,privatePath,privateFileProblems,validatePrivateCopies} from './activation-check.mjs';

// Runs in a throwaway git repository holding copies of the six templates and this .gitignore,
// so nothing is ever written into the real checkout. All values are fictional.
const repo=resolve(import.meta.dirname,'../..');
async function sandbox({gitignore=true}={}){
 const root=await mkdtemp(join(tmpdir(),'private-configs-'));execFileSync('git',['init','-q'],{cwd:root});
 for(const path of Object.values(CONFIGS)){await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(repo,path),join(root,path));}
 if(gitignore)await copyFile(join(repo,'.gitignore'),join(root,'.gitignore'));
 const policy=join(root,'policy.json');await writeFile(policy,JSON.stringify({resetTimeZone:'UTC',monthlyCredits:10000}));
 return {root,input:{authRef:'abcdefghijklmnopqrst',workersSubdomain:'fictional-team',appOrigin:'https://acctest.fictional-owner.net',namePrefix:'zigoals-acctest',marketAccountId:'fictional-account',marketPolicyFile:policy}};
}
const read=async(root,path)=>JSON5.parse(await readFile(join(root,path),'utf8'));
const load=async(root,pathOf)=>Object.fromEntries(await Promise.all(Object.entries(CONFIGS).map(async([k,p])=>[k,await read(root,pathOf(p))])));

test('writes six ignored 0600 copies that pass the private check and keep every reviewed field',async()=>{
 const {root,input}=await sandbox(),lines=makePrivateConfigs(root,input);
 for(const path of Object.values(CONFIGS)){const full=join(root,privatePath(path));expect((await stat(full)).mode&0o777).toBe(0o600);expect(spawnSync('git',['check-ignore','-q',full],{cwd:root}).status).toBe(0);expect(privateFileProblems(root,privatePath(path))).toEqual([]);}
 const copies=await load(root,privatePath),templates=await load(root,p=>p);
 expect(validatePrivateCopies(copies,templates)).toEqual([]);
 expect(Object.values(copies).map(c=>c.name)).toEqual(['zigoals-acctest-run11','zigoals-acctest-private-sync','zigoals-acctest-lifecycle','zigoals-acctest-market-coordinator','zigoals-acctest-food-lookup','zigoals-acctest-auth-abuse']);
 expect(copies.app.vars).toEqual({ZIGOALS_MARKET_QUOTES_MODE:'durable-v1',ZIGOALS_AUTH_ORIGIN:'https://abcdefghijklmnopqrst.supabase.co',ZIGOALS_SYNC_ORIGIN:'https://zigoals-acctest-private-sync.fictional-team.workers.dev'});
 expect(copies.lifecycle.vars).toEqual({AUTH_ORIGIN:'https://abcdefghijklmnopqrst.supabase.co',RECOVERY_MODE:'reconcile'});
 expect(JSON.parse(copies.market.vars.MARKET_POLICY)).toEqual({resetTimeZone:'UTC',monthlyCredits:10000});
 expect(copies.app.services.map(s=>s.service)).toEqual(['zigoals-acctest-run11','zigoals-acctest-market-coordinator','zigoals-acctest-private-sync','zigoals-acctest-food-lookup','zigoals-acctest-auth-abuse']);
 for(const kind of Object.keys(CONFIGS))for(const field of ['main','compatibility_date','durable_objects','migrations','workers_dev','preview_urls'])expect(copies[kind][field],kind+' '+field).toEqual(templates[kind][field]);
 // The summary names what changed, never a value.
 const printed=lines.join('\n');for(const value of ['abcdefghijklmnopqrst','fictional-account','fictional-owner','monthlyCredits'])expect(printed).not.toContain(value);
 expect(printed).toContain('vars set: MARKET_QUOTE_DISPATCH, MARKET_ACCOUNT_ID, MARKET_POLICY (values not printed)');
});

test('refuses to overwrite and writes nothing when any copy already exists',async()=>{
 const {root,input}=await sandbox(),existing=join(root,privatePath(CONFIGS.food));await writeFile(existing,'{"owner":"edits"}',{mode:0o600});
 expect(()=>makePrivateConfigs(root,input)).toThrow('Refusing to overwrite');
 expect(await readFile(existing,'utf8')).toBe('{"owner":"edits"}');
 for(const [kind,path]of Object.entries(CONFIGS))if(kind!=='food')expect(existsSync(join(root,privatePath(path)))).toBe(false);
});

test('writes nothing when git would not ignore the copies',async()=>{
 const {root,input}=await sandbox({gitignore:false});
 expect(()=>makePrivateConfigs(root,input)).toThrow('git would not ignore');
 for(const path of Object.values(CONFIGS))expect(existsSync(join(root,privatePath(path)))).toBe(false);
});

test.each([
 ['http app origin',{appOrigin:'http://acctest.fictional-owner.net'}],['app origin with a path',{appOrigin:'https://acctest.fictional-owner.net/app'}],
 ['uppercase auth ref',{authRef:'ABCDEFGHIJKLMNOPQRST'}],['alpha name',{namePrefix:'zigoals-alpha'}],['local name',{namePrefix:'zigoals-local'}],
 ['bad subdomain',{workersSubdomain:'-team'}],['bad account id',{marketAccountId:'has space'}],
])('rejects %s and writes nothing',async(_,change)=>{
 const {root,input}=await sandbox();expect(()=>makePrivateConfigs(root,{...input,...change})).toThrow();
 for(const path of Object.values(CONFIGS))expect(existsSync(join(root,privatePath(path)))).toBe(false);
});

test('rejects a market policy file that is not a JSON object',async()=>{
 const {root,input}=await sandbox();await writeFile(input.marketPolicyFile,'[1,2]');
 expect(()=>makePrivateConfigs(root,input)).toThrow('JSON object');
});

test('the CLI accepts exactly the six flags and nothing secret-shaped',()=>{
 const argv=['--auth-ref','a','--workers-subdomain','b','--app-origin','c','--name-prefix','d','--market-account-id','e','--market-policy-file','f'];
 expect(parseArgs(argv)).toEqual({authRef:'a',workersSubdomain:'b',appOrigin:'c',namePrefix:'d',marketAccountId:'e',marketPolicyFile:'f'});
 expect(()=>parseArgs([...argv,'--auth-key','x'])).toThrow('Usage');expect(()=>parseArgs(argv.slice(2))).toThrow('Usage');
});

test.each([
 ['placeholder',c=>{c.private.vars.APP_ORIGIN='http://127.0.0.1:3110';}],
 ['http origin',c=>{c.lifecycle.vars.AUTH_ORIGIN='http://abcdefghijklmnopqrst.supabase.co';}],
 ['changed migration',c=>{c.market.migrations=[{tag:'v2',new_sqlite_classes:['MarketAccount']}];}],
 ['changed class',c=>{c.food.durable_objects.bindings[0].class_name='Renamed';}],
 ['changed compatibility date',c=>{c.admission.compatibility_date='2026-10-01';}],
 ['public workers.dev',c=>{c.app.workers_dev=true;}],
 ['preview urls',c=>{c.private.preview_urls=true;}],
 ['inconsistent name',c=>{c.food.name='someone-else-food-lookup';}],
 ['mismatched auth origin',c=>{c.app.vars.ZIGOALS_AUTH_ORIGIN='https://zyxwvutsrqponmlkjihg.supabase.co';}],
 ['credential var',c=>{c.market.vars.COINGECKO_DEMO_API_KEY='not-a-real-key';}],
 ['serving lifecycle',c=>{c.lifecycle.vars.RECOVERY_MODE='serve';}],
 // Session U Part 5: the fixture clock never reaches an owner config (private sync's sweep, food, market).
 ['test clock on private sync',c=>{c.private.vars.ISOLATED_FIXTURE='true';}],
 ['test time on private sync',c=>{c.private.vars.LOCAL_TEST_NOW='1791158400000';}],
 ['test alarm spacing on food',c=>{c.food.vars={...c.food.vars,LOCAL_SWEEP_MS:'200'};}],
 ['test clock on the market coordinator',c=>{c.market.vars.ISOLATED_FIXTURE='true';}],
])('the private check rejects a %s',async(_,mutate)=>{
 const {root,input}=await sandbox();makePrivateConfigs(root,input);
 const copies=await load(root,privatePath),templates=await load(root,p=>p);mutate(copies);
 expect(validatePrivateCopies(copies,templates).length).toBeGreaterThan(0);
});

test('the private file check reports a readable file and a missing copy',async()=>{
 const {root,input}=await sandbox();makePrivateConfigs(root,input);
 const path=privatePath(CONFIGS.app);await chmod(join(root,path),0o644);
 expect(privateFileProblems(root,path)).toEqual(['not mode 0600']);
 expect(privateFileProblems(root,'apps/web/missing.acctest.owner.jsonc')).toEqual(['missing']);
});
