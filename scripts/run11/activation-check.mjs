#!/usr/bin/env node
import {readFileSync,existsSync,realpathSync,statSync,lstatSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import JSON5 from 'json5';
export const CONFIGS={app:'apps/web/wrangler.run11.local.jsonc',private:'workers/private-sync/wrangler.local.jsonc',lifecycle:'workers/private-sync/wrangler.lifecycle.local.jsonc',market:'workers/market-coordinator/wrangler.local.jsonc',food:'workers/food-lookup/wrangler.local.jsonc',admission:'workers/auth-abuse/wrangler.local.jsonc'};
export function validateTopology(configs,{privateCopies=false}={}){
 const errors=[],names=Object.values(configs).map(v=>v.name);
 if(new Set(names).size!==6)errors.push('Service names must be unique.');
 for(const [kind,c]of Object.entries(configs)){
  if(!(privateCopies?/^[a-z][a-z0-9-]{2,62}$/.test(c.name??'')&&!/-local$/.test(c.name):/^zigoals-[a-z0-9-]+-local$/.test(c.name??''))||c.name==='zigoals-alpha'||c.routes||c.route||c.account_id||c.workers_dev!==false||c.preview_urls!==false)errors.push(kind+': isolated nonpublic target required.');
  if(c.compatibility_date!=='2026-09-13')errors.push(kind+': reviewed compatibility date required.');
  if(c.observability?.enabled!==false)errors.push(kind+': request logging must stay disabled.');
  if(Object.keys(c.vars??{}).some(k=>/key|secret|token|password/i.test(k)))errors.push(kind+': credential values do not belong in templates.');
  if(kind!=='app'){const binding={private:['VAULTS','PrivateVault'],lifecycle:['LIFECYCLES','LifecycleAuthority'],market:['MARKETS','MarketAccount'],food:['FOOD_BUDGET','FoodBudget'],admission:['ADMISSION','AdmissionAuthority']}[kind];if(!c.durable_objects?.bindings?.some(v=>v.name===binding[0]&&v.class_name===binding[1])||!c.migrations?.some(m=>m.new_sqlite_classes?.includes(binding[1])))errors.push(kind+': SQLite binding/migration missing.');}
 }
 const expectBinding=(c,binding,service,entrypoint)=>{if(!c.services?.some(s=>s.binding===binding&&s.service===service&&s.entrypoint===entrypoint))errors.push(binding+': service topology mismatch.');};
 expectBinding(configs.app,'WORKER_SELF_REFERENCE',configs.app.name,undefined);expectBinding(configs.app,'MARKET_QUOTES',configs.market.name,'QuoteService');expectBinding(configs.app,'PRIVATE_SYNC',configs.private.name,undefined);expectBinding(configs.app,'FOOD_LOOKUP',configs.food.name,undefined);expectBinding(configs.app,'AUTH_ABUSE',configs.admission.name,'AdmissionService');expectBinding(configs.private,'LIFECYCLE',configs.lifecycle.name,'LifecycleService');
 if(Object.values(configs).some(c=>c.services?.some(s=>s.entrypoint==='LifecycleRecoveryAdmin')))errors.push('Recovery administration must remain unbound in runtime templates.');
 // lifecycle.mjs deletes provider identities at AUTH_ORIGIN; it must name the same provider as private sync.
 if(typeof configs.lifecycle.vars?.AUTH_ORIGIN!=='string'||configs.lifecycle.vars.AUTH_ORIGIN!==configs.private.vars?.AUTH_ORIGIN)errors.push('lifecycle: AUTH_ORIGIN must match private sync.');
 if(configs.lifecycle.vars?.RECOVERY_MODE!=='reconcile')errors.push('Lifecycle activation requires an explicit reviewed transition from reconcile.');
 return errors;
}
// Private copies (Stage 4): the six templates with ".local" replaced by ".acctest.owner", kept inside
// this checkout, ignored and 0600 (the pre-Run11 setup checker refuses anything else).
export const privatePath=path=>path.replace(/\.local\.jsonc$/,'.acctest.owner.jsonc');
const PLACEHOLDER=/unconfigured|127\.0\.0\.1|localhost|example\.(com|org|invalid)/i;
const exactHttps=value=>{try{const url=new URL(value);return url.protocol==='https:'&&url.origin===value;}catch{return false;}};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** Checks the private copies against their templates. Messages never include var values. */
export function validatePrivateCopies(copies,templates){
 const errors=validateTopology(copies,{privateCopies:true}),names=Object.values(copies).map(c=>c.name);
 const prefix=names[0]?.slice(0,names[0].length-'run11'.length-1);
 for(const [kind,c]of Object.entries(copies)){
  const t=templates[kind],expected=prefix+'-'+t.name.slice('zigoals-'.length,-'-local'.length);
  if(c.name!==expected)errors.push(kind+': name must share the reviewed prefix of the app Worker.');
  for(const field of ['main','compatibility_date','compatibility_flags','durable_objects','migrations','workers_dev','preview_urls','limits','assets'])if(!same(c[field],t[field]))errors.push(kind+': '+field+' differs from the reviewed template.');
  for(const [name,value]of Object.entries(c.vars??{}))if(typeof value!=='string'||PLACEHOLDER.test(value))errors.push(kind+': '+name+' is still a placeholder.');
  if(!same(Object.keys(t.vars??{}).filter(k=>!(k in(c.vars??{}))),[]))errors.push(kind+': a template var is missing.');
 }
 const a=copies.app.vars??{},p=copies.private.vars??{},l=copies.lifecycle.vars??{},m=copies.market.vars??{};
 for(const [kind,name,value]of [['app','ZIGOALS_AUTH_ORIGIN',a.ZIGOALS_AUTH_ORIGIN],['app','ZIGOALS_SYNC_ORIGIN',a.ZIGOALS_SYNC_ORIGIN],['private','AUTH_ORIGIN',p.AUTH_ORIGIN],['private','APP_ORIGIN',p.APP_ORIGIN],['lifecycle','AUTH_ORIGIN',l.AUTH_ORIGIN]])if(!exactHttps(value))errors.push(kind+': '+name+' must be an exact https origin.');
 if(a.ZIGOALS_AUTH_ORIGIN!==p.AUTH_ORIGIN)errors.push('app: ZIGOALS_AUTH_ORIGIN must match private sync AUTH_ORIGIN.');
 if(typeof a.ZIGOALS_SYNC_ORIGIN!=='string'||!a.ZIGOALS_SYNC_ORIGIN.startsWith('https://'+copies.private.name+'.'))errors.push('app: ZIGOALS_SYNC_ORIGIN must name the private sync Worker.');
 if(m.MARKET_QUOTE_DISPATCH!=='durable-v1'||typeof m.MARKET_ACCOUNT_ID!=='string'||!m.MARKET_ACCOUNT_ID)errors.push('market: MARKET_QUOTE_DISPATCH and MARKET_ACCOUNT_ID are required.');
 try{const policy=JSON.parse(m.MARKET_POLICY);if(!policy||typeof policy!=='object'||Array.isArray(policy))throw Error();}catch{errors.push('market: MARKET_POLICY must be a JSON object.');}
 return errors;
}
/** File checks for a private copy: inside the checkout, a regular 0600 file, ignored by git. */
export function privateFileProblems(root,path){
 const base=realpathSync(root),full=resolve(root,path);
 if(!existsSync(full))return ['missing'];
 const actual=realpathSync(full),info=statSync(actual),problems=[];
 if(!actual.startsWith(base+'/'))problems.push('outside the checkout');
 if(!info.isFile()||info.size>65536)problems.push('not a small regular file');
 if(info.mode&0o077)problems.push('not mode 0600');
 if(spawnSync('git',['check-ignore','-q',full],{cwd:base}).status!==0)problems.push('not ignored by git');
 return problems;
}
// Owner recovery administration (ADR-007 option A): a seventh, local-only config that is never deployed and
// never part of the runtime topology above. Its private copy is privatePath(ADMIN_CONFIG).
export const ADMIN_CONFIG='workers/recovery-admin/wrangler.local.jsonc';
const ADMIN_FIELDS=['$schema','name','main','compatibility_date','workers_dev','preview_urls','services','observability'];
/** The lifecycle Worker a recovery-admin config may target: the private lifecycle copy, never a template or the Alpha. */
export function lifecycleTargetProblems(lifecycle){
 const problems=[];
 if(!/^[a-z][a-z0-9-]{2,62}$/.test(lifecycle?.name??'')||!lifecycle.name.endsWith('-lifecycle')||/-local$/.test(lifecycle.name)||lifecycle.name==='zigoals-alpha')problems.push('lifecycle: the private lifecycle Worker name is required.');
 if(lifecycle?.main!=='lifecycle.mjs'||!lifecycle.durable_objects?.bindings?.some(b=>b.name==='LIFECYCLES'&&b.class_name==='LifecycleAuthority'))problems.push('lifecycle: the target is not the lifecycle authority Worker.');
 return problems;
}
/** Local only: no routes, workers.dev, preview URLs, triggers, vars or other bindings; exactly one remote ADMIN
 * binding to the lifecycle Worker's LifecycleRecoveryAdmin entrypoint. Messages name fields, never values. */
export function validateAdminConfig(c,template,lifecycleName,{privateCopy=false}={}){
 const errors=[],extra=Object.keys(c??{}).filter(k=>!ADMIN_FIELDS.includes(k));
 if(extra.length)errors.push('recovery-admin: local-only Worker; remove '+extra.join(', ')+' (no routes, triggers, vars, account or other bindings).');
 const name=privateCopy?String(lifecycleName).replace(/-lifecycle$/,'')+'-recovery-admin-local-only':'zigoals-recovery-admin-local-only';
 if(c?.name!==name||c.name==='zigoals-alpha')errors.push('recovery-admin: name must be the lifecycle prefix plus "-recovery-admin-local-only".');
 if(c?.workers_dev!==false||c?.preview_urls!==false)errors.push('recovery-admin: workers.dev and preview URLs must be disabled.');
 if(c?.main!==template.main||c?.compatibility_date!==template.compatibility_date)errors.push('recovery-admin: main and compatibility date must match the reviewed template.');
 if(c?.observability?.enabled!==false)errors.push('recovery-admin: request logging must stay disabled.');
 const s=c?.services;
 if(!Array.isArray(s)||s.length!==1||Object.keys(s[0]??{}).sort().join()!=='binding,entrypoint,remote,service'||s[0].binding!=='ADMIN'||s[0].service!==lifecycleName||s[0].entrypoint!=='LifecycleRecoveryAdmin'||s[0].remote!==true)errors.push("recovery-admin: exactly one remote ADMIN binding to the lifecycle Worker's LifecycleRecoveryAdmin entrypoint is required.");
 return errors;
}
/** Worker configs in the checkout (tracked, new, or ignored owner copies) that name the recovery-admin entrypoint,
 * other than the admin template and its private copy. Text match, so TOML and comments count too.
 * `git ls-files -o` also returns nested repositories (old worktrees, .toolchain/advisory-db/) as directory entries
 * ending in "/"; those and other non-files are skipped. A symlink is read when it leads to a regular file, and an
 * unreadable regular file still throws, so the check fails closed. */
export function strayAdminBindings(root){
 const list=args=>execFileSync('git',['ls-files','-z',...args],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
 const configs=[...list(['-c','-o','--exclude-standard','--','*.jsonc','*.toml','*wrangler*.json']),...list(['-o','-i','--exclude-standard','--','*.owner.jsonc','*.owner.json','*.owner.toml'])];
 const regularFile=p=>{
  if(p.endsWith('/'))return false;
  const full=resolve(root,p),entry=lstatSync(full);
  if(entry.isFile())return true;
  if(!entry.isSymbolicLink())return false;
  try{return statSync(full).isFile();}catch(error){if(error?.code==='ENOENT')return false;throw error;}
 };
 return [...new Set(configs)].filter(p=>p!==ADMIN_CONFIG&&p!==privatePath(ADMIN_CONFIG)&&regularFile(p)&&readFileSync(resolve(root,p),'utf8').includes('LifecycleRecoveryAdmin')).map(p=>p+': binds the recovery admin entrypoint; only the local recovery-admin config may.');
}
/** Stage 5 check of the private recovery admin copy against the private lifecycle and private-sync copies. */
export function checkAdmin(root,{required=true}={}){
 const path=privatePath(ADMIN_CONFIG),lifecycle=privatePath(CONFIGS.lifecycle),sync=privatePath(CONFIGS.private);
 if(!required&&!existsSync(resolve(root,path)))return 'Recovery admin: no private copy yet (Stage 5; create it with make-private-configs.mjs --recovery-admin).';
 const problems=[path,lifecycle,sync].flatMap(p=>privateFileProblems(root,p).map(x=>p+': '+x));
 if(problems.length)throw Error(problems.join('\n'));
 const read=p=>JSON5.parse(readFileSync(resolve(root,p),'utf8')),l=read(lifecycle);
 const errors=[...lifecycleTargetProblems(l),...validateAdminConfig(read(path),read(ADMIN_CONFIG),l.name,{privateCopy:true}),...strayAdminBindings(root)];
 if(!read(sync).services?.some(s=>s.binding==='LIFECYCLE'&&s.service===l.name&&s.entrypoint==='LifecycleService'))errors.push('recovery-admin: private sync must bind the same lifecycle Worker.');
 if(errors.length)throw Error(errors.join('\n'));
 return 'PASS: the recovery admin copy is an ignored 0600 local-only config (no routes, workers.dev, preview URLs or triggers) with one remote ADMIN binding to the private lifecycle Worker; no other config binds the entrypoint. Values not printed.';
}
function checkPrivate(root){
 const read=p=>JSON5.parse(readFileSync(resolve(root,p),'utf8')),problems=[];
 for(const path of Object.values(CONFIGS))for(const problem of privateFileProblems(root,privatePath(path)))problems.push(privatePath(path)+': '+problem);
 if(problems.length)throw Error(problems.join('\n'));
 const errors=validatePrivateCopies(Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,read(privatePath(p))])),Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,read(p)])));
 if(errors.length)throw Error(errors.join('\n'));
 console.log('PASS: six private copies are ignored 0600 files with consistent names, exact https origins, no placeholders and unchanged classes, migrations and compatibility dates. Values not printed.');
 console.log(checkAdmin(root,{required:false}));
}
function main(){
 if(process.argv.length===3&&process.argv[2]==='--private'){checkPrivate(resolve(dirname(fileURLToPath(import.meta.url)),'../..'));return;}
 if(process.argv.length===3&&process.argv[2]==='--admin'){console.log(checkAdmin(resolve(dirname(fileURLToPath(import.meta.url)),'../..')));return;}
 const args=process.argv.slice(2),dry=args.includes('--dry-run'),index=args.indexOf('--source'),source=index>=0?args[index+1]:undefined;
 if(!source||!/^[a-f0-9]{40}$/.test(source)||args.some((a,i)=>a!=='--dry-run'&&a!=='--source'&&i!==index+1)){console.error('Usage: node scripts/run11/activation-check.mjs --source <exact-commit> [--dry-run] | --private | --admin');process.exitCode=2;return;}
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 if(head!==source||spawnSync('git',['merge-base','--is-ancestor','3ca2f42303724ef1317aded6982c9fdd6fd8775d',head],{cwd:root}).status!==0)throw Error('Source must match HEAD and retain the verified preparation ancestor.');
 const configs=Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,JSON5.parse(readFileSync(resolve(root,p),'utf8'))])),errors=[...validateTopology(configs),...validateAdminConfig(JSON5.parse(readFileSync(resolve(root,ADMIN_CONFIG),'utf8')),JSON5.parse(readFileSync(resolve(root,ADMIN_CONFIG),'utf8')),configs.lifecycle.name),...strayAdminBindings(root)];
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: exact source '+head+'; six isolated template targets and named topology; the local-only recovery admin template is the only config that binds its entrypoint.');
 if(dry){const metadata=JSON.parse(readFileSync(resolve(root,'apps/web/.open-next/alpha-build.json'),'utf8'));if(metadata.commit!==head)throw Error('Generated application source differs from the requested source. Rebuild first.');if(!existsSync(resolve(root,'apps/web/.open-next/worker.js')))throw Error('Generate the OpenNext build first.');for(const [kind,path]of Object.entries(CONFIGS)){execFileSync('pnpm',['--filter','@zigoals/web','exec','wrangler','deploy','--config',resolve(root,path),'--dry-run','--outdir','/tmp/zigoals-run11-dry-'+kind],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});}}
 console.log('OWNER_SETUP_PENDING: credentials, exact nonproduction origins/policy, lifecycle authority activation and real inbox/device/provider/PITR proof. No provisioning or deployment performed.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(error.message);process.exitCode=1;}
