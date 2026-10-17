// Session AE captures: flock /tmp/ae-browser.lock node capture.mjs <base> <outDir>   (env ONLY=<regex>, THEMES=nebula,light,dark, DPR=1)
// Showcase, fixed clock 2026-10-16 09:30 UTC, every /api call answered 503 (no third party).
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium}=require('@playwright/test');
const [base,out]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const W={d:{width:1440,height:900},t:{width:1024,height:768},m:{width:768,height:1024},p:{width:390,height:844},n:{width:320,height:700}};
const THEMES=(process.env.THEMES??'nebula').split(',');
async function ctx(w,{motionOff=false,theme='nebula',folded=false,dpr=1,reduced=false}={}){
 const c=await browser.newContext({viewport:W[w],deviceScaleFactor:dpr,reducedMotion:reduced?'reduce':'no-preference',...(w==='p'||w==='n'?{isMobile:true,hasTouch:true}:{})});
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
async function footer(page,name){const f=page.locator('footer.site-footer');await f.scrollIntoViewIfNeeded();await page.waitForTimeout(8000);await f.screenshot({path:`${out}/${name}.png`});}
/** Crops around the hero art's former boundaries: under the status row, its right edge by the rail, its foot, the rail gap. */
async function seams(page,w){
 const r=await page.evaluate(()=>{const h=document.querySelector('.today-hero');const rail=document.querySelector('.today-rail');if(!h)return null;const b=h.getBoundingClientRect(),rb=rail?.getBoundingClientRect();return {l:b.left,t:b.top+scrollY,r:b.right,b:b.bottom+scrollY,rl:rb?rb.left:null};});
 if(!r)return;const vw=W[w].width,clip=(x,y,wd,ht)=>({x:Math.max(0,Math.round(x)),y:Math.max(0,Math.round(y)),width:Math.round(Math.min(wd,vw-Math.max(0,x))),height:Math.round(ht)});
 await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(300);
 await shot(page,`seam-top-${w}`,{fullPage:true,clip:clip(r.l-40,r.t-110,r.r-r.l+80,180)});
 await shot(page,`seam-right-${w}`,{fullPage:true,clip:clip(r.r-200,r.t-60,320,r.b-r.t+160)});
 await shot(page,`seam-foot-${w}`,{fullPage:true,clip:clip(r.l-40,r.b-120,r.r-r.l+80,260)});
}
const only=process.env.ONLY?new RegExp(process.env.ONLY):null;
const jobs=[];
// Today's hero (Part 1)
for(const w of ['d','t','m','p']){
 jobs.push([`hero-${w}`,async()=>{const {c,page}=await ctx(w);await settle(page);await shot(page,`hero-unfolded-${w}`);await seams(page,w);await page.evaluate(()=>window.scrollTo(0,420));await page.waitForTimeout(600);await shot(page,`hero-scrolled-${w}`);await c.close();}]);
 jobs.push([`herofold-${w}`,async()=>{const {c,page}=await ctx(w,{folded:true});await page.reload();await settle(page);await shot(page,`hero-folded-${w}`);await c.close();}]);
}
jobs.push(['hero-d2',async()=>{const {c,page}=await ctx('d',{dpr:2});await settle(page);await shot(page,'hero-unfolded-d-2x');await c.close();}]);
// The footer banner (Part 2)
// Gate C: the hero and the banner in Light and Dark (themed versions of Parts 1 and 2)
for(const theme of ['light','dark'])for(const w of ['d','t','m','p']){jobs.push([`themehero-${theme}-${w}`,async()=>{const {c,page}=await ctx(w,{theme});await settle(page);await shot(page,`hero-${theme}-${w}`);await c.close();}]);if(w!=='m')jobs.push([`themebanner-${theme}-${w}`,async()=>{const {c,page}=await ctx(w,{theme});await settle(page);await footer(page,`banner-${theme}-${w}`);await c.close();}]);}
for(const w of ['d','t','p'])jobs.push([`banner-${w}`,async()=>{const {c,page}=await ctx(w);await settle(page);await footer(page,`banner-${w}`);await c.close();}]);
jobs.push(['banner-d-motionoff',async()=>{const {c,page}=await ctx('d',{motionOff:true});await settle(page);await footer(page,'banner-d-motionoff');await c.close();}]);
jobs.push(['banner-strip',async()=>{const {c,page}=await ctx('d');await settle(page);await page.evaluate(()=>sessionStorage.removeItem('zigoals-footer-intro-seen'));await page.reload();await settle(page);const f=page.locator('footer.site-footer');await f.scrollIntoViewIfNeeded();const t0=Date.now();for(let ms=0;ms<=7500;ms+=500){const wait=t0+ms-Date.now();if(wait>0)await page.waitForTimeout(wait);await f.screenshot({path:`${out}/banner-strip-${String(ms).padStart(4,'0')}ms.png`});}await c.close();}]);
jobs.push(['launchers',async()=>{const {c,page}=await ctx('d');await settle(page);await shot(page,'launchers-d',{clip:{x:1440-260,y:900-320,width:260,height:320}});await c.close();}]);
// The sidebar (Part 4.1) at 2x
for(const theme of THEMES)jobs.push([`sidebar-${theme}`,async()=>{const {c,page}=await ctx('d',{theme,dpr:2});await settle(page);await shot(page,`sidebar-${theme}-2x`,{clip:{x:0,y:0,width:230,height:900}});await c.close();}]);
// Habits S3 and S4 (Part 4.3/4.4)
for(const w of ['d','p'])jobs.push([`habits-s3-${w}`,async()=>{const {c,page}=await ctx(w);await go(page,'/app/habits');const s=page.locator('.habit-section').first();await s.scrollIntoViewIfNeeded();await page.waitForTimeout(500);await s.screenshot({path:`${out}/habits-s3-${w}.png`});await c.close();}]);
jobs.push(['habits-s4',async()=>{const {c,page}=await ctx('d');await go(page,'/app/habits');await page.getByRole('button',{name:/Unlock layout to rearrange/}).first().click();await page.waitForTimeout(600);const r=page.locator('.habit-routines').first();await r.scrollIntoViewIfNeeded();await page.waitForTimeout(500);await shot(page,'habits-s4-d');await c.close();}]);
// The top bar and the wallet card (Parts 4.2, 6)
for(const w of ['d','p'])jobs.push([`topbar-${w}`,async()=>{const {c,page}=await ctx(w);await settle(page);await shot(page,`topbar-${w}`,{clip:{x:0,y:0,width:W[w].width,height:220}});const card=page.locator('.account-panel').first();if(await card.count()){await card.scrollIntoViewIfNeeded();await card.screenshot({path:`${out}/wallet-card-${w}.png`});}await c.close();}]);
// Every page with a header (Part 4.5) and each theme on the main pages (Part 3)
const PAGES=[['today','/app'],['goals','/app/goals'],['habits','/app/habits'],['health','/app/health'],['wealth','/app/wealth'],['markets','/app/markets'],['staking','/app/staking'],['portfolio','/app/portfolio'],['ecosystem','/app/ecosystem'],['activity','/app/activity'],['chess','/app/chess'],['settings','/app/settings'],['help','/app/help'],['journey','/app/journey'],['review','/app/review'],['calculator','/app/wealth/calculator'],['reminders','/app/settings/reminders'],['data','/app/settings/data'],['templates','/app/goals/templates'],['newgoal','/app/goals/new'],['share','/app/share'],['zigi','/app/zigi']];
const MAIN=new Set(['today','goals','habits','health','wealth','markets','staking','portfolio','ecosystem','activity','chess','settings','help']);
for(const theme of THEMES)for(const w of ['d','p'])for(const [n,p] of PAGES){
 if(theme!=='nebula'&&!MAIN.has(n)&&w==='p')continue;
 jobs.push([`page-${theme}-${n}-${w}`,async()=>{const {c,page}=await ctx(w,{theme});await go(page,p);await shot(page,`${theme}-${n}-${w}`);await c.close();}]);
}
for(const [n,f] of jobs){if(only&&!only.test(n))continue;try{await f();console.log('ok',n);}catch(e){console.log('FAIL',n,e.message.split('\n')[0]);}}
await browser.close();
