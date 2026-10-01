#!/usr/bin/env node
// Read-only project snapshot for the owner: main SHA, latest CI result per workflow,
// test totals when a local results file exists, open PRs and the recorded live Alpha
// Worker version. No dependencies. Uses git, then `gh` when installed and signed in,
// otherwise the public GitHub REST API without credentials (60 requests/hour).
// Usage: node scripts/status-snapshot.mjs [--results path/to/playwright-results.json]
// Behind an HTTPS proxy, run with NODE_USE_ENV_PROXY=1 so fetch uses it.
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO='reyals1111-ux/ZIGoals';
const run=(cmd,args)=>{try{return execFileSync(cmd,args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}catch{return null;}};
// Checked when the snapshot runs, not when a test imports recordedLiveWorker.
let hasGh;
async function api(path){
 hasGh??=run('gh',['auth','status'])!==null;
 if(hasGh){const out=run('gh',['api',path]);if(out!==null)return JSON.parse(out);}
 const response=await fetch(`https://api.github.com/${path}`,{headers:{accept:'application/vnd.github+json','user-agent':'zigoals-status-snapshot'}});
 if(!response.ok)throw Error(`GitHub API ${path}: HTTP ${response.status}`);
 return response.json();
}
const line=(label,value)=>console.log(`${label.padEnd(22)} ${value}`);

/** The live Alpha Worker version recorded by hand in docs/STATUS.md: the first "live version" under the current
 * "## Release identity". Deploy entries' wording changed over time (`zigoals-alpha`: vs `zigoals-alpha`,), and the
 * oldest entries sit lowest in the file, so a file-wide pattern found a stale version. */
export function recordedLiveWorker(status){
 const start=status.indexOf('\n## Release identity\n');if(start<0)return null;
 const rest=status.slice(start+1),end=rest.slice(1).search(/\n#{1,2} /),section=end<0?rest:rest.slice(0,end+1);
 return section.match(/live version `([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})`/)?.[1]??null;
}

async function main(){
console.log(`ZIGoals status snapshot (${new Date().toISOString()})`);
run('git',['fetch','--quiet','origin','main']);
const main=run('git',['rev-parse','origin/main'])??run('git',['rev-parse','main']);
line('main',main?`${main} ${run('git',['log','-1','--format=%s (%cs)',main])}`:'unavailable');
line('local HEAD',`${run('git',['rev-parse','--abbrev-ref','HEAD'])} ${run('git',['rev-parse','--short','HEAD'])}${run('git',['status','--porcelain'])?' (uncommitted changes)':''}`);
hasGh??=run('gh',['auth','status'])!==null;
line('GitHub access',hasGh?'gh':'public REST API (no credentials)');

try{
 const {workflows}=await api(`repos/${REPO}/actions/workflows`);
 console.log('\nLatest run per workflow (any branch; main in brackets)');
 for(const w of workflows.filter(w=>w.state==='active')){
  const [latest]=(await api(`repos/${REPO}/actions/workflows/${w.id}/runs?per_page=1`)).workflow_runs;
  const [onMain]=(await api(`repos/${REPO}/actions/workflows/${w.id}/runs?per_page=1&branch=main`)).workflow_runs;
  const describe=r=>r?`${r.conclusion??r.status} #${r.run_number} ${r.head_sha.slice(0,7)} ${r.head_branch} ${r.created_at.slice(0,16)}Z`:'none';
  line(w.name,`${describe(latest)}  [main: ${describe(onMain)}]`);
 }
}catch(error){line('CI','unavailable: '+error.message);}

const resultsArg=process.argv.indexOf('--results'),results=resultsArg>0?process.argv[resultsArg+1]:'/tmp/zigoals-web-results.json';
if(results&&existsSync(results)){
 try{const {stats}=JSON.parse(readFileSync(results,'utf8'));console.log(`\nPlaywright results (${results})`);line('tests',`${stats.expected} passed, ${stats.unexpected} failed, ${stats.flaky} flaky, ${stats.skipped} skipped`);}
 catch{line('Playwright results','unreadable: '+results);}
}else console.log('\nTest totals: no local Playwright results file (pass --results <json>).');

try{
 const pulls=await api(`repos/${REPO}/pulls?state=open&per_page=50`);
 console.log(`\nOpen pull requests (${pulls.length})`);
 for(const p of pulls)line(`#${p.number}`,`${p.title} [${p.head.ref} → ${p.base.ref}]${p.draft?' draft':''}`);
}catch(error){line('Pull requests','unavailable: '+error.message);}

// The live Alpha version is recorded by hand in docs/STATUS.md from the deployment artifact; this reads that record, it does not query Cloudflare.
const status=existsSync('docs/STATUS.md')?readFileSync('docs/STATUS.md','utf8'):'';
const recorded=recordedLiveWorker(status);
console.log('\nPublic Alpha');
line('recorded live Worker',recorded?`${recorded} (from docs/STATUS.md "Release identity", not queried live)`:'not found in docs/STATUS.md');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
