import {expect,test} from 'vitest';
import {mkdtemp,mkdir,copyFile,readFile,writeFile,chmod} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
import JSON5 from 'json5';
import {CONFIGS,ADMIN_CONFIG,privatePath} from './activation-check.mjs';
import {makePrivateConfigs,makeAdminConfig} from './make-private-configs.mjs';
import {preflight,report,STAGE7_SECRETS} from './stage7-preflight.mjs';

// A throwaway ops checkout: the reviewed templates and pins committed on main, plus the seven ignored owner configs
// with fictional values. Tool versions are injected; nothing runs wrangler or reaches a network.
const repo=resolve(import.meta.dirname,'../..'),FILES=[...Object.values(CONFIGS),ADMIN_CONFIG,'.gitignore','.node-version','package.json','apps/web/package.json'];
const git=(root,...args)=>execFileSync('git',['-c','user.name=fixture','-c','user.email=fixture@example.invalid',...args],{cwd:root,encoding:'utf8'}).trim();
const tools=preparationCommit=>({node:()=>'24.19.0',pnpm:()=>'11.19.0',wrangler:()=>'4.144.0',preparationCommit});
const values=['abcdefghijklmnopqrst','fictional-team','acctest.fictional-owner.net','fictional-account','resetTimeZone'];
async function opsCheckout({policy={resetTimeZone:'UTC',monthlyCredits:10000}}={}){
 const root=await mkdtemp(join(tmpdir(),'stage7-preflight-'));git(root,'init','-q','-b','main');
 for(const path of FILES){await mkdir(dirname(join(root,path)),{recursive:true});await copyFile(join(repo,path),join(root,path));}
 git(root,'add','-A');git(root,'commit','-q','-m','reviewed source');
 const policyFile=join(await mkdtemp(join(tmpdir(),'stage7-policy-')),'policy.json');await writeFile(policyFile,JSON.stringify(policy));
 makePrivateConfigs(root,{authRef:'abcdefghijklmnopqrst',workersSubdomain:'fictional-team',appOrigin:'https://acctest.fictional-owner.net',namePrefix:'zigoals-acctest',marketAccountId:'fictional-account',marketPolicyFile:policyFile});
 makeAdminConfig(root);
 return {root,first:git(root,'rev-parse','HEAD')};
}
const statuses=result=>Object.fromEntries(result.checks.map(c=>[c.label,c.status]));

test('a ready ops checkout passes every check, and the report names secrets and files but no value',async()=>{
 const {root,first}=await opsCheckout(),result=preflight(root,tools(first));
 expect(result.checks.filter(c=>c.status!=='PASS')).toEqual([]);expect(result.ok).toBe(true);
 const text=report(result);
 for(const {name,config} of STAGE7_SECRETS){expect(text).toContain(`wrangler secret put ${name} --config "$PWD/${privatePath(config)}"`);}
 expect(STAGE7_SECRETS.map(s=>s.name)).toEqual(['ZIGOALS_AUTH_PUBLIC_KEY','AUTH_PUBLIC_KEY','AUTH_ADMIN_KEY','COINGECKO_DEMO_API_KEY','AUTH_ADMISSION_KEY']);
 for(const value of values)expect(text).not.toContain(value);
 expect(text).toMatch(/Stage 7 preflight: READY\. Nothing was contacted; no values were printed\.$/);
});

test('an unconfirmed MARKET_POLICY is reported as the known Stage 6 item and does not block',async()=>{
 const {root,first}=await opsCheckout(),market=join(root,privatePath(CONFIGS.market)),c=JSON5.parse(await readFile(market,'utf8'));
 c.vars.MARKET_POLICY='unconfigured';await writeFile(market,JSON.stringify(c),{mode:0o600});
 const result=preflight(root,tools(first));
 expect(result.ok).toBe(true);expect(result.checks.filter(c=>c.status==='KNOWN').map(c=>c.label)).toEqual(['Stage 6: confirmed MARKET_POLICY','Stage 6: confirmed MARKET_POLICY']);
 expect(report(result)).toContain('READY (known Stage 6 items listed)');
});

test.each([
 ['an uncommitted change',async root=>{await writeFile(join(root,'notes.txt'),'draft');},'git: working tree is clean'],
 ['a HEAD that does not contain main',async root=>{git(root,'checkout','-q','-b','old','HEAD');git(root,'checkout','-q','main');await writeFile(join(root,'next.txt'),'x');git(root,'add','next.txt');git(root,'commit','-q','-m','main moves');git(root,'checkout','-q','old');},'git: HEAD contains main'],
 ['a readable private config',async root=>{await chmod(join(root,privatePath(CONFIGS.food)),0o644);},'private configs: seven ignored 0600 files'],
 ['a missing recovery admin config',async root=>{execFileSync('rm',[join(root,privatePath(ADMIN_CONFIG))]);},'private configs: seven ignored 0600 files'],
 ['a serving lifecycle Worker',async root=>{const p=join(root,privatePath(CONFIGS.lifecycle)),c=JSON5.parse(await readFile(p,'utf8'));c.vars.RECOVERY_MODE='serve';await writeFile(p,JSON.stringify(c),{mode:0o600});},'lifecycle: RECOVERY_MODE=reconcile'],
 ['a route on the recovery admin config',async root=>{const p=join(root,privatePath(ADMIN_CONFIG)),c=JSON5.parse(await readFile(p,'utf8'));c.routes=['admin.fictional-owner.net/*'];await writeFile(p,JSON.stringify(c),{mode:0o600});},'recovery admin config is safe (activation-check --admin)'],
 ['a placeholder origin',async root=>{const p=join(root,privatePath(CONFIGS.private)),c=JSON5.parse(await readFile(p,'utf8'));c.vars.APP_ORIGIN='http://127.0.0.1:3110';await writeFile(p,JSON.stringify(c),{mode:0o600});},'activation-check --private'],
])('%s is not ready',async(_,mutate,label)=>{
 const {root,first}=await opsCheckout();await mutate(root);
 const result=preflight(root,tools(first));
 expect(result.ok).toBe(false);expect(statuses(result)[label]).toBe('FAIL');
 const text=report(result);expect(text).toMatch(/NOT READY/);for(const value of values)expect(text).not.toContain(value);
});

test('wrong tool versions and a shallow history fail with what the repository pins',async()=>{
 const {root}=await opsCheckout(),result=preflight(root,{node:()=>'22.22.0',pnpm:()=>null,wrangler:()=>'4.131.1',preparationCommit:'0'.repeat(40)});
 expect(statuses(result)).toMatchObject({'node version':'FAIL','pnpm version':'FAIL','wrangler version':'FAIL','git: full clone containing the preparation commit':'FAIL'});
 expect(report(result)).toContain('22.22.0; the repository pins 24.19.0');expect(report(result)).toContain('not found; the repository pins 11.19.0');
});
