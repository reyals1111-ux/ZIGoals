// The health-link Worker (Session W Part 8): a check of its config before the owner deploys it
// (docs/run11/HEALTH_LINK_ACTIVATION.md). Read-only and offline: it reads one config file and prints what is wrong.
// Usage: node scripts/run11/health-link-config.mjs <config.jsonc> [--template]
// `--template` accepts the committed placeholders (workers/health-link/wrangler.local.jsonc).
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {stripComments} from './zigi-relay-config.mjs';

const SECRETS=['AUTH_PUBLIC_KEY','OURA_CLIENT_SECRET','WITHINGS_CLIENT_SECRET','POLAR_CLIENT_SECRET','STRAVA_CLIENT_SECRET'];
const REQUIRED=['AUTH_ORIGIN','APP_ORIGIN','HEALTH_LINK_DAILY_REQUESTS','HEALTH_LINK_GLOBAL_DAILY_REQUESTS','HEALTH_LINK_KILL_SWITCH'];
const OPTIONAL=['OURA_CLIENT_ID','WITHINGS_CLIENT_ID','POLAR_CLIENT_ID','STRAVA_CLIENT_ID'];
const https=(/** @type {unknown} */v)=>{try{const u=new URL(String(v));return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const positive=(/** @type {unknown} */v)=>/^\d{1,12}$/.test(String(v))&&Number(v)>0;
/** Problems with one health-link config, as plain sentences; none means it may be deployed. @param {any} config @param {{template?:boolean}} [options] */
export function linkConfigProblems(config,{template=false}={}){
 const problems=[];
 if(!config||typeof config!=='object')return ['The config is not a JSON object.'];
 if(config.main!=='worker.mjs')problems.push('main must be worker.mjs (workers/health-link).');
 const binding=config.durable_objects?.bindings;
 if(!Array.isArray(binding)||binding.length!==1||binding[0]?.name!=='LINK_BUDGET'||binding[0]?.class_name!=='LinkBudget')problems.push('Exactly one Durable Object binding: LINK_BUDGET → LinkBudget.');
 if(!Array.isArray(config.migrations)||!config.migrations.some(/** @param {any} m */m=>Array.isArray(m?.new_sqlite_classes)&&m.new_sqlite_classes.includes('LinkBudget')))problems.push('LinkBudget must be a SQLite Durable Object (new_sqlite_classes).');
 if(config.observability?.enabled!==false)problems.push('observability.enabled must be false: the Worker keeps no logs.');
 if(config.logpush===true)problems.push('logpush must stay off.');
 if(config.tail_consumers?.length)problems.push('No tail consumers: nothing may read the Worker\'s requests.');
 if(config.workers_dev!==false)problems.push('workers_dev must be false.');
 if(config.preview_urls!==false)problems.push('preview_urls must be false.');
 for(const kind of ['kv_namespaces','r2_buckets','d1_databases','queues','services','analytics_engine_datasets'])if(config[kind]?.length)problems.push(`No ${kind}: the Worker stores nothing but counts.`);
 const vars=config.vars??{};
 for(const name of SECRETS)if(Object.hasOwn(vars,name))problems.push(`${name} is a secret: set it with wrangler secret put, never in vars.`);
 for(const name of Object.keys(vars))if(!REQUIRED.includes(name)&&!OPTIONAL.includes(name))problems.push(`Unknown var ${name}.`);
 for(const name of REQUIRED)if(!Object.hasOwn(vars,name))problems.push(`Missing var ${name}.`);
 if(!['on','off'].includes(vars.HEALTH_LINK_KILL_SWITCH))problems.push('HEALTH_LINK_KILL_SWITCH must be "on" (paused) or "off".');
 for(const name of ['HEALTH_LINK_DAILY_REQUESTS','HEALTH_LINK_GLOBAL_DAILY_REQUESTS'])if(Object.hasOwn(vars,name)&&!positive(vars[name]))problems.push(`${name} must be a positive whole number.`);
 if(positive(vars.HEALTH_LINK_DAILY_REQUESTS)&&positive(vars.HEALTH_LINK_GLOBAL_DAILY_REQUESTS)&&Number(vars.HEALTH_LINK_DAILY_REQUESTS)>Number(vars.HEALTH_LINK_GLOBAL_DAILY_REQUESTS))problems.push('One account\'s daily requests cannot be more than the Worker\'s own daily requests.');
 for(const name of OPTIONAL)if(Object.hasOwn(vars,name)&&!/^[A-Za-z0-9._-]{1,200}$/.test(String(vars[name])))problems.push(`${name} must be the provider's client id.`);
 if(!template){
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(String(vars.AUTH_ORIGIN??''))||vars.AUTH_ORIGIN==='https://unconfigured.supabase.co')problems.push('AUTH_ORIGIN must be the real account provider origin.');
  if(!https(vars.APP_ORIGIN)||new URL(String(vars.APP_ORIGIN)).origin!==vars.APP_ORIGIN)problems.push('APP_ORIGIN must be the app\'s https origin (the redirect address is APP_ORIGIN/app/health).');
  if(/-local$/.test(String(config.name??'')))problems.push('name must be the deployed Worker\'s name, not the local template\'s.');
  if(!OPTIONAL.some(name=>Object.hasOwn(vars,name)))problems.push('No provider client id: set at least one (and its secret) or leave the Worker undeployed.');
 }
 return problems;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [path,...flags]=process.argv.slice(2);
 if(!path){console.error('Usage: node scripts/run11/health-link-config.mjs <config.jsonc> [--template]');process.exit(2);}
 const problems=linkConfigProblems(JSON.parse(stripComments(readFileSync(path,'utf8'))),{template:flags.includes('--template')});
 if(problems.length){for(const p of problems)console.error(`health-link config: ${p}`);process.exitCode=1;}
 else console.log('The health-link config is quiet, paused or budgeted, and holds no secret.');
}
