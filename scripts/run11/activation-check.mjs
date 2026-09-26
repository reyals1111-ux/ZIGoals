#!/usr/bin/env node
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawnSync} from 'node:child_process';
import JSON5 from 'json5';
export const CONFIGS={app:'apps/web/wrangler.run11.local.jsonc',private:'workers/private-sync/wrangler.local.jsonc',lifecycle:'workers/private-sync/wrangler.lifecycle.local.jsonc',market:'workers/market-coordinator/wrangler.local.jsonc',food:'workers/food-lookup/wrangler.local.jsonc',admission:'workers/auth-abuse/wrangler.local.jsonc'};
export function validateTopology(configs){
 const errors=[],names=Object.values(configs).map(v=>v.name);
 if(new Set(names).size!==6)errors.push('Service names must be unique.');
 for(const [kind,c]of Object.entries(configs)){
  if(!/^zigoals-[a-z0-9-]+-local$/.test(c.name??'')||c.name==='zigoals-alpha'||c.routes||c.route||c.account_id||c.workers_dev!==false||c.preview_urls!==false)errors.push(kind+': isolated nonpublic target required.');
  if(c.compatibility_date!=='2026-09-13')errors.push(kind+': reviewed compatibility date required.');
  if(c.observability?.enabled!==false)errors.push(kind+': request logging must stay disabled.');
  if(Object.keys(c.vars??{}).some(k=>/key|secret|token|password/i.test(k)))errors.push(kind+': credential values do not belong in templates.');
  if(kind!=='app'){const binding={private:['VAULTS','PrivateVault'],lifecycle:['LIFECYCLES','LifecycleAuthority'],market:['MARKETS','MarketAccount'],food:['FOOD_BUDGET','FoodBudget'],admission:['ADMISSION','AdmissionAuthority']}[kind];if(!c.durable_objects?.bindings?.some(v=>v.name===binding[0]&&v.class_name===binding[1])||!c.migrations?.some(m=>m.new_sqlite_classes?.includes(binding[1])))errors.push(kind+': SQLite binding/migration missing.');}
 }
 const expectBinding=(c,binding,service,entrypoint)=>{if(!c.services?.some(s=>s.binding===binding&&s.service===service&&s.entrypoint===entrypoint))errors.push(binding+': service topology mismatch.');};
 expectBinding(configs.app,'WORKER_SELF_REFERENCE',configs.app.name,undefined);expectBinding(configs.app,'MARKET_QUOTES',configs.market.name,'QuoteService');expectBinding(configs.app,'PRIVATE_SYNC',configs.private.name,undefined);expectBinding(configs.app,'FOOD_LOOKUP',configs.food.name,undefined);expectBinding(configs.app,'AUTH_ABUSE',configs.admission.name,'AdmissionService');expectBinding(configs.private,'LIFECYCLE',configs.lifecycle.name,'LifecycleService');
 if(Object.values(configs).some(c=>c.services?.some(s=>s.entrypoint==='LifecycleRecoveryAdmin')))errors.push('Recovery administration must remain unbound in runtime templates.');
 if(configs.lifecycle.vars?.RECOVERY_MODE!=='reconcile')errors.push('Lifecycle activation requires an explicit reviewed transition from reconcile.');
 return errors;
}
function main(){
 const args=process.argv.slice(2),dry=args.includes('--dry-run'),index=args.indexOf('--source'),source=index>=0?args[index+1]:undefined;
 if(!source||!/^[a-f0-9]{40}$/.test(source)||args.some((a,i)=>a!=='--dry-run'&&a!=='--source'&&i!==index+1)){console.error('Usage: node scripts/run11/activation-check.mjs --source <exact-commit> [--dry-run]');process.exitCode=2;return;}
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 if(head!==source||spawnSync('git',['merge-base','--is-ancestor','3ca2f42303724ef1317aded6982c9fdd6fd8775d',head],{cwd:root}).status!==0)throw Error('Source must match HEAD and retain the verified preparation ancestor.');
 const configs=Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,JSON5.parse(readFileSync(resolve(root,p),'utf8'))])),errors=validateTopology(configs);
 if(errors.length)throw Error(errors.join('\n'));console.log('PASS: exact source '+head+'; six isolated template targets and named topology.');
 if(dry){const metadata=JSON.parse(readFileSync(resolve(root,'apps/web/.open-next/alpha-build.json'),'utf8'));if(metadata.commit!==head)throw Error('Generated application source differs from the requested source. Rebuild first.');if(!existsSync(resolve(root,'apps/web/.open-next/worker.js')))throw Error('Generate the OpenNext build first.');for(const [kind,path]of Object.entries(CONFIGS)){execFileSync('pnpm',['--filter','@zigoals/web','exec','wrangler','deploy','--config',resolve(root,path),'--dry-run','--outdir','/tmp/zigoals-run11-dry-'+kind],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});}}
 console.log('OWNER_SETUP_PENDING: credentials, exact nonproduction origins/policy, lifecycle authority activation and real inbox/device/provider/PITR proof. No provisioning or deployment performed.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))try{main();}catch(error){console.error(error.message);process.exitCode=1;}
