// EXPERIMENT ONLY (experiment/click-hang-repro, DO NOT MERGE).
// The click-hang workflow points selected specs at this module instead of '@playwright/test'.
// It records page signals and, when a click is still pending after a threshold, writes
// diagnostics to the job log while the page is still alive (before the 45 s test timeout).
import {test as base,type Locator,type Page} from '@playwright/test';
import {appendFileSync,readFileSync,readdirSync} from 'node:fs';
export * from '@playwright/test';
const LOG=process.env.CLICK_HANG_LOG??'/tmp/click-hang-diag.log';
const THRESHOLDS=(process.env.CLICK_HANG_THRESHOLDS??'25000,36000').split(',').map(Number);
type Signals={errors:string[];pending:Map<object,string>;title:string};
const signals=new WeakMap<Page,Signals>();
let current='';
const write=(text:string)=>{const line=`[click-hang ${new Date().toISOString()}] ${text}\n`;try{appendFileSync(LOG,line);}catch{}process.stderr.write(line);};
const within=async<T>(work:Promise<T>,ms:number):Promise<T|string>=>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([work,new Promise<string>(resolve=>{timer=setTimeout(()=>resolve(`TIMEOUT after ${ms} ms`),ms);})]);}catch(error){return `ERROR ${error instanceof Error?error.message.split('\n')[0]:String(error)}`;}finally{clearTimeout(timer);}};
// The debugger is enabled when each page opens (Debugger.enable needs a free main thread). When the page
// stops answering, Debugger.pause interrupts its running JS and the stack is logged.
type Probe={cdp:import('@playwright/test').CDPSession;scripts:Map<string,string>};
const probes=new WeakMap<Page,Probe>();
async function attachDebugger(page:Page){
 try{const cdp=await page.context().newCDPSession(page),scripts=new Map<string,string>();cdp.on('Debugger.scriptParsed',(e:{scriptId:string;url:string})=>{scripts.set(e.scriptId,e.url);});await cdp.send('Debugger.enable');probes.set(page,{cdp,scripts});}
 catch(error){write(`debugger attach failed: ${error instanceof Error?error.message:String(error)}`);}
}
async function mainThreadStack(page:Page){
 const probe=probes.get(page);if(!probe)return 'debugger not attached';const {cdp,scripts}=probe;
 try{
  const paused=new Promise<{reason:string;callFrames:{functionName:string;location:{scriptId:string;lineNumber:number;columnNumber:number}}[]}>(resolve=>cdp.once('Debugger.paused',resolve as never));
  const pause=await within(cdp.send('Debugger.pause'),5000);if(typeof pause==='string')return `Debugger.pause ${pause}`;
  const event=await within(paused,8000);if(typeof event==='string')return `no pause event: ${event}`;
  const lines=[`paused (${event.reason}), ${event.callFrames.length} frames`];
  for(const [index,frame] of event.callFrames.slice(0,25).entries()){
   const {scriptId,lineNumber,columnNumber}=frame.location;let snippet='';
   if(index<8){const source=await within(cdp.send('Debugger.getScriptSource',{scriptId}),3000);if(typeof source!=='string'){const line=source.scriptSource.split('\n')[lineNumber]??'';snippet=line.slice(Math.max(0,columnNumber-160),columnNumber+160).replace(/\s+/g,' ');}}
   lines.push(`  #${index} ${frame.functionName||'(anonymous)'} ${scripts.get(scriptId)??scriptId}:${lineNumber+1}:${columnNumber+1}${snippet?`\n      …${snippet}…`:''}`);
  }
  await within(cdp.send('Debugger.resume'),3000);return lines.join('\n');
 }catch(error){return `CDP error ${error instanceof Error?error.message:String(error)}`;}
}
// Browser processes from /proc: CPU ticks used over 3 s, scheduler state and kernel wait channel.
function browserProcesses(){const rows=new Map<string,{type:string;ticks:number;state:string;wchan:string}>();for(const pid of readdirSync('/proc').filter(n=>/^\d+$/.test(n))){try{const cmd=readFileSync(`/proc/${pid}/cmdline`,'utf8').split(/[\0 ]/);if(!/chrom/i.test(cmd[0]??''))continue;const type=cmd.find(a=>a.startsWith('--type='))?.slice(7)??'browser',stat=readFileSync(`/proc/${pid}/stat`,'utf8'),fields=stat.slice(stat.lastIndexOf(')')+2).split(' ');rows.set(pid,{type,ticks:Number(fields[11])+Number(fields[12]),state:fields[0]!,wchan:readFileSync(`/proc/${pid}/wchan`,'utf8')});}catch{}}return rows;}
async function processSample(){const first=browserProcesses();await new Promise(r=>setTimeout(r,3000));const second=browserProcesses();return [...second].map(([pid,row])=>({pid,type:row.type,cpuTicks3s:row.ticks-(first.get(pid)?.ticks??row.ticks),state:row.state,wchan:row.wchan})).filter(r=>r.type!=='zygote'&&r.type!=='utility'||r.cpuTicks3s>0).sort((a,b)=>b.cpuTicks3s-a.cpuTicks3s).slice(0,12);}
async function diagnose(locator:Locator,elapsed:number){
 const page=locator.page(),state=signals.get(page),started=Date.now();
 const version=page.context().browser()?.version()??'unknown';
 const alive=await within(page.evaluate(()=>({now:Math.round(performance.now()),ready:document.readyState,href:location.href,visibility:document.visibilityState,focus:document.hasFocus(),active:document.activeElement?.outerHTML.slice(0,160)??null,longTasks:((window as unknown as {__clickHangLongTasks?:{start:number;duration:number}[]}).__clickHangLongTasks??[]).slice(-8)})),2000);
 const count=await within(locator.count(),2000);
 const element=await within(locator.first().evaluate(node=>{const el=node as HTMLElement,r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,hit=document.elementFromPoint(cx,cy),s=getComputedStyle(el),describe=(n:Element|null)=>n?`${n.tagName.toLowerCase()}${n.id?'#'+n.id:''}${n.className&&typeof n.className==='string'?'.'+n.className.trim().split(/\s+/).join('.'):''}`:null;return {html:el.outerHTML.slice(0,240),rect:{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)},viewport:{w:innerWidth,h:innerHeight},disabled:(el as HTMLButtonElement).disabled??null,ariaDisabled:el.getAttribute('aria-disabled'),pointerEvents:s.pointerEvents,visibility:s.visibility,opacity:s.opacity,transform:s.transform,hitAtCenter:describe(hit),hitIsTarget:hit===el||!!(hit&&el.contains(hit)),animations:el.getAnimations({subtree:true}).map(a=>({name:(a as CSSAnimation).animationName??a.id,state:a.playState,time:a.currentTime})),docAnimations:document.getAnimations().filter(a=>a.playState==='running').map(a=>({name:(a as CSSAnimation).animationName??a.id,target:describe((a.effect as KeyframeEffect|null)?.target as Element|null),iterations:(a.effect as KeyframeEffect|null)?.getTiming().iterations})).slice(0,12)};}),2000);
 write(`STUCK CLICK ${elapsed} ms | ${state?.title??'?'} | browser ${version} | locator ${locator.toString()}`);
 write(`  page: ${JSON.stringify(alive)}`);
 write(`  target count: ${JSON.stringify(count)} | state: ${JSON.stringify(element)}`);
 write(`  pending requests (${state?.pending.size??0}): ${JSON.stringify([...(state?.pending.values()??[])].slice(0,12))}`);
 write(`  console/page errors (${state?.errors.length??0}): ${JSON.stringify(state?.errors.slice(-12)??[])}`);
 if(typeof alive==='string'){write(`  processes (100 ticks = 1 CPU-second): ${JSON.stringify(await processSample())}`);write(`  main thread: ${await mainThreadStack(page)}`);}
 write(`  diagnostics took ${Date.now()-started} ms`);
}
export const test=base.extend({
 page:async({page},provide,info)=>{
  const state:Signals={errors:[],pending:new Map(),title:`${info.project.name} › ${info.titlePath.slice(1).join(' › ')} #${info.repeatEachIndex}`};signals.set(page,state);current=state.title;
  page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')state.errors.push(`${message.type()}: ${message.text().slice(0,200)}`);});
  page.on('pageerror',error=>state.errors.push(`pageerror: ${error.message.slice(0,200)}`));
  page.on('crash',()=>state.errors.push('page crashed'));
  page.on('request',request=>state.pending.set(request,`${request.method()} ${request.url().slice(0,160)}`));
  page.on('requestfinished',request=>state.pending.delete(request));
  page.on('requestfailed',request=>state.pending.delete(request));
  await attachDebugger(page);
  await page.addInitScript(()=>{const tasks:{start:number;duration:number}[]=[];(window as unknown as {__clickHangLongTasks:typeof tasks}).__clickHangLongTasks=tasks;try{new PerformanceObserver(list=>{for(const entry of list.getEntries())tasks.push({start:Math.round(entry.startTime),duration:Math.round(entry.duration)});}).observe({type:'longtask',buffered:true});}catch{}});
  const proto=Object.getPrototypeOf(page.locator('body')) as {click:Locator['click'];__clickHangProbe?:boolean};
  if(!proto.__clickHangProbe){proto.__clickHangProbe=true;const click=proto.click;proto.click=async function(this:Locator,...args:Parameters<Locator['click']>){const started=Date.now(),timers=THRESHOLDS.map(ms=>setTimeout(()=>{void diagnose(this,Date.now()-started);},ms));try{return await click.apply(this,args);}catch(error){write(`CLICK FAILED after ${Date.now()-started} ms | ${current} | ${this.toString()} | ${error instanceof Error?error.message.slice(0,1500):String(error)}`);throw error;}finally{for(const timer of timers)clearTimeout(timer);}};}
  if(info.repeatEachIndex===0)write(`worker ${info.workerIndex} ${info.project.name}: browser ${page.context().browser()?.browserType().name()} ${page.context().browser()?.version()}`);
  await provide(page);
  await probes.get(page)?.cdp.detach().catch(()=>{});
  if(info.status!==info.expectedStatus)write(`TEST FAILED ${state.title}: ${info.error?.message?.slice(0,600)??''}`);
 },
});
