// ZIGoals hosted, the relay (Session V Part 17): a check of a relay Worker config before the owner deploys it
// (docs/run11/ZIGI_RELAY_ACTIVATION.md). Separate from activation-check.mjs on purpose: the relay is not part of the
// Run11 topology and stays off by default. Read-only and offline: it reads one config file and prints what is wrong.
// Usage: node scripts/run11/zigi-relay-config.mjs <config.jsonc> [--template]
// `--template` accepts the committed placeholders (workers/zigi-relay/wrangler.local.jsonc); without it, the values a
// deployment needs must be real.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const SECRETS=['AUTH_PUBLIC_KEY','ZIGI_UPSTREAM_KEY','ZIGI_ALLOWLIST'];
const VARS=['AUTH_ORIGIN','APP_ORIGIN','ZIGI_UPSTREAM_URL','ZIGI_PROVIDER_NAME','ZIGI_MODEL','ZIGI_DAILY_REQUESTS','ZIGI_DAILY_TOKENS','ZIGI_GLOBAL_DAILY_TOKENS','ZIGI_KILL_SWITCH'];
// Session X Part 9: optional; only the Anthropic upstream reads it ("off" when absent).
const OPTIONAL_VARS=['ZIGI_THINKING'];
const ANTHROPIC_MESSAGES='https://api.anthropic.com/v1/messages';
/** JSONC without comments (a // or /* inside a string is kept). @param {string} text */
export function stripComments(text){
 let out='',inString=false,i=0;
 while(i<text.length){
  const c=text[i],n=text[i+1];
  if(inString){out+=c;if(c==='\\'){out+=n??'';i+=2;continue;}if(c==='"')inString=false;i++;continue;}
  if(c==='"'){inString=true;out+=c;i++;continue;}
  if(c==='/'&&n==='/'){while(i<text.length&&text[i]!=='\n')i++;continue;}
  if(c==='/'&&n==='*'){i+=2;while(i<text.length&&!(text[i]==='*'&&text[i+1]==='/'))i++;i+=2;continue;}
  out+=c;i++;
 }
 return out;
}
const https=(/** @type {unknown} */v)=>{try{const u=new URL(String(v));return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const positive=(/** @type {unknown} */v)=>/^\d{1,12}$/.test(String(v))&&Number(v)>0;
/** Problems with one relay config, as plain sentences; none means it may be deployed. @param {any} config @param {{template?:boolean}} [options] */
export function relayConfigProblems(config,{template=false}={}){
 const problems=[];
 if(!config||typeof config!=='object')return ['The config is not a JSON object.'];
 if(config.main!=='worker.mjs')problems.push('main must be worker.mjs (workers/zigi-relay).');
 const binding=config.durable_objects?.bindings;
 if(!Array.isArray(binding)||binding.length!==1||binding[0]?.name!=='ZIGI_BUDGET'||binding[0]?.class_name!=='RelayBudget')problems.push('Exactly one Durable Object binding: ZIGI_BUDGET → RelayBudget.');
 if(!Array.isArray(config.migrations)||!config.migrations.some(/** @param {any} m */m=>Array.isArray(m?.new_sqlite_classes)&&m.new_sqlite_classes.includes('RelayBudget')))problems.push('RelayBudget must be a SQLite Durable Object (new_sqlite_classes).');
 if(config.observability?.enabled!==false)problems.push('observability.enabled must be false: the relay keeps no logs.');
 if(config.logpush===true)problems.push('logpush must stay off.');
 if(config.tail_consumers?.length)problems.push('No tail consumers: nothing may read the relay\'s requests.');
 if(config.workers_dev!==false)problems.push('workers_dev must be false.');
 if(config.preview_urls!==false)problems.push('preview_urls must be false.');
 for(const kind of ['kv_namespaces','r2_buckets','d1_databases','queues','services','analytics_engine_datasets'])if(config[kind]?.length)problems.push(`No ${kind}: the relay stores nothing but counts.`);
 const vars=config.vars??{};
 for(const name of SECRETS)if(Object.hasOwn(vars,name))problems.push(`${name} is a secret: set it with wrangler secret put, never in vars.`);
 for(const name of Object.keys(vars))if(!VARS.includes(name)&&!OPTIONAL_VARS.includes(name))problems.push(`Unknown var ${name}.`);
 if(Object.hasOwn(vars,'ZIGI_THINKING')&&!['off','model-default'].includes(vars.ZIGI_THINKING))problems.push('ZIGI_THINKING must be "off" or "model-default".');
 for(const name of VARS)if(!Object.hasOwn(vars,name))problems.push(`Missing var ${name}.`);
 if(!['on','off'].includes(vars.ZIGI_KILL_SWITCH))problems.push('ZIGI_KILL_SWITCH must be "on" (paused) or "off".');
 for(const name of ['ZIGI_DAILY_REQUESTS','ZIGI_DAILY_TOKENS','ZIGI_GLOBAL_DAILY_TOKENS'])if(Object.hasOwn(vars,name)&&!positive(vars[name]))problems.push(`${name} must be a positive whole number.`);
 if(positive(vars.ZIGI_DAILY_TOKENS)&&positive(vars.ZIGI_GLOBAL_DAILY_TOKENS)&&Number(vars.ZIGI_DAILY_TOKENS)>Number(vars.ZIGI_GLOBAL_DAILY_TOKENS))problems.push('One account\'s daily tokens cannot be more than the relay\'s own daily tokens.');
 if(!https(vars.ZIGI_UPSTREAM_URL))problems.push('ZIGI_UPSTREAM_URL must be an https address.');
 else if(new URL(String(vars.ZIGI_UPSTREAM_URL)).hostname==='api.anthropic.com'&&vars.ZIGI_UPSTREAM_URL!==ANTHROPIC_MESSAGES)problems.push(`On Anthropic, ZIGI_UPSTREAM_URL must be exactly ${ANTHROPIC_MESSAGES} (the relay translates to that API only).`);
 if(!/^[A-Za-z0-9._:/-]{1,100}$/.test(String(vars.ZIGI_MODEL??'')))problems.push('ZIGI_MODEL must be a model id.');
 if(!template){
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(String(vars.AUTH_ORIGIN??''))||vars.AUTH_ORIGIN==='https://unconfigured.supabase.co')problems.push('AUTH_ORIGIN must be the real account provider origin.');
  if(!https(vars.APP_ORIGIN)||new URL(String(vars.APP_ORIGIN)).origin!==vars.APP_ORIGIN)problems.push('APP_ORIGIN must be the app\'s https origin.');
  if(/-local$/.test(String(config.name??'')))problems.push('name must be the deployed Worker\'s name, not the local template\'s.');
 }
 return problems;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [path,...flags]=process.argv.slice(2);
 if(!path){console.error('Usage: node scripts/run11/zigi-relay-config.mjs <config.jsonc> [--template]');process.exit(2);}
 const problems=relayConfigProblems(JSON.parse(stripComments(readFileSync(path,'utf8'))),{template:flags.includes('--template')});
 if(problems.length){for(const p of problems)console.error(`relay config: ${p}`);process.exitCode=1;}
 else console.log('The relay config is quiet, paused or budgeted, and holds no secret.');
}
