// Session AC captures (owner amendment 4): node capture.mjs <base> <outDir>
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium}=require('@playwright/test');
const [base,out]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
const W={d:{width:1440,height:900},t:{width:1024,height:768},p:{width:390,height:844}};
async function ctx(w,{motionOff=false}={}){
 const c=await browser.newContext({viewport:W[w],deviceScaleFactor:1,...(w==='p'?{isMobile:true,hasTouch:true}:{})});
 const page=await c.newPage();
 await page.route('**/api/**',r=>r.fulfill({status:503,body:'{}'}));
 await page.clock.setFixedTime(new Date('2026-10-16T09:30:00Z'));
 await page.goto(base+'/app/settings');
 if(motionOff)await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));
 await page.evaluate(()=>{try{const k='zigoals:ui-prefs:v1';localStorage.setItem(k,JSON.stringify({version:1,dismissed:{alphaNotice:false}}));}catch{}});
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 return {c,page};
}
async function settle(page){await page.locator('main h1').first().waitFor({timeout:30000});await page.waitForFunction(()=>!document.querySelector('[aria-busy="true"]'),null,{timeout:20000}).catch(()=>{});await page.waitForTimeout(1200);}
async function go(page,path){await page.goto(base+path);await settle(page);}
const shot=(page,name,opts={})=>page.screenshot({path:`${out}/${name}.png`,...opts});
async function scrolls(page,name){const h=await page.evaluate(()=>document.documentElement.scrollHeight),vh=page.viewportSize().height;
 for(const [k,y] of [['top',0],['middle',Math.max(0,h/2-vh/2)],['bottom',h]]){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(500);await shot(page,`${name}-${k}`);}}
const only=process.env.ONLY?new RegExp(process.env.ONLY):null;
const jobs=[];
for(const w of ['d','t','p'])jobs.push([`habits-${w}`,async()=>{const {c,page}=await ctx(w);await go(page,'/app/habits');await page.locator('.habit-card').first().scrollIntoViewIfNeeded();await shot(page,`habits-${w}`);await c.close();}]);
jobs.push(['habits-d-motionoff',async()=>{const {c,page}=await ctx('d',{motionOff:true});await go(page,'/app/habits');await page.locator('.habit-card').first().scrollIntoViewIfNeeded();await shot(page,'habits-d-motionoff');await c.close();}]);
for(const w of ['d','p'])jobs.push([`longpage-${w}`,async()=>{const {c,page}=await ctx(w);await go(page,'/app/wealth');await scrolls(page,`longpage-wealth-${w}`);await go(page,'/app/settings/reminders');await shot(page,`shortpage-reminders-${w}`);await c.close();}]);
for(const w of ['d','t','p'])jobs.push([`today-${w}`,async()=>{const {c,page}=await ctx(w);await settle(page);await shot(page,`today-${w}`,{fullPage:true});await c.close();}]);
for(const w of ['d','t','p'])jobs.push([`wealth-${w}`,async()=>{const {c,page}=await ctx(w);await go(page,'/app/wealth');await shot(page,`wealth-${w}`,{fullPage:true});await c.close();}]);
jobs.push(['health-water',async()=>{const {c,page}=await ctx('d');await go(page,'/app/health');for(const sel of ['.water-ring','#water']){const el=page.locator(sel).first();if(await el.count()){await el.scrollIntoViewIfNeeded();await el.screenshot({path:`${out}/health-${sel.replace(/[^a-z]/g,'')}.png`}).catch(()=>{});}}await c.close();}]);
jobs.push(['vision',async()=>{const {c,page}=await ctx('d');await go(page,'/app/goals');const b=page.getByRole('button',{name:/Vision board/}).first();if(await b.count())await b.click();else{const r=page.getByRole('radio',{name:/Vision/}).first();if(await r.count())await r.click();}await page.waitForTimeout(1500);const tile=page.locator('.vision-tile').first();if(await tile.count()){await tile.scrollIntoViewIfNeeded();const m=tile.getByRole('button',{name:/options|⋯|More/i}).first();if(await m.count())await m.click();await page.waitForTimeout(400);await shot(page,'goals-vision-tile');}await c.close();}]);
for(const w of ['d','p'])jobs.push([`settings-about-${w}`,async()=>{const {c,page}=await ctx(w);await go(page,'/app/settings/data');await shot(page,`settings-data-${w}`,{fullPage:true});await go(page,'/app/settings/reminders');const t=await page.title();await page.evaluate(t=>{const d=document.createElement('div');d.textContent='Tab title: '+t;d.style.cssText='position:fixed;top:0;left:0;right:0;z-index:99999;background:#fff;color:#000;font:16px sans-serif;padding:8px';document.body.append(d);},t);await shot(page,`reminders-title-${w}`);await c.close();}]);
for(const [n,f] of jobs){if(only&&!only.test(n))continue;try{await f();console.log('ok',n);}catch(e){console.log('FAIL',n,e.message.split('\n')[0]);}}
await browser.close();
