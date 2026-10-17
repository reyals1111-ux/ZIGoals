// Part 1 variants: inject each scene variant into the running build's Today and capture 1440/1024/768/390 + seam crops.
// flock /tmp/ae-browser.lock node variants.mjs <base> <out> [variantIds]
import {createRequire} from 'node:module';
import {mkdirSync, readFileSync} from 'node:fs';
const require=createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium}=require('@playwright/test');
const [base,out,only]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const V=JSON.parse(readFileSync(new URL('./variants.json',import.meta.url),'utf8'));
const W={d:{width:1440,height:900},t:{width:1024,height:768},m:{width:768,height:1024},p:{width:390,height:844}};
const browser=await chromium.launch({channel:'chrome'});
async function ctx(w){
 const c=await browser.newContext({viewport:W[w],deviceScaleFactor:1,reducedMotion:'reduce',...(w==='p'?{isMobile:true,hasTouch:true}:{})});
 const page=await c.newPage();
 await page.route('**/api/**',r=>r.fulfill({status:503,body:'{}'}));
 await page.route('**/art/v27/**',r=>{const f=new URL(r.request().url()).pathname;r.fulfill({status:200,contentType:f.endsWith('.avif')?'image/avif':'image/webp',body:readFileSync('/home/user/ZIGoals/apps/web/public'+f)});});
 await page.clock.setFixedTime(new Date('2026-10-16T09:30:00Z'));
 await page.goto(base+'/app/settings');
 await page.evaluate(()=>{localStorage.setItem('zigoals:ui-prefs:v1',JSON.stringify({version:1,dismissed:{alphaNotice:true}}));});
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 await page.locator('main h1').first().waitFor({timeout:30000});await page.waitForTimeout(1500);
 await page.evaluate(async()=>{await Promise.all(['/art/v27/hero-scene.avif','/art/v27/hero-scene-mobile.avif','/art/v21/hero.webp'].map(u=>{const i=new Image();i.src=u;return i.decode().catch(()=>{});}));});
 return {c,page};
}
const HIDE=`.app-sidebar,.status-row,.alpha-notice,.today-hero-copy,.hero-pillars>*,.today-rail,.today-focus,.dashboard-widget-area,.layout-lock,.hero-fold,.music-launcher-stack,.ai-launcher,.ai-edge-tab,main>*:not(.today-page),.today-page>*:not(.today-layout),.today-primary>*:not(.today-hero){visibility:hidden!important}.hero-pillars{background:none!important}`;
const ARTONLY=process.env.ARTONLY==='1';
for(const w of ['d','t','m','p']){
 const {c,page}=await ctx(w);
 if(ARTONLY)await page.addStyleTag({content:HIDE});
 for(const v of [{id:'before',css:''},...V]){
  if(only&&!only.split(',').includes(v.id))continue;
  await page.evaluate(({css,html})=>{document.getElementById('ae-variant')?.remove();document.querySelector('.today-scene')?.remove();const s=document.createElement('style');s.id='ae-variant';s.textContent=css;document.head.appendChild(s);const h=document.querySelector('.today-hero:not(.today-hero-folded)');if(h&&html){const d=document.createElement('div');d.className='today-scene';d.setAttribute('aria-hidden','true');h.prepend(d);}},{css:v.css,html:v.html??''});
  await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1400);
  await page.screenshot({path:`${out}/${v.id}-${w}.png`});if(ARTONLY){console.log('ok',v.id,w);continue;}
  const r=await page.evaluate(()=>{const h=document.querySelector('.today-hero');const b=h.getBoundingClientRect();return {l:b.left,t:b.top+scrollY,r:b.right,b:b.bottom+scrollY};});
  const vw=W[w].width,clip=(x,y,wd,ht)=>({x:Math.max(0,Math.round(x)),y:Math.max(0,Math.round(y)),width:Math.round(Math.min(wd,vw-Math.max(0,x))),height:Math.round(ht)});
  await page.screenshot({path:`${out}/${v.id}-${w}-seamtop.png`,fullPage:true,clip:clip(r.l-40,r.t-110,r.r-r.l+80,180)});
  await page.screenshot({path:`${out}/${v.id}-${w}-seamright.png`,fullPage:true,clip:clip(r.r-200,r.t-60,320,r.b-r.t+200)});
  await page.screenshot({path:`${out}/${v.id}-${w}-seamfoot.png`,fullPage:true,clip:clip(r.l-40,r.b-140,r.r-r.l+80,320)});
  console.log('ok',v.id,w);
 }
 await c.close();
}
await browser.close();
