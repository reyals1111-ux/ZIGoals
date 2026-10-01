#!/usr/bin/env node
// QA-25: how long the stored-data schemas take to parse power-user-sized stores (Session F's power user: 45 habits
// with ~12,900 check-ins, three years of Health, 200 positions) with each of zod's object parsers:
// - jit:      compiled parsers, used where eval is allowed (Node, `next dev`);
// - csp:      eval disallowed, as the production CSP does in the browser: zod's probe fails, interpreted parsers;
// - jitless:  `z.config({jitless:true})` before any schema exists (apps/web/lib/vault/zod-jitless.ts): no probe,
//             interpreted parsers.
// Each mode runs in its own Node process over the same esbuild bundle of the real schemas, interleaved, several rounds.
// Local measurement only; nothing is sent anywhere. Usage: node scripts/zod-jitless-benchmark.mjs [--rounds 7]
import {createRequire} from 'node:module';
import {mkdtempSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),web=join(root,'apps/web');
const MODES={jit:{flags:[],env:{}},csp:{flags:['--disallow-code-generation-from-strings'],env:{}},jitless:{flags:[],env:{ZOD_BENCH_JITLESS:'1'}}};
// Runs inside each child: schemas are imported only after the mode is set, then each store is parsed repeatedly.
const ENTRY=`
import {z} from 'zod';
if(process.env.ZOD_BENCH_JITLESS==='1')z.config({jitless:true});
const {powerUserRecords}=await import('./lib/vault/power-user-fixture');
const {modules}=await import('./lib/vault/account-data');
const {records}=powerUserRecords();
const stores={finance:[modules.finance.schema,JSON.parse(records['zigoals:platform:v1'])],habits:[modules.habits.schema,JSON.parse(records['zigoals:habits:v1'])],health:[modules.health.schema,JSON.parse(records['zigoals:health:v1'])]};
const result={};
for(const [name,[schema,value]] of Object.entries(stores)){
 for(let i=0;i<5;i++)if(!schema.safeParse(value).success)throw Error(name+' fixture is invalid');
 const times=[];for(let i=0;i<40;i++){const t=performance.now();schema.safeParse(value);times.push(performance.now()-t);}
 times.sort((a,b)=>a-b);result[name]=times[Math.floor(times.length/2)];
}
let probe='not run';try{new Function('');probe='eval allowed';}catch{probe='eval blocked';}
console.log(JSON.stringify({result,probe}));
`;
export async function bundle(){
 const require=createRequire(realpathSync(join(web,'node_modules/wrangler/package.json'))),{build}=require('esbuild');
 const out=join(mkdtempSync(join(tmpdir(),'zod-jitless-bench-')),'bench.mjs');
 await build({stdin:{contents:ENTRY,resolveDir:web,loader:'ts',sourcefile:'bench-entry.ts'},bundle:true,format:'esm',platform:'node',target:'node24',outfile:out,logLevel:'silent',alias:{'server-only':join(web,'node_modules/next/dist/compiled/server-only/empty.js')}});
 return out;
}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
async function main(){
 const index=process.argv.indexOf("--rounds"),rounds=index>0?Number(process.argv[index+1]):7,file=await bundle(),runs={jit:[],csp:[],jitless:[]};
 for(let round=0;round<rounds;round++)for(const [mode,{flags,env}] of Object.entries(MODES)){
  const output=JSON.parse(execFileSync(process.execPath,[...flags,file],{env:{...process.env,...env},encoding:'utf8'}).trim().split('\n').at(-1));
  runs[mode].push(output.result);if(round===0)console.log(`${mode}: ${output.probe}`);
 }
 console.log(`\nMedian parse time per store, ms (median of ${rounds} rounds × 40 parses; Node ${process.version})`);
 console.log('store    jit      csp      jitless  jitless vs csp  jitless vs jit');
 for(const store of ['finance','habits','health']){
  const [jit,csp,jitless]=['jit','csp','jitless'].map(mode=>median(runs[mode].map(r=>r[store])));
  console.log(`${store.padEnd(8)} ${jit.toFixed(1).padStart(7)} ${csp.toFixed(1).padStart(8)} ${jitless.toFixed(1).padStart(8)}  ${((jitless/csp-1)*100).toFixed(1).padStart(12)}%  ${((jitless/jit-1)*100).toFixed(1).padStart(12)}%`);
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
