#!/usr/bin/env node
import {createServer} from 'node:net';
import {spawn,spawnSync} from 'node:child_process';
import {createWriteStream,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../',import.meta.url))),web=resolve(root,'apps/web');
const runner=resolve(web,'node_modules/@playwright/test/cli.js'),next=resolve(web,'node_modules/next/dist/bin/next');
function allTests(report){
 if(!report||!Array.isArray(report.suites)||!report.stats||typeof report.stats!=='object')throw Error('Invalid report shape');
 const rows=[];
 function walk(suites){for(const suite of suites){if(!suite||!Array.isArray(suite.specs))throw Error('Invalid report shape');for(const spec of suite.specs){if(!spec||typeof spec.title!=='string'||typeof spec.file!=='string'||!Array.isArray(spec.tests))throw Error('Invalid report shape');for(const test of spec.tests){if(!test||typeof test.projectName!=='string'||typeof test.status!=='string'||!Array.isArray(test.results))throw Error('Invalid report shape');rows.push({id:`${spec.id??spec.file+'|'+spec.title}|${test.projectName}`,file:spec.file,title:spec.title,project:test.projectName,expectedStatus:test.expectedStatus,results:test.results,status:test.status});}}if(suite.suites){if(!Array.isArray(suite.suites))throw Error('Invalid report shape');walk(suite.suites);}}}
 walk(report.suites);return rows;
}
export function summarizePlaywright(plan,actual,{exitCode}){
 const expected=allTests(plan),counts={planned:expected.length,passed:0,failed:0,skipped:0,not_run:0,interrupted:0},failures=[];
 if(!actual){counts.interrupted=expected.length;return {counts,failures,complete:false,exitCode};}
 const found=new Map(allTests(actual).map(t=>[t.id,t]));
 for(const item of expected){const test=found.get(item.id);
  if(!test||test.results.length===0){if(item.expectedStatus==='skipped'||test?.expectedStatus==='skipped')counts.skipped++;else counts.not_run++;continue;}
  const last=test.results.at(-1),state=last?.status;
  if(state==='interrupted'){counts.interrupted++;continue;}
  if(test.status==='expected'&&state==='passed'){counts.passed++;continue;}
  if(test.status==='skipped'||state==='skipped'){counts.skipped++;continue;}
  counts.failed++;const error=last?.error??last?.errors?.[0]??{};
  failures.push({file:item.file,title:item.title,project:item.project,message:typeof error.message==='string'?error.message.split('\n')[0].slice(0,300):'Failure detail unavailable',stack:typeof error.stack==='string'?error.stack.slice(0,2000):null});
 }
 if(Object.values(counts).slice(1).reduce((a,b)=>a+b,0)!==counts.planned)throw Error('Invalid report shape');
 return {counts,failures,complete:exitCode===0&&counts.failed===0&&counts.not_run===0&&counts.interrupted===0,exitCode};
}
async function freePort(){return new Promise((ok,fail)=>{const s=createServer();s.once('error',fail);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>ok(port));});});}
function ownEnv(extra={}){const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,LANG:process.env.LANG,NEXT_TELEMETRY_DISABLED:'1',NEXT_PUBLIC_APP_ENVIRONMENT:'PUBLIC_ALPHA_UNDEPLOYED',WRANGLER_SEND_METRICS:'false',CI:'1',NO_COLOR:'1',...extra};return Object.fromEntries(Object.entries(env).filter(([,v])=>v!==undefined));}
async function run(command,args,{cwd=web,env,log,timeoutMs,echo=false}){
 const out=createWriteStream(log,{flags:'wx'}),child=spawn(command,args,{cwd,env,stdio:['ignore','pipe','pipe'],detached:true});
 let timedOut=false,forceTimer;const timer=setTimeout(()=>{timedOut=true;try{process.kill(-child.pid,'SIGTERM');}catch{}forceTimer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},5000);},timeoutMs);
 for(const pipe of [child.stdout,child.stderr])pipe.on('data',chunk=>{out.write(chunk);if(echo)process.stdout.write(chunk);});
 const exitCode=await new Promise((ok,fail)=>{child.once('error',fail);child.once('close',(code,signal)=>ok(code??(signal?143:1)));});
 clearTimeout(timer);clearTimeout(forceTimer);await new Promise(ok=>out.end(ok));return {exitCode,timedOut};
}
async function ready(port,child){for(let n=0;n<40;n++){if(child.exitCode!==null)throw Error('Owned server exited before readiness');try{const r=await fetch(`http://127.0.0.1:${port}/app`,{signal:AbortSignal.timeout(1000)});if(r.status===200){await r.body?.cancel().catch(()=>{});return;}}catch{}await new Promise(ok=>setTimeout(ok,500));}throw Error('Owned server was not ready');}
async function main(){
 const [mode,...filters]=process.argv.slice(2);
 if(!['diagnostic','full'].includes(mode)||filters.some(v=>!/^[-A-Za-z0-9_/.]+\.spec\.ts$/.test(v))||process.version!=='v24.19.0'){
  console.error('Usage with Node 24.19.0: node scripts/pre-run11-browser.mjs diagnostic|full [file.spec.ts ...]');process.exitCode=2;return;
 }
 const sha=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout?.trim();
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Source identity unavailable');
 const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid;
 const dir=resolve(root,'.superpowers/pre11b-browser',runId);mkdirSync(dir,{recursive:true});
 const port=await freePort(),env=ownEnv({PLAYWRIGHT_BASE_URL:`http://127.0.0.1:${port}`,PLAYWRIGHT_JSON_OUTPUT_FILE:resolve(dir,'result.json')});
 const baseArgs=[runner,'test',...filters,'--workers=2','--retries=0'];
 const plan=await run(process.execPath,[...baseArgs,'--list','--reporter=json'],{env:{...env,PLAYWRIGHT_JSON_OUTPUT_FILE:resolve(dir,'plan.json')},log:resolve(dir,'plan.log'),timeoutMs:60000});
 if(plan.exitCode!==0){console.error('PLAN_FAILED '+dir);process.exitCode=plan.exitCode;return;}
 const planned=JSON.parse(readFileSync(resolve(dir,'plan.json'),'utf8'));allTests(planned);
 console.log(`BROWSER_RUN ${mode} source=${sha} os=${process.platform}/${process.arch} port=${port} dir=${dir}`);
 const chrome=spawnSync(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'google-chrome',['--version'],{encoding:'utf8'});
 console.log(`CHROME ${chrome.status===0?chrome.stdout.trim():'unavailable'}`);
 const build=await run(process.execPath,[next,'build'],{env,log:resolve(dir,'build.log'),timeoutMs:300000});
 if(build.exitCode!==0){console.error('BUILD_FAILED '+dir);process.exitCode=build.exitCode;return;}
 const serverLog=createWriteStream(resolve(dir,'server.log'),{flags:'wx'});
 const server=spawn(process.execPath,[next,'start','--hostname','127.0.0.1','--port',String(port)],{cwd:web,env,stdio:['ignore','pipe','pipe'],detached:true});
 for(const pipe of [server.stdout,server.stderr])pipe.pipe(serverLog,{end:false});
 try{
  await ready(port,server);
  const args=[...baseArgs,'--reporter=line,json','--output='+resolve(dir,'test-results')];
  if(mode==='diagnostic')args.push('--max-failures=5');
  const result=await run(process.execPath,args,{env,log:resolve(dir,'browser.log'),timeoutMs:mode==='diagnostic'?720000:1800000,echo:true});
  let actual=null;if(existsSync(resolve(dir,'result.json')))actual=JSON.parse(readFileSync(resolve(dir,'result.json'),'utf8'));
  const summary=summarizePlaywright(planned,actual,result);summary.source=sha;summary.mode=mode;summary.os=`${process.platform}/${process.arch}`;summary.chrome=chrome.status===0?chrome.stdout.trim():'unavailable';summary.runDir=dir;summary.timedOut=result.timedOut;
  writeFileSync(resolve(dir,'summary.json'),JSON.stringify(summary,null,2)+'\n');
  console.log(`BROWSER_SUMMARY ${JSON.stringify(summary.counts)} complete=${summary.complete} file=${resolve(dir,'summary.json')}`);
  process.exitCode=summary.complete?0:result.exitCode||1;
 }finally{try{process.kill(-server.pid,'SIGTERM');}catch{}await new Promise(ok=>{if(server.exitCode!==null){ok();return;}const timer=setTimeout(()=>{try{process.kill(-server.pid,'SIGKILL');}catch{}ok();},5000);server.once('close',()=>{clearTimeout(timer);ok();});});serverLog.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('BROWSER_RUN_FAILED');process.exitCode=1;});
