// EXPERIMENT ONLY (experiment/click-hang-repro, DO NOT MERGE).
// The click-hang workflow points selected specs at this module instead of '@playwright/test'.
// It records page signals and, when a click is still pending after a threshold, writes
// diagnostics to the job log while the page is still alive (before the 45 s test timeout).
import {test as base,type Locator,type Page} from '@playwright/test';
import {appendFileSync} from 'node:fs';
export * from '@playwright/test';
const LOG=process.env.CLICK_HANG_LOG??'/tmp/click-hang-diag.log';
const THRESHOLDS=(process.env.CLICK_HANG_THRESHOLDS??'25000,36000').split(',').map(Number);
type Signals={errors:string[];pending:Map<object,string>;title:string};
const signals=new WeakMap<Page,Signals>();
let current='';
const write=(text:string)=>{const line=`[click-hang ${new Date().toISOString()}] ${text}\n`;try{appendFileSync(LOG,line);}catch{}process.stderr.write(line);};
const within=async<T>(work:Promise<T>,ms:number):Promise<T|string>=>{let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([work,new Promise<string>(resolve=>{timer=setTimeout(()=>resolve(`TIMEOUT after ${ms} ms`),ms);})]);}catch(error){return `ERROR ${error instanceof Error?error.message.split('\n')[0]:String(error)}`;}finally{clearTimeout(timer);}};
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
  await page.addInitScript(()=>{const tasks:{start:number;duration:number}[]=[];(window as unknown as {__clickHangLongTasks:typeof tasks}).__clickHangLongTasks=tasks;try{new PerformanceObserver(list=>{for(const entry of list.getEntries())tasks.push({start:Math.round(entry.startTime),duration:Math.round(entry.duration)});}).observe({type:'longtask',buffered:true});}catch{}});
  const proto=Object.getPrototypeOf(page.locator('body')) as {click:Locator['click'];__clickHangProbe?:boolean};
  if(!proto.__clickHangProbe){proto.__clickHangProbe=true;const click=proto.click;proto.click=async function(this:Locator,...args:Parameters<Locator['click']>){const started=Date.now(),timers=THRESHOLDS.map(ms=>setTimeout(()=>{void diagnose(this,Date.now()-started);},ms));try{return await click.apply(this,args);}catch(error){write(`CLICK FAILED after ${Date.now()-started} ms | ${current} | ${this.toString()} | ${error instanceof Error?error.message.slice(0,1500):String(error)}`);throw error;}finally{for(const timer of timers)clearTimeout(timer);}};}
  if(info.repeatEachIndex===0)write(`worker ${info.workerIndex} ${info.project.name}: browser ${page.context().browser()?.browserType().name()} ${page.context().browser()?.version()}`);
  await provide(page);
  if(info.status!==info.expectedStatus)write(`TEST FAILED ${state.title}: ${info.error?.message?.slice(0,600)??''}`);
 },
});
