// Part 2 finale variants: the same build, each variant's CSS injected before the banner plays; a frame strip of the
// whole banner every 400 ms from 2.4 s to 7.2 s. flock /tmp/ae-browser.lock node finale-variants.mjs <base> <out>
import {createRequire} from 'node:module';
import {mkdirSync} from 'node:fs';
const require=createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium}=require('@playwright/test');
const [base,out]=process.argv.slice(2);mkdirSync(out,{recursive:true});
const V={
 S1:'',
 S2:`.site-footer-burst>i{width:340px!important;height:190px!important;left:-170px!important;top:-95px!important;filter:blur(20px)!important}
.site-footer[data-intro=play] .site-footer-burst>i{animation-duration:2.8s!important}
.site-footer-burst>i:nth-child(1){--mist:#23eaff8c!important}.site-footer-burst>i:nth-child(2){--mist:#9273ffa0!important}.site-footer-burst>i:nth-child(3){--mist:#f06dff8c!important}
.site-footer-twinkle{width:44px!important;height:44px!important;margin:-22px 0 0 -22px!important}
@keyframes sf-drift-mist{from{opacity:.2;transform:translate(-70px,20px) scale(.9)}60%{opacity:1}to{opacity:1;transform:none}}
@keyframes sf-drift-horizon{from{opacity:.25;transform:translate(48px,-16px) scale(.88)}55%{opacity:1;transform:translate(-6px,3px) scale(1.03)}to{opacity:1;transform:none}}`,
 S3:`.site-footer-burst{display:none!important}.site-footer-twinkle{width:18px!important;height:18px!important;margin:-9px 0 0 -9px!important}
@keyframes sf-emerge{from{opacity:0;transform:translateY(8px) scale(.96);filter:blur(0) drop-shadow(0 2px 14px #020918d9)}to{opacity:1;transform:none;filter:blur(0) drop-shadow(0 2px 14px #020918d9)}}`,
};
const browser=await chromium.launch({channel:'chrome'});
for(const [id,css] of Object.entries(V)){
 const c=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1});const page=await c.newPage();
 await page.route('**/api/**',r=>r.fulfill({status:503,body:'{}'}));
 await page.clock.setFixedTime(new Date('2026-10-16T09:30:00Z'));
 await page.goto(base+'/app/settings');
 await page.evaluate(()=>localStorage.setItem('zigoals:ui-prefs:v1',JSON.stringify({version:1,dismissed:{alphaNotice:true}})));
 await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 await page.locator('main h1').first().waitFor();await page.waitForTimeout(1500);
 await page.evaluate(()=>sessionStorage.removeItem('zigoals-footer-intro-seen'));await page.reload();await page.locator('main h1').first().waitFor();await page.waitForTimeout(1200);
 if(css)await page.addStyleTag({content:css});
 const f=page.locator('footer.site-footer');await f.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('.site-footer')?.getAttribute('data-intro')==='play',null,{timeout:10000});
 const t0=Date.now();
 for(let ms=2400;ms<=7200;ms+=400){const wait=t0+ms-Date.now();if(wait>0)await page.waitForTimeout(wait);await f.screenshot({path:`${out}/${id}-${String(ms).padStart(4,'0')}.png`});}
 console.log('ok',id);await c.close();
}
await browser.close();
