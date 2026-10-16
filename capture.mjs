// Session AD captures: node capture.mjs <base> <outDir>   (env ONLY=<regex>, THEMES=nebula,light,dark)
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium}=require('@playwright/test');
const [base,out]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const W={d:{width:1440,height:900},t:{width:1024,height:768},p:{width:390,height:844}};
const THEMES=(process.env.THEMES??'nebula').split(',');
async function ctx(w,{motionOff=false,theme='nebula',folded=false}={}){
 const c=await browser.newContext({viewport:W[w],deviceScaleFactor:1,...(w==='p'?{isMobile:true,hasTouch:true}:{})});
 const page=await c.newPage();
 await page.route('**/api/**',r=>r.fulfill({status:503,body:'{}'}));
 await page.clock.setFixedTime(new Date('2026-10-16T09:30:00Z'));
 await page.goto(base+'/app/settings');
 await page.evaluate(({motionOff,theme,folded})=>{if(motionOff)localStorage.setItem('zigoals:motion:v1','off');const p={version:1,dismissed:{alphaNotice:true}};if(theme!=='nebula')p.theme=theme;if(folded)p.heroCollapsed=true;localStorage.setItem('zigoals:ui-prefs:v1',JSON.stringify(p));},{motionOff,theme,folded});
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 if(theme!=='nebula'||folded)await page.evaluate(({theme,folded})=>{for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(k.endsWith('zigoals:ui-prefs:v1')){const v=JSON.parse(sessionStorage.getItem(k));if(theme!=='nebula')v.theme=theme;if(folded)v.heroCollapsed=true;sessionStorage.setItem(k,JSON.stringify(v));}}},{theme,folded});
 return {c,page};
}
async function settle(page){await page.locator('main h1').first().waitFor({timeout:30000});await page.waitForFunction(()=>!document.querySelector('[aria-busy="true"]'),null,{timeout:20000}).catch(()=>{});await page.waitForTimeout(1500);}
async function go(page,path){await page.goto(base+path);await settle(page);}
const shot=(page,name,opts={})=>page.screenshot({path:`${out}/${name}.png`,...opts});
async function footer(page,name){const f=page.locator('footer.site-footer');await f.scrollIntoViewIfNeeded();await page.waitForTimeout(4500);await f.screenshot({path:`${out}/${name}.png`});}
const only=process.env.ONLY?new RegExp(process.env.ONLY):null;
const jobs=[];
for(const w of ['d','t','p'])jobs.push([`banner-${w}`,async()=>{const {c,page}=await ctx(w);await settle(page);await footer(page,`banner-${w}`);await c.close();}]);
jobs.push(['banner-d-motionoff',async()=>{const {c,page}=await ctx('d',{motionOff:true});await settle(page);await footer(page,'banner-d-motionoff');await c.close();}]);
jobs.push(['banner-strip',async()=>{const {c,page}=await ctx('d');await settle(page);await page.evaluate(()=>sessionStorage.removeItem('zigoals-footer-intro-seen'));await page.reload();await settle(page);const f=page.locator('footer.site-footer');await f.scrollIntoViewIfNeeded();for(const ms of [0,400,800,1200,1600,2000,2400,2800,3200,4000]){await f.screenshot({path:`${out}/banner-strip-${String(ms).padStart(4,'0')}ms.png`});await page.waitForTimeout(ms===0?400:400);}await c.close();}]);
for(const w of ['d','t','p']){
 jobs.push([`hero-${w}`,async()=>{const {c,page}=await ctx(w);await settle(page);await shot(page,`hero-unfolded-${w}`);await page.evaluate(()=>window.scrollTo(0,420));await page.waitForTimeout(600);await shot(page,`hero-scrolled-${w}`);await c.close();}]);
 jobs.push([`herofold-${w}`,async()=>{const {c,page}=await ctx(w,{folded:true});await page.reload();await settle(page);await shot(page,`hero-folded-${w}`);await c.close();}]);
}
for(const theme of THEMES)for(const w of ['d','p'])for(const [n,p] of [['today','/app'],['habits','/app/habits'],['health','/app/health'],['wealth','/app/wealth'],['goals','/app/goals'],['settings','/app/settings']])
 jobs.push([`page-${theme}-${n}-${w}`,async()=>{const {c,page}=await ctx(w,{theme});await go(page,p);await shot(page,`${theme}-${n}-${w}`);await c.close();}]);
for(const w of ['d','p'])jobs.push([`sync-${w}`,async()=>{const {c,page}=await ctx(w);await go(page,'/app/settings');const s=page.locator('#encrypted-sync').first();if(await s.count()){await s.scrollIntoViewIfNeeded();await page.waitForTimeout(500);await shot(page,`sync-${w}`);}await go(page,'/app/settings/data');const r=page.getByText(/Restore from a backup/).first();if(await r.count()){await r.scrollIntoViewIfNeeded();await page.waitForTimeout(400);}await shot(page,`restore-${w}`);await c.close();}]);
for(const [n,f] of jobs){if(only&&!only.test(n))continue;try{await f();console.log('ok',n);}catch(e){console.log('FAIL',n,e.message.split('\n')[0]);}}
await browser.close();
