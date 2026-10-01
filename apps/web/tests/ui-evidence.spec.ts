import {expect,test,type Page} from '@playwright/test';
import {isPhone} from './phone-nav';

// Evidence for the UI design pass checks (Part 12): motion settings, forced colours, keyboard-only layouts,
// hydration and phone width, on every main page. Showcase (fictional) data only.
const PAGES=['/app','/app/goals','/app/staking','/app/habits','/app/health','/app/wealth','/app/markets','/app/ecosystem','/app/activity','/app/settings'];
async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
const open=async(page:Page,path:string)=>{await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();};
/** Running animations, and transitions of anything that moves an element (colour fades are not motion). */
const MOTION=/^(transform|translate|scale|rotate|top|left|right|bottom|inset|margin.*|width|height|background-position.*)$/;
const moving=(page:Page)=>page.evaluate(src=>{const motion=new RegExp(src);return document.getAnimations().filter(a=>a.playState==='running'&&Number(a.effect?.getTiming().duration??0)>0&&(!('transitionProperty' in a)||motion.test((a as CSSTransition).transitionProperty))).map(a=>{const t=(a.effect as KeyframeEffect|null)?.target as Element|null;return `${(a as CSSAnimation).animationName??(a as CSSTransition).transitionProperty??'script'} on ${t?.className?.toString().slice(0,40)??t?.tagName}`;});},MOTION.source);
/** Press Tab until the focused element has this accessible name (keyboard only; no clicks, no programmatic focus). */
async function tabTo(page:Page,name:string,limit=400){
 for(let i=0;i<limit;i++){await page.keyboard.press('Tab');if(await page.evaluate(n=>{const e=document.activeElement as HTMLElement|null;return !!e&&(e.getAttribute('aria-label')===n||e.textContent?.trim()===n);},name))return;}
 throw Error(`Tab never reached "${name}"`);
}

for(const setting of ['reduced motion','Motion Off'] as const)
 test.describe(`${setting}`,()=>{
  test.beforeEach(async({page})=>{if(setting==='reduced motion')await page.emulateMedia({reducedMotion:'reduce'});else await page.addInitScript(()=>localStorage.setItem('zigoals:motion:v1','off'));});
  test('gradient sweeps, entrances and page arrivals never run on any main page',async({page})=>{
   await showcase(page);
   for(const path of PAGES){await open(page,path);await page.waitForTimeout(250);expect(await moving(page),path).toEqual([]);
    expect(await page.locator('.nebula-flow[data-entrance="play"],[data-arrive]').count(),path).toBe(0);}
  });
  test('hover and a mouse drag move nothing on their own: no lift, no glide, no transition',async({page,isMobile})=>{
   test.skip(isMobile,'Hover and mouse drag need a fine pointer; the keyboard flow below covers phones');
   await showcase(page);await open(page,'/app/goals');
   const cards=page.locator('.goal-grid .unified-goal-card');await expect(cards.nth(2)).toBeVisible();
   const r=(await cards.nth(1).boundingBox())!;await page.mouse.move(r.x+r.width*.4,r.y+r.height*.4);await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5,{steps:3});await page.waitForTimeout(200);
   expect(await cards.nth(1).evaluate(e=>{const s=getComputedStyle(e);return [s.translate,s.scale];})).toEqual(['none','none']);
   expect(await moving(page)).toEqual([]);
   const order=()=>page.evaluate(()=>[...document.querySelectorAll<HTMLElement>('[data-layout-region="goals:cards"]')].map(e=>e.dataset.layoutItem));
   const before=await order();
   await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();
   const handle=cards.first().locator('.layout-handle');await handle.scrollIntoViewIfNeeded();const h=(await handle.boundingBox())!,target=(await cards.nth(2).boundingBox())!;
   await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();await page.mouse.move(h.x+h.width/2+12,h.y+h.height/2,{steps:3});
   await expect(page.locator('.layout-ghost')).toHaveCount(1);
   await page.mouse.move(target.x+target.width*.8,h.y+h.height/2,{steps:8});
   expect(await moving(page),'while dragging').toEqual([]);
   await page.mouse.up();expect(await moving(page),'after the drop').toEqual([]);
   await expect.poll(order).not.toEqual(before);
   await page.getByRole('button',{name:'Reset this page',exact:true}).click();await expect.poll(order).toEqual(before);
  });
 });

test('forced colours: every main page renders and keyboard focus stays visible',async({page})=>{
 await page.emulateMedia({forcedColors:'active'});await showcase(page);
 for(const path of PAGES){
  await open(page,path);
  const hidden:string[]=[];
  for(let i=0;i<14;i++){await page.keyboard.press('Tab');const r=await page.evaluate(()=>{const e=document.activeElement as HTMLElement|null;if(!e||e===document.body)return null;const c=getComputedStyle(e),b=e.getBoundingClientRect();
   // In forced colours box-shadow is dropped, so a visible focus indicator is a real outline.
   const ring=c.outlineStyle!=='none'&&parseFloat(c.outlineWidth)>=1;return ring||!b.width?null:`${e.tagName}.${e.className.toString().slice(0,30)} "${(e.getAttribute('aria-label')??e.textContent??'').trim().slice(0,30)}"`;});if(r)hidden.push(r);}
  expect(hidden,path).toEqual([]);
 }
});

// The first card of each page moves. On a phone (Session E) Wealth starts with the pulse and your assets instead.
for(const [path,region,desktopLabel,phoneLabel] of [['/app/health','health:body','Today’s nourishment','Today’s nourishment'],['/app/wealth','wealth:body','The shape of your wealth','Portfolio pulse']] as const)
 test(`keyboard only: unlock, move, hear it, reset and lock the ${path.split('/').at(-1)} layout`,async({page})=>{
  await showcase(page);await open(page,path);
  const label=await isPhone(page)?phoneLabel:desktopLabel;
  const order=()=>page.evaluate(r=>[...document.querySelectorAll<HTMLElement>(`[data-layout-region="${r}"]`)].map(e=>e.dataset.layoutItem),region);
  const before=await order(),count=before.length;expect(count).toBeGreaterThanOrEqual(4);
  await page.locator('body').click({position:{x:1,y:1}}).catch(()=>{});
  await tabTo(page,'Unlock layout to rearrange');await page.keyboard.press('Enter');
  await expect(page.getByRole('button',{name:'Lock layout',exact:true})).toBeFocused();
  await tabTo(page,`Move ${label} down`);await page.keyboard.press('Enter');
  await expect(page.locator('[data-layout-announcer]')).toHaveText(`Moved ${label} to position 2 of ${count}.`);
  await expect(page.getByRole('button',{name:`Move ${label} down`,exact:true})).toBeFocused();
  expect((await order())[1]).toBe(before[0]);
  await tabTo(page,'Reset this page');await page.keyboard.press('Enter');
  await expect.poll(order).toEqual(before);
  await tabTo(page,'Done');await page.keyboard.press('Enter');
  await expect(page.locator('.layout-controls')).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Unlock layout to rearrange',exact:true})).toBeVisible();
 });

test('unlocked layouts: each card keeps its move controls inside itself, never over another card\'s',async({page})=>{
 await showcase(page);
 for(const path of PAGES){await open(page,path);
  const lock=page.getByRole('button',{name:'Unlock layout to rearrange',exact:true});if(!await lock.count())continue;
  await lock.first().click();await expect(page.locator('.layout-controls').first()).toBeVisible();
  const problems=await page.evaluate(()=>{const bars=[...document.querySelectorAll<HTMLElement>('.layout-controls')].map(e=>({name:e.getAttribute('aria-label')??'',box:e.getBoundingClientRect(),card:e.parentElement!.getBoundingClientRect(),flow:getComputedStyle(e).flexDirection}));const out:string[]=[];
   for(const b of bars){if(b.box.left<b.card.left-1||b.box.right>b.card.right+1)out.push(`${b.name} spills out of its card`);if(b.box.height>110||b.flow!=='row')out.push(`${b.name} is not a toolbar row (${Math.round(b.box.height)}px, ${b.flow})`);}
   bars.forEach((a,i)=>bars.slice(i+1).forEach(c=>{if(a.box.left<c.box.right&&c.box.left<a.box.right&&a.box.top<c.box.bottom&&c.box.top<a.box.bottom)out.push(`${a.name} overlaps ${c.name}`);}));
   return out;});
  expect(problems,path).toEqual([]);
  await page.getByRole('button',{name:'Lock layout',exact:true}).first().click();
 }
});

test('no hydration errors or page errors on any main page',async({page})=>{
 const problems:string[]=[];
 page.on('console',m=>{if(/hydrat|did not match|server rendered/i.test(m.text()))problems.push(`${m.type()}: ${m.text().slice(0,200)}`);});
 page.on('pageerror',e=>problems.push(`pageerror: ${e.message.slice(0,200)}`));
 await showcase(page);
 for(const path of PAGES){await open(page,path);await page.waitForTimeout(700);}
 // A cold load of each page too (no client-side navigation).
 for(const path of PAGES){await page.reload();await page.goto(path);await expect(page.locator('main h1').first()).toBeVisible();await page.waitForTimeout(400);}
 expect(problems).toEqual([]);
});

test('no horizontal overflow at 390px on any main page',async({page})=>{
 await page.setViewportSize({width:390,height:844});await showcase(page);
 for(const path of PAGES){await open(page,path);await page.waitForTimeout(300);
  expect(await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth})),path).toEqual({scroll:390,width:390});}
});
