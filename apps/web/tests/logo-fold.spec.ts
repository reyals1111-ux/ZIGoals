import {expect,test,type Page} from '@playwright/test';
import {FOLD,LOGO_Z,READY_MS} from '../components/logo-intro-decision';

/**
 * Logo fold intro (Session I). Counts every <video> the page creates (even detached ones, such as a format probe), every
 * video inserted into the document, and every fold or media request, from the very first script on.
 */
const RECORDER=()=>{
 type Rect={x:number;y:number;width:number;height:number};
 const seen={created:0,inserted:0,clips:0,states:[] as string[],ending:null as null|{clip:Rect;logo:Rect;crossfade:string},insertedAt:null as null|number,errorAt:null as null|number,removedAt:null as null|number};Object.assign(window,{foldSeen:seen});
 // The hand-over lasts a few hundred ms: measure it in the page the moment it starts, rather than polling for it.
 new MutationObserver(records=>{for(const r of records){const clip=r.target as HTMLElement;if(!clip.matches('video.logo-intro'))continue;const state=clip.dataset.state??'';if(seen.states.at(-1)!==state)seen.states.push(state);
  if(state==='ending'&&!seen.ending){const logo=document.querySelector('.brand-logo[data-intro]')!,box=(e:Element)=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height};};seen.ending={clip:box(clip),logo:box(logo),crossfade:getComputedStyle(clip).transitionDuration};}}})
  .observe(document,{subtree:true,attributes:true,attributeFilter:['data-state']});
 const create=Document.prototype.createElement;
 Document.prototype.createElement=function(this:Document,tag:string,options?:ElementCreationOptions){if(String(tag).toLowerCase()==='video')seen.created++;return create.call(this,tag,options);} as typeof create;
 // Page time of the clip's insertion, of the first error its sources report (the 404 route, in the error tests) and of its removal.
 const isClip=(v:Element)=>v.matches('video.logo-intro');
 new MutationObserver(records=>{for(const r of records){
  for(const n of r.addedNodes){if(!(n instanceof Element))continue;const videos=[...(n.matches('video')?[n]:[]),...n.querySelectorAll('video')];seen.inserted+=videos.length;
   for(const v of videos.filter(isClip)){seen.clips++;seen.insertedAt??=performance.now();v.addEventListener('error',()=>{seen.errorAt??=performance.now();},true);}}
  for(const n of r.removedNodes){if(n instanceof Element&&(isClip(n)||n.querySelector('video.logo-intro')))seen.removedAt??=performance.now();}
 }}).observe(document,{subtree:true,childList:true});
};
type Rect={x:number;y:number;width:number;height:number};
type Seen={created:number;inserted:number;clips:number;states:string[];ending:null|{clip:Rect;logo:Rect;crossfade:string};insertedAt:null|number;errorAt:null|number;removedAt:null|number};
const seen=(page:Page)=>page.evaluate(()=>(window as unknown as {foldSeen:Seen}).foldSeen);
const LAYOUTS=[{name:'this project\'s own size',viewport:null},{name:'the narrow-tablet header',viewport:{width:820,height:1180}}] as const;

async function open(page:Page,viewport:{width:number;height:number}|null){
 if(viewport)await page.setViewportSize(viewport);
 const requests:string[]=[];
 page.on('request',r=>{if(r.url().includes('/brand/logo-fold/')||r.resourceType()==='media')requests.push(r.url());});
 await page.route('**/api/**',route=>route.fulfill({status:503,json:{error:'Offline fictional fold fixture'}}));
 await page.addInitScript(RECORDER);
 return requests;
}
/** The static Z this layout shows: the sidebar's below 768 px it is the phone top bar's. */
async function staticLogo(page:Page){
 const sidebar=page.locator('.app-sidebar img.brand-logo');
 return await sidebar.isVisible()&&(await sidebar.boundingBox())!.width>0?sidebar:page.locator('.phone-home img.brand-logo');
}

for(const layout of LAYOUTS)
 for(const setting of ['reduced motion','Motion Off'] as const)
  test(`${setting} (${layout.name}): no video is ever created or requested, and the static Z stays`,async({page})=>{
   if(setting==='reduced motion')await page.emulateMedia({reducedMotion:'reduce'});
   else await page.addInitScript(()=>localStorage.setItem('zigoals:motion:v1','off'));
   const requests=await open(page,layout.viewport);
   // The first app load of the session, on pages without the Today film's own <video>, so any video would be the fold.
   await page.goto('/app/habits');const logo=await staticLogo(page);await expect(logo).toBeVisible();
   // A fixed wait, not networkidle: Next's cancelled link prefetches can keep networkidle from ever firing (see #50).
   await page.goto('/app/goals');await expect(page.locator('main h1')).toBeVisible();await page.waitForTimeout(2000);
   expect(await seen(page)).toEqual({created:0,inserted:0,clips:0,states:[],ending:null,insertedAt:null,errorAt:null,removedAt:null});
   expect(requests).toEqual([]);
   expect(await page.evaluate(()=>sessionStorage.getItem('zigoals:logo-intro:v1'))).toBeNull();
   // The shell recorded why it declined (Session P): the setting, not a hidden host or a played session.
   await expect(page.locator('html')).toHaveAttribute('data-logo-intro',setting==='reduced motion'?'reduced-motion':'motion-off');
   expect(await (await staticLogo(page)).evaluate(e=>[getComputedStyle(e).opacity,e.hasAttribute('data-intro')])).toEqual(['1',false]);
  });

for(const layout of LAYOUTS)
 test(`the fold plays once per browser session over the static Z (${layout.name}) and settles exactly on it`,async({page},info)=>{
  test.setTimeout(60000);
  const requests=await open(page,layout.viewport);
  await page.goto('/app');
  const logo=await staticLogo(page),box=await logo.boundingBox(),clip=page.locator('video.logo-intro');
  await expect.poll(async()=>(await seen(page)).clips).toBe(1);
  expect(await page.evaluate(()=>sessionStorage.getItem('zigoals:logo-intro:v1'))).toBe('played');
  // WebM first, then MP4; muted, inline, no controls, no loop, hidden from assistive tech, and nothing preloaded before play.
  expect(await clip.evaluate(v=>{const c=v as HTMLVideoElement;return {sources:[...c.querySelectorAll('source')].map(s=>s.getAttribute('src')),muted:c.muted,inline:c.hasAttribute('playsinline'),controls:c.controls,loop:c.loop,hidden:c.getAttribute('aria-hidden'),preload:c.getAttribute('preload'),tab:c.tabIndex,rate:c.playbackRate,blend:getComputedStyle(c).mixBlendMode,pointer:getComputedStyle(c).pointerEvents};})).toEqual({
   sources:['/brand/logo-fold/logo-fold.webm','/brand/logo-fold/logo-fold.mp4'],muted:true,inline:true,controls:false,loop:false,hidden:'true',preload:'none',tab:-1,rate:1,blend:'screen',pointer:'none'});
  const playable=await page.evaluate(()=>{const v=document.createElement('video');return v.canPlayType('video/webm; codecs="vp9"')!==''||v.canPlayType('video/mp4; codecs="avc1.64001F"')!=='';});
  test.skip(!playable,'This browser can decode neither fold format; the failure tests cover the static fallback.');
  await expect(clip).toHaveAttribute('data-state','playing',{timeout:4000});
  await expect(logo).toHaveAttribute('data-intro','playing');
  // The widest figures (swan, heart, bull) stay inside the sidebar: it never scrolls sideways while the clip plays.
  for(const at of [2500,4500,8500]){
   await page.waitForFunction(t=>{const v=document.querySelector('video.logo-intro') as HTMLVideoElement|null;return !v||v.currentTime*1000>=t;},at,{timeout:15000});
   expect(await page.locator('.app-sidebar').evaluate(e=>e.scrollWidth-e.clientWidth),`${at} ms`).toBe(0);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),`${at} ms`).toBe(0);
  }
  await page.screenshot({path:info.outputPath('fold-playing.png')});
  // The hand-over: the final frame's Z sits exactly on the static Z (no jump), then a crossfade of at most 300 ms.
  await expect.poll(async()=>(await seen(page)).ending,{timeout:15000}).not.toBeNull();
  const {ending,states}=await seen(page),{clip:v,logo:l}=ending!,k=v.width/FOLD.w;
  // Inserted as "waiting" (hidden until its first frame), then exactly one playing phase and one hand-over.
  expect(states).toEqual(['playing','ending']);
  for(const [a,b,edge] of [[v.x+FOLD.z.x*k,l.x+LOGO_Z.x*l.width,'left'],[v.y+FOLD.z.y*k,l.y+LOGO_Z.y*l.height,'top'],[v.x+(FOLD.z.x+FOLD.z.w)*k,l.x+(LOGO_Z.x+LOGO_Z.w)*l.width,'right'],[v.y+(FOLD.z.y+FOLD.z.h)*k,l.y+(LOGO_Z.y+LOGO_Z.h)*l.height,'bottom']] as const)
   expect(Math.abs(a-b),`final frame ${edge}`).toBeLessThanOrEqual(1);
  // The crossfade (opacity, the first transition) takes at most 300 ms.
  expect(parseFloat(ending!.crossfade.split(',')[0]??'')*1000).toBeLessThanOrEqual(300);
  await expect(clip).toHaveCount(0,{timeout:1000});
  await expect(logo).not.toHaveAttribute('data-intro');
  // It left because it ended (Session P): not a fallback, an error or a resize.
  await expect(logo).toHaveAttribute('data-intro-end','ended');
  await expect(page.locator('html')).toHaveAttribute('data-logo-intro','playing');
  expect(await logo.evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
  expect(await logo.boundingBox()).toEqual(box);
  expect(requests.length).toBeGreaterThan(0);expect(requests.every(url=>url.includes('/brand/logo-fold/'))).toBe(true);
  // Once per browser session: a reload or another page never plays it again.
  await page.reload();await expect(logo).toBeVisible();await page.waitForTimeout(1600);
  expect((await seen(page)).clips).toBe(0);
 });

test('clicking the Z while the fold plays navigates normally; the clip never takes pointer or keyboard focus',async({page})=>{
 await open(page,null);
 await page.goto('/app/habits');
 const clip=page.locator('video.logo-intro');
 await expect.poll(async()=>(await seen(page)).clips).toBe(1);
 const home=page.locator('.app-sidebar .brand').or(page.locator('.phone-home')).filter({visible:true});
 await home.click();await page.waitForURL(/\/app$/);
 expect(await clip.evaluateAll(els=>els.every(e=>(e as HTMLVideoElement).tabIndex===-1))).toBe(true);
});

/**
 * Session P: the clip records why it left (`data-intro-end` on the static Z, logo-intro.tsx), so these assert the cause
 * instead of a timing window. Before, the error test allowed 1.4 s for the routed 404 while the clip's own fallback is
 * 1.5 s, and the window was measured from a poll, not from the clip; the two mostly overlapped, and under load they did
 * not. Reading the cause also showed that a Chromium without H.264 (the sandbox's) skips the MP4 source for its type
 * without an error event, so the clip only ever left on the fallback there while real Chrome got the MP4 404; the clip
 * now reads the end of the browser's source list from networkState and leaves at once in both. The 404 is still
 * delivered by the test runner; when it reaches the browser only after that fallback (measured in page time), the
 * scenario did not happen and is repeated on a fresh page, at most three times, like market-fanout's "runner too slow"
 * rule. No assertion is relaxed.
 */
for(const failure of ['error','not ready'] as const)
 for(const layout of LAYOUTS)
  test(`the static Z stays when the fold ${failure==='error'?'fails to load':'is not ready in time'} (${layout.name})`,async({page})=>{
   const lateness:number[]=[];
   for(let attempt=1;;attempt++){
    const target=attempt===1?page:await page.context().newPage();
    await open(target,layout.viewport);
    await target.route('**/brand/logo-fold/**',route=>failure==='error'?route.fulfill({status:404,body:''}):new Promise(()=>{}));
    await target.goto('/app');
    const logo=await staticLogo(target);
    await expect.poll(async()=>(await seen(target)).clips).toBe(1);
    await expect(logo).toHaveAttribute('data-intro-end',/^(error|timeout)$/,{timeout:5000});
    // Gone at once, and the static Z is itself again.
    await expect(target.locator('video.logo-intro')).toHaveCount(0,{timeout:500});
    await expect(logo).not.toHaveAttribute('data-intro');
    expect(await logo.evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
    const why=await logo.getAttribute('data-intro-end');
    if(failure==='not ready'){expect(why).toBe('timeout');return;}
    if(why==='error')return;
    // 'timeout' in the error scenario: the 404 had not reached the browser when the fallback fired. It must still arrive
    // (the route works), and the clip must have left on the fallback before it did; then the scenario is repeated.
    await expect.poll(async()=>(await seen(target)).errorAt,{message:'the routed 404 never reached the browser'}).not.toBeNull();
    const s=await seen(target);
    expect(s.removedAt,'removed before the late 404').not.toBeNull();expect(s.errorAt!).toBeGreaterThanOrEqual(s.removedAt!);
    lateness.push(Math.round(s.errorAt!-s.insertedAt!));
    if(attempt===3)throw new Error(`runner too slow: the routed 404 reached the browser ${lateness.join(', ')} ms after the clip, past its ${READY_MS} ms fallback, three times`);
    await target.close();
   }
  });

test('keyboard focus on the phone top bar Z is never covered by the fold',async({page,isMobile})=>{
 test.skip(!isMobile,'The top bar Z exists on phones; the sidebar case is in a11y-motion-dialogs.spec.ts.');
 await open(page,null);
 // Hold the clip in place (its frames never arrive), so focus is checked while it is on screen.
 await page.route('**/brand/logo-fold/**',()=>new Promise(()=>{}));
 await page.goto('/app');
 const clip=page.locator('video.logo-intro');
 await expect(clip).toHaveCount(1);
 await clip.evaluate(e=>{e.setAttribute('data-state','playing');document.querySelector('.phone-home img.brand-logo')!.setAttribute('data-intro','playing');});
 await page.locator('.phone-home').focus();
 await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
 await expect(page.locator('.phone-home')).toBeFocused();
 expect(await page.locator('.phone-home').evaluate(e=>e.matches(':focus-visible'))).toBe(true);
 expect(await clip.evaluate(e=>getComputedStyle(e).display)).toBe('none');
 expect(await page.locator('.phone-home img.brand-logo').evaluate(e=>getComputedStyle(e).opacity)).toBe('1');
});
