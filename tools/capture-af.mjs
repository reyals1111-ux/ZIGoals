// Session AF captures (adapted from Session AE's tools/capture.mjs): node capture-af.mjs <base> <outDir>
// env ONLY=<regex>, THEMES=nebula,light,dark. Showcase data, fixed clock 2026-10-16 09:30 UTC, every /api call 503 (no third party).
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire('/Users/AIUSER/Documents/ZIGoals-Claude/apps/web/package.json');
const {chromium}=require('@playwright/test');
const [base,out]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const W={d:{width:1440,height:900},w:{width:1920,height:1080},r:{width:1100,height:860},m:{width:768,height:1024},p:{width:390,height:844}};
const THEMES=(process.env.THEMES??'nebula,light,dark').split(',');
async function ctx(w,{theme='nebula'}={}){
 const c=await browser.newContext({viewport:W[w],deviceScaleFactor:1,...(w==='p'?{isMobile:true,hasTouch:true}:{})});
 const page=await c.newPage();
 await page.route('**/api/**',r=>r.fulfill({status:503,body:'{}'}));
 await page.clock.setFixedTime(new Date('2026-10-16T09:30:00Z'));
 await page.goto(base+'/app/settings');
 await page.evaluate(({theme})=>{const p={version:1,dismissed:{alphaNotice:true}};if(theme!=='nebula')p.theme=theme;localStorage.setItem('zigoals:ui-prefs:v1',JSON.stringify(p));},{theme});
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 if(theme!=='nebula')await page.evaluate(({theme})=>{for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(k.endsWith('zigoals:ui-prefs:v1')){const v=JSON.parse(sessionStorage.getItem(k));v.theme=theme;sessionStorage.setItem(k,JSON.stringify(v));}}},{theme});
 return {c,page};
}
async function settle(page){await page.locator('main h1').first().waitFor({timeout:30000});await page.waitForFunction(()=>!document.querySelector('[aria-busy="true"]'),null,{timeout:20000}).catch(()=>{});await page.waitForTimeout(1500);}
async function go(page,path){await page.goto(base+path);await settle(page);}
const shot=(page,name,opts={})=>page.screenshot({path:`${out}/${name}.png`,...opts});
const only=process.env.ONLY?new RegExp(process.env.ONLY):null;
const jobs=[];
const PAGES=[['today','/app'],['goals','/app/goals'],['habits','/app/habits'],['health','/app/health'],['wealth','/app/wealth'],['markets','/app/markets'],['staking','/app/staking'],['portfolio','/app/portfolio'],['ecosystem','/app/ecosystem'],['activity','/app/activity'],['settings','/app/settings'],['help','/app/help'],['journey','/app/journey'],['review','/app/review'],['calculator','/app/wealth/calculator']];
for(const theme of THEMES)for(const w of ['d','p'])for(const [n,p] of PAGES)jobs.push([`page-${theme}-${n}-${w}`,async()=>{const {c,page}=await ctx(w,{theme});await go(page,p);await shot(page,`${theme}-${n}-${w}`,{fullPage:true});await c.close();}]);
// Part 10 specifics
for(const theme of THEMES){
 jobs.push([`sidebar-${theme}`,async()=>{const {c,page}=await ctx('d',{theme});await settle(page);await shot(page,`sidebar-${theme}-top`,{clip:{x:0,y:0,width:240,height:900}});await page.evaluate(()=>{const s=document.querySelector('.app-sidebar');if(s)s.scrollTop=s.scrollHeight;});await page.waitForTimeout(500);await shot(page,`sidebar-${theme}-scrolled`,{clip:{x:0,y:0,width:240,height:900}});await c.close();}]);
 for(const w of ['d','p'])jobs.push([`footer-${theme}-${w}`,async()=>{const {c,page}=await ctx(w,{theme});await settle(page);const f=page.locator('footer.site-footer');await f.scrollIntoViewIfNeeded();await page.waitForTimeout(8000);await f.screenshot({path:`${out}/footer-${theme}-${w}.png`});await c.close();}]);
 jobs.push([`habits-blocks-${theme}`,async()=>{const {c,page}=await ctx('d',{theme});await go(page,'/app/habits');const g=page.locator('.habit-cadence').first();if(await g.count()){await g.scrollIntoViewIfNeeded();await page.waitForTimeout(400);const card=page.locator('.habit-cadence').first().locator('xpath=ancestor::article[1]');await (await card.count()?card:g).screenshot({path:`${out}/habits-blocks-${theme}.png`});}await c.close();}]);
}
for(const w of ['m','w'])jobs.push([`slogan-${w}`,async()=>{const {c,page}=await ctx(w);await settle(page);const s=page.locator('.today-hero .orbit-slogan').first();if(await s.count())await s.screenshot({path:`${out}/slogan-${w}.png`});await shot(page,`hero-${w}`);await c.close();}]);
jobs.push(['rail-1100',async()=>{const {c,page}=await ctx('r');await settle(page);const r=page.locator('.today-rail').first();if(await r.count())await r.screenshot({path:`${out}/rail-1100.png`});await c.close();}]);
jobs.push(['wealth-chips-1440',async()=>{const {c,page}=await ctx('d');await go(page,'/app/wealth');const h=page.locator('#holdings').first();if(await h.count()){await h.scrollIntoViewIfNeeded();await page.waitForTimeout(400);await h.screenshot({path:`${out}/wealth-chips-1440.png`});}await c.close();}]);
jobs.push(['launchers',async()=>{const {c,page}=await ctx('d');await settle(page);await shot(page,'launchers-d',{clip:{x:1440-280,y:900-360,width:280,height:360}});await c.close();}]);
let ok=0,fail=0;for(const [n,f] of jobs){if(only&&!only.test(n))continue;try{await f();ok++;console.log('ok',n);}catch(e){fail++;console.log('FAIL',n,e.message.split('\n')[0]);}}
console.log(`DONE ok=${ok} fail=${fail}`);
await browser.close();
