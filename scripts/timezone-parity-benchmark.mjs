#!/usr/bin/env node
// Timezone phase 2 (Session N): does wiring the time helpers into funding and plan days cost anything?
// Two bundles of the real app code are built from this checkout. They differ only in apps/web/lib/goal-intelligence.ts
// and apps/web/lib/plan-revisions.ts:
// - "before" loads those two files from a git ref (default origin/main);
// - "after" uses them as they are in the working tree.
// Each bundle runs in its own Node process, interleaved, several rounds. The workload is Session F's power-user store
// (the Showcase Goals with 200 positions): fundingHealth for every Goal and earliestPlanChange for every Goal, repeated.
// Local measurement only; nothing is sent anywhere.
// Usage: node scripts/timezone-parity-benchmark.mjs [--rounds 9] [--ref origin/main] [--aa]
// --aa builds both sides from the ref (an A/A run), which shows how much the rig itself varies.
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),web=join(root,'apps/web');
const SWAPPED=['apps/web/lib/goal-intelligence.ts','apps/web/lib/plan-revisions.ts'];
// Runs inside each child process. Times are medians of repeated passes, in milliseconds.
const ENTRY=`
const {powerUserRecords}=await import('./lib/vault/power-user-fixture');
const {platformSchema,PLATFORM_KEY}=await import('./lib/positions');
const {fundingHealth}=await import('./lib/goal-intelligence');
const {earliestPlanChange}=await import('./lib/plan-revisions');
const s=platformSchema.parse(JSON.parse(powerUserRecords('2026-10-01').records[PLATFORM_KEY]));
const now=Date.parse('2026-10-16T01:30:00Z'),goals=s.goals.filter(g=>g.type!=='PROJECT');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
const time=(passes,run)=>{for(let i=0;i<5;i++)run(i);const t=[];for(let i=0;i<passes;i++){const start=performance.now();run(i);t.push(performance.now()-start);}return median(t);};
const funding=time(40,i=>{for(let k=0;k<50;k++)for(const g of goals)fundingHealth(s,g.id,now+i*50+k);});
const earliest=time(40,i=>{for(let k=0;k<2000;k++)for(const g of s.goals)earliestPlanChange(g,now+i*2000+k);});
console.log(JSON.stringify({goals:goals.length,positions:s.positions.length,funding,earliest}));
`;
async function bundle(ref){
 const require=createRequire(realpathSync(join(web,'node_modules/wrangler/package.json'))),{build}=require('esbuild');
 const out=join(mkdtempSync(join(tmpdir(),'tz-parity-bench-')),'bench.mjs');
 const swap={name:'swap-before',setup(b){b.onLoad({filter:/apps[/\\]web[/\\]lib[/\\](goal-intelligence|plan-revisions)\.ts$/},args=>{
  const file=SWAPPED.find(f=>args.path.endsWith(f.slice('apps/web/'.length)));
  return {contents:execFileSync('git',['show',`${ref}:${file}`],{cwd:root,encoding:'utf8'}),loader:'ts',resolveDir:dirname(args.path)};
 });}};
 await build({stdin:{contents:ENTRY,resolveDir:web,loader:'ts',sourcefile:'bench-entry.ts'},bundle:true,format:'esm',platform:'node',target:'node24',outfile:out,logLevel:'silent',
  alias:{'server-only':join(web,'node_modules/next/dist/compiled/server-only/empty.js')},plugins:ref?[swap]:[]});
 return out;
}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function main(){
 const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i>0?process.argv[i+1]:fallback;};
 const rounds=Number(arg('--rounds','9')),ref=arg('--ref','origin/main');
 const aa=process.argv.includes('--aa'),files={before:await bundle(ref),after:await bundle(aa?ref:null)},runs={before:[],after:[]};
 // Sanity: the "before" bundle must really contain the earlier code, and "after" the helpers (unless A/A).
 if(readFileSync(files.before,'utf8').includes('function planDay')||(!aa&&!readFileSync(files.after,'utf8').includes('function planDay')))throw Error('The two bundles do not differ as intended.');
 for(let round=0;round<rounds;round++)for(const name of round%2?['after','before']:['before','after'])runs[name].push(JSON.parse(execFileSync(process.execPath,[files[name]],{encoding:'utf8'}).trim().split('\n').at(-1)));
 const first=runs.after[0];
 console.log(`${aa?'A/A run (both sides are the ref). ':''}Power-user store: ${first.goals} Goals with plans, ${first.positions} positions. ${rounds} interleaved rounds per side, Node ${process.version}.`);
 console.log('measure (ms, median of 40 passes)       before   after   change   spread before / after (min-max)');
 for(const [key,label] of [['funding','fundingHealth, 50 × every Goal'],['earliest','earliestPlanChange, 2,000 × every Goal']]){
  const b=runs.before.map(r=>r[key]),a=runs.after.map(r=>r[key]);
  const range=v=>`${Math.min(...v).toFixed(2)}-${Math.max(...v).toFixed(2)}`;
  console.log(`${label.padEnd(38)} ${median(b).toFixed(2).padStart(7)} ${median(a).toFixed(2).padStart(7)} ${((median(a)/median(b)-1)*100).toFixed(1).padStart(7)}%   ${range(b)} / ${range(a)}`);
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
