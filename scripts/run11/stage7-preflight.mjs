#!/usr/bin/env node
// Stage 7 preflight (docs/run11/ACTIVATION.md): run it in the ops checkout before asking for the Stage 7 approval.
// Read-only and offline: it reads git, the installed tool versions and the ignored private configs; it never runs
// wrangler, never contacts a network and prints names, never values. Exit code 0 means ready apart from known
// Stage 6 items, which are listed. Usage: node scripts/run11/stage7-preflight.mjs
import {existsSync,readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import JSON5 from 'json5';
import {ADMIN_CONFIG,CONFIGS,checkAdmin,privateFileProblems,privatePath,validatePrivateCopies} from './activation-check.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
// The reviewed preparation commit every activation source must contain (activation-check.mjs --source).
export const PREPARATION_COMMIT='3ca2f42303724ef1317aded6982c9fdd6fd8775d';
/** The secrets Stage 7 supplies with `wrangler secret put NAME --config <private file>`, after the approval only. */
export const STAGE7_SECRETS=[
 {name:'ZIGOALS_AUTH_PUBLIC_KEY',config:CONFIGS.app,source:"The Supabase project's publishable (anon) key (dashboard → Project Settings → API). Publishable, but set as a secret because the checker refuses key-named vars. Never the service-role key"},
 {name:'AUTH_PUBLIC_KEY',config:CONFIGS.private,source:'The same publishable (anon) key as ZIGOALS_AUTH_PUBLIC_KEY'},
 {name:'AUTH_ADMIN_KEY',config:CONFIGS.lifecycle,source:'The Supabase service-role (secret) key, used only to delete provider identities; lifecycle Worker only (Stage 5)'},
 {name:'COINGECKO_DEMO_API_KEY',config:CONFIGS.market,source:'The CoinGecko developer dashboard; market coordinator only (MARKET_KEY_CUSTODY.md)'},
 {name:'AUTH_ADMISSION_KEY',config:CONFIGS.admission,source:'Generate it yourself: a random value of at least 32 characters (for example `openssl rand -base64 48`), kept in Bitwarden'},
];
const git=(root,args)=>spawnSync('git',args,{cwd:root,encoding:'utf8'});
const pass=(label,detail='')=>({status:'PASS',label,detail}),fail=(label,detail)=>({status:'FAIL',label,detail});
function pinned(root){try{return {wrangler:JSON.parse(readFileSync(resolve(root,'apps/web/package.json'),'utf8')).devDependencies?.wrangler,node:readFileSync(resolve(root,'.node-version'),'utf8').trim(),pnpm:JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).packageManager?.replace(/^pnpm@/,'')};}catch{return {};}}
const defaults={
 node:()=>process.version.replace(/^v/,''),
 // Offline: corepack must not download a pnpm to answer.
 pnpm:root=>spawnSync('pnpm',['--version'],{cwd:root,encoding:'utf8',env:{...process.env,COREPACK_ENABLE_NETWORK:'0'}}).stdout?.trim()||null,
 wrangler:root=>{try{return JSON.parse(readFileSync(resolve(root,'apps/web/node_modules/wrangler/package.json'),'utf8')).version;}catch{return null;}},
};

/** Every check, in order. Messages name files, refs and fields; never config values. */
export function preflight(root=ROOT,tools={}){
 const t={...defaults,...tools},checks=[],want=pinned(root);
 // 1. Source: clean, a full clone, and containing main.
 const dirty=git(root,['status','--porcelain']).stdout.trim();
 checks.push(dirty?fail('git: working tree is clean',`${dirty.split('\n').length} changed or untracked paths (git status)`):pass('git: working tree is clean'));
 const head=git(root,['rev-parse','HEAD']).stdout.trim(),ref=['origin/main','main'].find(r=>git(root,['rev-parse','--verify','-q',r+'^{commit}']).status===0);
 checks.push(!ref?fail('git: HEAD contains main','no origin/main or main ref; fetch first'):git(root,['merge-base','--is-ancestor',ref,'HEAD']).status===0?pass('git: HEAD contains main',`${ref} ${git(root,['rev-parse','--short',ref]).stdout.trim()} is an ancestor of ${head.slice(0,7)}`):fail('git: HEAD contains main',`${ref} is not an ancestor of HEAD; merge or check out a commit that contains it`));
 const shallow=git(root,['rev-parse','--is-shallow-repository']).stdout.trim()==='true';
 checks.push(shallow||git(root,['merge-base','--is-ancestor',t.preparationCommit??PREPARATION_COMMIT,'HEAD']).status!==0?fail('git: full clone containing the preparation commit','run `git fetch --unshallow` (activation-check needs the full history)'):pass('git: full clone containing the preparation commit'));
 // 2. Tool versions.
 for(const [tool,actual] of [['node',t.node(root)],['pnpm',t.pnpm(root)],['wrangler',t.wrangler(root)]])
  checks.push(actual&&actual===want[tool]?pass(`${tool} ${actual}`,'matches the repository pin'):fail(`${tool} version`,`${actual??'not found'}; the repository pins ${want[tool]??'(unreadable)'}`));
 // 3. All seven private configs: ignored, 0600, inside this checkout.
 const paths=[...Object.values(CONFIGS),ADMIN_CONFIG].map(privatePath),fileProblems=paths.flatMap(p=>privateFileProblems(root,p).map(x=>`${p}: ${x}`));
 checks.push(fileProblems.length?fail('private configs: seven ignored 0600 files',fileProblems.join('; ')):pass('private configs: seven ignored 0600 files'));
 // 4. activation-check --private, with the Stage 6 market policy reported apart.
 if(Object.values(CONFIGS).every(p=>existsSync(resolve(root,privatePath(p))))){
  const read=p=>JSON5.parse(readFileSync(resolve(root,p),'utf8'));
  let errors;try{errors=validatePrivateCopies(Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,read(privatePath(p))])),Object.fromEntries(Object.entries(CONFIGS).map(([k,p])=>[k,read(p)])));}catch{errors=['a private config is not readable JSONC'];}
  const known=errors.filter(e=>e.includes('MARKET_POLICY')),other=errors.filter(e=>!e.includes('MARKET_POLICY'));
  checks.push(other.length?fail('activation-check --private',other.join('; ')):pass('activation-check --private',known.length?'apart from the known Stage 6 item below':''));
  for(const item of known)checks.push({status:'KNOWN',label:'Stage 6: confirmed MARKET_POLICY',detail:`${item} Finish ACTIVATION.md Stage 6 (market-policy.mjs) before deploying the coordinator.`});
  // 5. The lifecycle Worker deploys in reconcile mode (owner decision, Stage 5).
  const mode=read(privatePath(CONFIGS.lifecycle)).vars?.RECOVERY_MODE;
  checks.push(mode==='reconcile'?pass('lifecycle: RECOVERY_MODE=reconcile'):fail('lifecycle: RECOVERY_MODE=reconcile',`it is ${mode===undefined?'missing':'not reconcile'}; serve only by explicit owner decision after reconciliation`));
 }else checks.push(fail('activation-check --private','the six Stage 4 configs are not all present'));
 // 6. The recovery admin config: local only, bound to that lifecycle Worker, and nothing else binds the entrypoint.
 try{checkAdmin(root);checks.push(pass('recovery admin config is safe (activation-check --admin)'));}catch(error){checks.push(fail('recovery admin config is safe (activation-check --admin)',/** @type {Error} */(error).message.split('\n').join('; ')));}
 return {checks,ok:checks.every(c=>c.status!=='FAIL')};
}
export function report({checks,ok}){
 const lines=checks.map(c=>`${c.status.padEnd(5)} ${c.label}${c.detail?` — ${c.detail}`:''}`);
 lines.push('','Secrets to create at Stage 7, only after the approval, one at a time and typed at the prompt (never as an argument).','Run from the checkout root; pnpm runs wrangler inside apps/web, so the config path is absolute:');
 for(const s of STAGE7_SECRETS)lines.push(`- ${s.name} → ${privatePath(s.config)}. ${s.source}.`,`    pnpm --filter @zigoals/web exec wrangler secret put ${s.name} --config "$PWD/${privatePath(s.config)}"`);
 lines.push('The recovery admin config takes no secret and is never deployed.','',`Stage 7 preflight: ${ok?'READY':'NOT READY'}${checks.some(c=>c.status==='KNOWN')?' (known Stage 6 items listed)':''}. Nothing was contacted; no values were printed.`);
 return lines.join('\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(process.argv.length>2){console.error('Usage: node scripts/run11/stage7-preflight.mjs');process.exitCode=2;}
 else{const result=preflight();console.log(report(result));if(!result.ok)process.exitCode=1;}
}
