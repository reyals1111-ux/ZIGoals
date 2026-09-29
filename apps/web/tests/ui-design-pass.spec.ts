import {expect,test,type Page} from '@playwright/test';

async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
/** WCAG relative-luminance contrast between a computed rgb() colour and a background hex. */
function contrast(rgb:string,bg:string){
 const channel=(v:number)=>{const c=v/255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4;};
 const lum=(r:number,g:number,b:number)=>.2126*channel(r)+.7152*channel(g)+.0722*channel(b);
 const [r,g,b]=rgb.match(/\d+(\.\d+)?/g)!.slice(0,3).map(Number);const [R,G,B]=[1,3,5].map(i=>parseInt(bg.slice(i,i+2),16));
 const a=lum(r!,g!,b!),z=lum(R!,G!,B!);return (Math.max(a,z)+.05)/(Math.min(a,z)+.05);
}

test.describe('Part 1: readability foundation',()=>{
 test('page ledes and eyebrows use the shared header system',async({page,isMobile})=>{
  await showcase(page);
  for(const [path,lede] of [['/app','Make room for a brighter tomorrow.'],['/app/goals','Small steps. A bigger future. Every plan starts with you.'],['/app/habits','Make room for what matters. Every small return adds to the pattern.'],['/app/health','Your food, water, movement and progress. Your private journal.']] as const){
   await page.goto(path);
   const el=page.locator('main .page-lede').filter({hasText:lede}).first();await expect(el).toBeVisible();
   const style=await el.evaluate(e=>{const s=getComputedStyle(e);return {size:parseFloat(s.fontSize),weight:Number(s.fontWeight),color:s.color};});
   expect(style.size).toBeGreaterThanOrEqual(isMobile?16:18);expect(style.weight).toBeGreaterThanOrEqual(500);
   expect(contrast(style.color,'#0d1629')).toBeGreaterThanOrEqual(10);
   const eyebrow=page.locator('main .page-eyebrow').first();
   expect(parseFloat(await eyebrow.evaluate(e=>getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
  }
 });
 test('Goal card secondary text is near-white, medium weight and at least 15px',async({page})=>{
  await showcase(page);await page.goto('/app/goals');
  const card=page.locator('.goal-grid .unified-goal-card').first();await expect(card).toBeVisible();
  for(const selector of ['.goal-progress-caption>strong','.goal-remaining','.goal-target','.goal-mix-legend span','.card-bottom small','.card-footer small']){
   const el=card.locator(selector).first();if(!await el.count())continue;
   const s=await el.evaluate(e=>{const c=getComputedStyle(e);return {size:parseFloat(c.fontSize),weight:Number(c.fontWeight),color:c.webkitTextFillColor&&!/rgba\(0, 0, 0, 0\)/.test(c.webkitTextFillColor)?c.webkitTextFillColor:c.color};});
   expect(s.size,selector).toBeGreaterThanOrEqual(15);expect(s.weight,selector).toBeGreaterThanOrEqual(500);expect(contrast(s.color,'#12203a'),selector).toBeGreaterThanOrEqual(7);
  }
 });
 test('Today eyebrow nebula flows from the middle of the line',async({page})=>{
  await showcase(page);
  const eyebrow=page.locator('.today-hero .financial-orbit');await expect(eyebrow).toHaveText('YOUR FINANCIAL ORBIT');
  const image=await eyebrow.evaluate(e=>getComputedStyle(e).backgroundImage);
  // Colour stops begin before the last word: the tint starts within the first 60% of the line.
  const stops=[...image.matchAll(/(\d+)%/g)].map(m=>Number(m[1]));expect(stops.some(v=>v>30&&v<60)).toBe(true);
 });
 test('Habits: New habit sits beside the orbit and the journal timezone moves to the bottom',async({page,isMobile})=>{
  test.skip(isMobile,'Desktop first-view budget');
  await page.setViewportSize({width:1440,height:900});await showcase(page);await page.goto('/app/habits');
  const create=page.getByRole('button',{name:'+ New habit',exact:true}),title=page.getByRole('heading',{level:1}),orbit=page.locator('.habit-constellation');
  await expect(create).toBeVisible();await expect(page.getByRole('link',{name:'Back up private data ↗'})).toBeVisible();
  const c=(await create.boundingBox())!,t=(await title.boundingBox())!,o=(await orbit.boundingBox())!;
  expect(c.x).toBeGreaterThan(t.x+t.width*.5);expect(c.x+c.width).toBeLessThanOrEqual(o.x+8);expect(c.y).toBeLessThan(t.y+t.height+80);
  // First view at 1440×900: Today's rhythm and the tops of the two consistency cards.
  for(const text of [/^Today’s rhythm$/i,/^Small returns add up$/i,/^Your week in motion$/i]){const box=(await page.getByText(text).first().boundingBox())!;expect(box.y+box.height,String(text)).toBeLessThanOrEqual(900);}
  const zone=page.getByText('Habit journal timezone',{exact:true}),semantics=page.locator('.habit-semantics'),privacy=page.locator('.habit-privacy');
  const z=(await zone.boundingBox())!,s=(await semantics.boundingBox())!,p=(await privacy.boundingBox())!;
  expect(z.y).toBeGreaterThan(s.y);expect(p.y).toBeGreaterThan(s.y);
  await zone.click();await page.getByLabel('Habit timezone',{exact:true}).fill('Not/AZone');await page.getByRole('button',{name:'Save Habit timezone',exact:true}).click();
  await expect(page.locator('.habit-timezone [role=status]')).toHaveText('Choose a valid IANA timezone, such as Europe/Brussels.');
 });
 test('sidebar signature reads Shape & Fold, Your Own Future above the horizon',async({page,isMobile})=>{
  test.skip(isMobile,'The mobile header hides the sidebar planet');
  await showcase(page);
  const destination=page.locator('.sidebar-destination'),tagline=destination.locator('.sidebar-tagline');
  await expect(tagline.locator('span[aria-hidden]')).toHaveText(['Shape & Fold','Your Own Future']);
  await expect(tagline.locator('.sr-only')).toHaveText('Shape & Fold, Your Own Future');
  expect(await tagline.locator('span[aria-hidden]').first().evaluate(e=>getComputedStyle(e).textTransform)).toBe('uppercase');
  await expect(page.locator('.app-sidebar')).not.toContainText('THE GOAL LAYER');
 });
 test('Habits and Health load without hydration warnings',async({page})=>{
  const warnings:string[]=[];page.on('console',m=>{if(/hydrat/i.test(m.text()))warnings.push(m.text());});
  await showcase(page);for(const path of ['/app/habits','/app/health']){await page.goto(path);await page.waitForTimeout(1200);}
  expect(warnings).toEqual([]);
 });
});

test.describe('Part 2: personal layouts',()=>{
 const order=(page:Page,region:string)=>page.evaluate(r=>[...document.querySelectorAll<HTMLElement>(`[data-layout-region="${r}"]`)].map(e=>e.dataset.layoutItem),region);
 test('unlock, move with the keyboard, reload keeps it, reset restores it, lock hides the controls',async({page})=>{
  await showcase(page);await page.goto('/app/habits');
  await expect(page.locator('.habit-overview')).toBeVisible();
  const initial=await order(page,'habits:body');expect(initial).toEqual(['habits:overview','habits:consistency','habits:list']);
  // Locked by default: no controls, nothing marked.
  await expect(page.locator('.layout-controls')).toHaveCount(0);
  await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();
  await expect(page.getByRole('button',{name:'Lock layout',exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Arrange this page'})).toBeVisible();
  const down=page.getByRole('button',{name:'Move Today’s rhythm down',exact:true});
  await down.focus();await page.keyboard.press('Enter');
  await expect.poll(()=>order(page,'habits:body')).toEqual(['habits:consistency','habits:overview','habits:list']);
  await expect(page.locator('[data-layout-announcer]')).toHaveText('Moved Today’s rhythm to position 2 of 3.');
  await expect(down).toBeFocused();
  expect(await page.evaluate(()=>sessionStorage.getItem('zigoals:layout:v1'))).toBe('{"version":1,"pages":{"habits":{"body":{"order":["habits:consistency","habits:overview","habits:list"]}}}}');
  await page.reload();await expect(page.locator('.habit-overview')).toBeVisible();
  expect(await order(page,'habits:body')).toEqual(['habits:consistency','habits:overview','habits:list']);
  // Every load starts locked.
  await expect(page.getByRole('button',{name:'Unlock layout to rearrange',exact:true})).toBeVisible();await expect(page.locator('.layout-controls')).toHaveCount(0);
  await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();
  await page.getByRole('button',{name:'Reset this page',exact:true}).click();
  await expect.poll(()=>order(page,'habits:body')).toEqual(initial);
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.locator('.layout-controls')).toHaveCount(0);await expect(page.getByRole('region',{name:'Arrange this page'})).toHaveCount(0);
 });
 test('honesty banners and the page header are never movable',async({page})=>{
  await showcase(page);
  for(const path of ['/app','/app/goals','/app/wealth','/app/health']){
   await page.goto(path);await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();
   await expect(page.locator('.layout-controls').first()).toBeVisible();
   for(const selector of ['.network-banner','.showcase-banner','.mode-strip','main h1']){
    const el=page.locator(selector).first();await expect(el).toBeVisible();
    expect(await el.evaluate(e=>!!e.closest('[data-layout-item]')||!!e.querySelector('[data-layout-item],.layout-controls')),`${path} ${selector}`).toBe(false);
   }
   await page.getByRole('button',{name:'Done',exact:true}).click();
  }
 });
 test('Today moves go through the synced Today placement and Reset restores its default order',async({page})=>{
  await showcase(page);
  await expect(page.locator('[data-layout-region="today:main"]').first()).toBeVisible();
  const initial=await order(page,'today:main');
  await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();
  // Unlocking Today is the existing Customize mode.
  await expect(page.getByRole('heading',{name:'Arrange your daily space'})).toBeVisible();
  await page.getByRole('button',{name:`Move Whole-life overview down`,exact:true}).click();
  await expect.poll(()=>order(page,'today:main')).toEqual([initial[1],initial[0],...initial.slice(2)]);
  await page.reload();await expect(page.locator('[data-layout-region="today:main"]').first()).toBeVisible();
  expect(await order(page,'today:main')).toEqual([initial[1],initial[0],...initial.slice(2)]);
  await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();await page.getByRole('button',{name:'Reset this page',exact:true}).click();
  await expect.poll(()=>order(page,'today:main')).toEqual(initial);
 });
 test('dragging a Goal card with the mouse reorders the collection',async({page,isMobile})=>{
  test.skip(isMobile,'Mouse drag');
  await showcase(page);await page.goto('/app/goals');
  const cards=page.locator('[data-layout-region="goals:cards"]');await expect(cards.first()).toBeVisible();
  const before=await order(page,'goals:cards');
  await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();
  const handle=cards.first().locator('.layout-handle');await handle.evaluate(e=>e.scrollIntoView({block:'center'}));
  const h=(await handle.boundingBox())!,target=(await cards.nth(2).boundingBox())!;
  await page.mouse.move(h.x+h.width/2,h.y+h.height/2);await page.mouse.down();
  await page.mouse.move(h.x+30,h.y+10,{steps:4});
  await expect(page.locator('.layout-ghost')).toHaveCount(1);await expect(page.locator('[data-layout-placeholder]')).toHaveCount(1);
  // Across the first row to the far side of the third card, well away from the auto-scroll edges.
  await page.mouse.move(target.x+target.width*.8,h.y+h.height/2,{steps:12});
  await page.mouse.up();
  await expect(page.locator('.layout-ghost')).toHaveCount(0);
  await expect.poll(()=>order(page,'goals:cards')).toEqual([before[1],before[2],before[0],...before.slice(3)]);
  await expect(page.locator('[data-layout-announcer]')).toHaveText(/^Moved .+ to position 3 of 5\.$/);
 });
 test('Motion Off: moves are instant, with no glide animations',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('zigoals:motion:v1','off'));
  await showcase(page);await page.goto('/app/health');
  await expect(page.locator('[data-layout-region="health:body"]').first()).toBeVisible();
  await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();
  await page.getByRole('button',{name:'Move Today’s nourishment down',exact:true}).click();
  await expect.poll(()=>order(page,'health:body')).toEqual(['health:nutrition','health:summary','health:journal','health:roadmap']);
  expect(await page.evaluate(()=>[...document.querySelectorAll('[data-layout-item]')].flatMap(e=>e.getAnimations()).length)).toBe(0);
 });
 test('touch: a long-press on the handle picks a card up and moves it',async({page,isMobile})=>{
  test.skip(!isMobile,'Touch check on the mobile viewport');
  await showcase(page);await page.goto('/app/habits');
  const items=page.locator('[data-layout-region="habits:body"]');await expect(items.first()).toBeVisible();
  await page.getByRole('button',{name:'Unlock layout to rearrange',exact:true}).click();
  // Carry the second card (consistency) above the first (Today's rhythm), inside the viewport.
  const handle=items.nth(1).locator('.layout-handle');await handle.evaluate(e=>e.scrollIntoView({block:'center'}));
  const h=(await handle.boundingBox())!,first=(await items.first().boundingBox())!;
  const cdp=await page.context().newCDPSession(page);
  const touch=(type:'touchStart'|'touchMove'|'touchEnd',x:number,y:number)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
  const x=h.x+h.width/2,y=h.y+h.height/2,to=Math.max(90,first.y+first.height*.25);
  await touch('touchStart',x,y);await page.waitForTimeout(500);
  await expect(page.locator('.layout-ghost')).toHaveCount(1);
  for(let i=1;i<=12;i++)await touch('touchMove',x,y+(to-y)*i/12);
  await touch('touchEnd',x,to);
  await expect.poll(()=>order(page,'habits:body')).toEqual(['habits:consistency','habits:overview','habits:list']);
 });
});

test.describe('Part 3: liquid glass',()=>{
 const lift=(el:import('@playwright/test').Locator)=>el.evaluate(e=>{const s=getComputedStyle(e);return {translate:s.translate,scale:s.scale};});
 async function hoverCard(page:Page){
  await page.goto('/app/goals');const card=page.locator('.goal-grid .unified-goal-card').nth(1);await expect(card).toBeVisible();
  await card.evaluate(e=>e.scrollIntoView({block:'center'}));const r=(await card.boundingBox())!;
  await page.mouse.move(r.x+r.width*.3,r.y+r.height*.5);await page.mouse.move(r.x+r.width*.35,r.y+r.height*.55,{steps:3});
  return card;
 }
 test('hovering lifts a Goal card and a habit calendar tile, with the shared overlay following',async({page,isMobile})=>{
  test.skip(isMobile,'Hover needs a fine pointer');
  await showcase(page);
  const card=await hoverCard(page);
  await expect(card).toHaveAttribute('data-glass','card');
  await expect.poll(()=>lift(card)).toEqual({translate:'0px -2px',scale:'none'});
  const overlay=page.locator('.glass-light');await expect(overlay).toHaveAttribute('data-on','');await expect(overlay).toHaveAttribute('aria-hidden','true');
  // Neighbours never move.
  expect(await page.locator('.goal-grid .unified-goal-card').first().evaluate(e=>getComputedStyle(e).translate)).toBe('none');
  await page.goto('/app/habits');const tile=page.locator('.habit-month-grid>span').nth(5);await tile.evaluate(e=>e.scrollIntoView({block:'center'}));
  const t=(await tile.boundingBox())!;await page.mouse.move(t.x+t.width/2,t.y+t.height/2);
  await expect.poll(()=>lift(tile)).toEqual({translate:'0px -2px',scale:'1.04'});
  await page.mouse.move(5,5);await expect.poll(()=>lift(tile)).toEqual({translate:'none',scale:'none'});
 });
 test('keyboard focus gives the same lift with the focus ring',async({page,isMobile})=>{
  test.skip(isMobile,'Keyboard check on desktop');
  await showcase(page);await page.goto('/app/goals');
  const link=page.locator('.goal-grid .unified-goal-card').first().getByRole('link',{name:'Open Goal →'});
  await link.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  const card=page.locator('.goal-grid .unified-goal-card').first();
  await expect(card).toHaveAttribute('data-glass-hover','');
  expect(await link.evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
 });
 for(const setting of ['reduced motion','Motion Off'] as const)
  test(`${setting}: hover never moves anything; a static highlight only`,async({page,isMobile})=>{
   test.skip(isMobile,'Hover needs a fine pointer');
   if(setting==='reduced motion')await page.emulateMedia({reducedMotion:'reduce'});else await page.addInitScript(()=>localStorage.setItem('zigoals:motion:v1','off'));
   await showcase(page);
   const card=await hoverCard(page);
   await expect(card).toHaveAttribute('data-glass-hover','');
   expect(await lift(card)).toEqual({translate:'none',scale:'none'});
   const overlay=page.locator('.glass-light');await expect(overlay).toHaveAttribute('data-still','');
   expect(await overlay.locator('i').evaluate(e=>getComputedStyle(e).translate)).toBe('none');
  });
 test('touch gets press feedback only, never a hover lift',async({page,isMobile})=>{
  test.skip(!isMobile,'Touch');
  await showcase(page);await page.goto('/app/goals');
  const card=page.locator('.goal-grid .unified-goal-card').first();await expect(card).toBeVisible();
  await card.locator('h2').tap();
  expect(await card.getAttribute('data-glass-hover')).toBeNull();
  await expect(page.locator('.glass-light')).not.toHaveAttribute('data-on','');
 });
});

test.describe('Part 4: Health',()=>{
 const count=(page:Page,name:string)=>page.getByRole('article',{name,exact:true}).locator('output');
 test('quick counters: +/− on today, never below zero, and they survive a reload',async({page})=>{
  await page.goto('/app/health');
  const counters=page.getByRole('region',{name:'Every repetition counts.'});await expect(counters).toBeVisible();
  // Above the "A little care, every day." header.
  const c=(await counters.boundingBox())!,h=(await page.getByRole('heading',{level:1,name:'A little care, every day.'}).boundingBox())!;expect(c.y).toBeLessThan(h.y);
  await expect(page.getByRole('article',{name:'Push-ups',exact:true})).toBeVisible();await expect(page.getByRole('article',{name:'Pull-ups',exact:true})).toBeVisible();await expect(page.getByRole('article',{name:'Squats',exact:true})).toBeVisible();
  // No entry is not zero; nothing is written before the first tap.
  await expect(count(page,'Push-ups')).toContainText('No entry today');
  expect(await page.evaluate(()=>localStorage.getItem('zigoals:health:v1'))).toBeNull();
  await expect(page.getByRole('button',{name:'Decrease Push-ups'})).toBeDisabled();
  for(const b of await page.getByRole('article',{name:'Push-ups',exact:true}).getByRole('button',{name:/^(Increase|Decrease) Push-ups$/}).all()){const box=(await b.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);}
  const plus=page.getByRole('button',{name:'Increase Push-ups'});
  await plus.click();await expect(count(page,'Push-ups')).toHaveText('1');await plus.click();await plus.click();await expect(count(page,'Push-ups')).toHaveText('3');
  await page.getByRole('button',{name:'Decrease Push-ups'}).click();await expect(count(page,'Push-ups')).toHaveText('2');
  await page.reload();await expect(count(page,'Push-ups')).toHaveText('2');await expect(count(page,'Squats')).toContainText('No entry today');
  const saved=JSON.parse((await page.evaluate(()=>localStorage.getItem('zigoals:health:v1')))!);
  expect(saved.exercise.version).toBe(1);expect(saved.exercise.days).toHaveLength(1);expect(saved.exercise.days[0]).toMatchObject({counterId:'health_counter-pushups',count:2});
  await page.getByRole('button',{name:'Decrease Push-ups'}).click();await page.getByRole('button',{name:'Decrease Push-ups'}).click();
  await expect(count(page,'Push-ups')).toHaveText('0');await expect(page.getByRole('button',{name:'Decrease Push-ups'})).toBeDisabled();
 });
 test('a custom counter can be added, renamed and deleted after confirmation',async({page})=>{
  await page.goto('/app/health');
  await page.getByRole('button',{name:'+ Add counter'}).click();
  const dialog=page.getByRole('dialog',{name:'Add a counter'});await dialog.getByLabel('Counter name').fill('Planks');await dialog.getByRole('radio',{name:'Core'}).check();
  await dialog.getByRole('button',{name:'Add counter'}).click();await expect(dialog).toHaveCount(0);
  const planks=page.getByRole('article',{name:'Planks',exact:true});await expect(planks).toBeVisible();
  await page.getByRole('button',{name:'Increase Planks'}).click();await expect(count(page,'Planks')).toHaveText('1');
  await planks.getByRole('button',{name:'Options for Planks'}).click();await planks.getByRole('button',{name:'Rename or change icon'}).click();
  const edit=page.getByRole('dialog',{name:'Edit Planks'});await edit.getByLabel('Counter name').fill('Plank holds');await edit.getByRole('button',{name:'Save counter'}).click();
  await expect(page.getByRole('article',{name:'Plank holds',exact:true})).toBeVisible();
  await page.reload();const renamed=page.getByRole('article',{name:'Plank holds',exact:true});await expect(renamed).toBeVisible();await expect(count(page,'Plank holds')).toHaveText('1');
  await renamed.getByRole('button',{name:'Options for Plank holds'}).click();await renamed.getByRole('button',{name:'Delete counter'}).click();
  const confirm=page.getByRole('dialog',{name:'Delete Plank holds?'});await expect(confirm).toContainText('its daily history');
  await confirm.getByRole('button',{name:'Keep counter'}).click();await expect(renamed).toBeVisible();
  await renamed.getByRole('button',{name:'Options for Plank holds'}).click();await renamed.getByRole('button',{name:'Delete counter'}).click();
  await page.getByRole('dialog',{name:'Delete Plank holds?'}).getByRole('button',{name:'Delete counter'}).click();
  await expect(page.getByRole('article',{name:'Plank holds',exact:true})).toHaveCount(0);
  await page.reload();await expect(page.getByRole('article',{name:'Push-ups',exact:true})).toBeVisible();await expect(page.getByRole('article',{name:'Plank holds',exact:true})).toHaveCount(0);
 });
 test('Showcase counters are fictional and never touch real Health data',async({page})=>{
  await showcase(page);await page.goto('/app/health');
  await expect(count(page,'Push-ups')).not.toContainText('No entry');
  await page.getByRole('button',{name:'Increase Squats'}).click();
  expect(await page.evaluate(()=>localStorage.getItem('zigoals:health:v1'))).toBeNull();
 });
 test('the Health titles carry the nebula flow from the middle',async({page})=>{
  await showcase(page);await page.goto('/app/health');
  for(const name of ['A little care, every day.','Every entry adds perspective.']){
   const flow=page.getByRole('heading',{name,exact:true}).locator('.nebula-flow');await expect(flow).toHaveText(name);
   expect(await flow.evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('linear-gradient');
  }
 });
});

test.describe('Part 5: Wealth headline',()=>{
 test('one headline total in one currency; other currencies on their own line, never converted',async({page})=>{
  await showcase(page);await page.goto('/app/wealth');
  const total=page.locator('.wealth-hero-total');await expect(total).toBeVisible();
  await expect(total.locator('.wealth-total-headline')).toHaveText('$501,800');
  await expect(total.locator('.wealth-total-other')).toHaveText(['+ €8,000 held in EUR · not converted']);
  await expect(total).toContainText('Currency totals stay separate. No FX assumed.');
  await expect(total).toContainText('KNOWN TRACKED WEALTH');await expect(total).toContainText('13 assets');
  // No combined cross-currency figure anywhere on the card.
  await expect(total).not.toContainText('509,800');
  expect(await total.locator('.wealth-total-headline .nebula-flow').evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('linear-gradient');
  await page.goto('/app');const today=page.locator('.life-orbit-wealth');await expect(today.locator('.wealth-total-headline')).toHaveText('$501,800');
  await expect(today.locator('.wealth-total-other')).toHaveText(['+ €8,000 held in EUR · not converted']);
 });
});

test.describe('Part 6: journey banner',()=>{
 test('describes ZIGoals in three orbit steps and keeps the Alpha truths visible',async({page})=>{
  await showcase(page);
  const banner=page.locator('#how-it-works');await banner.scrollIntoViewIfNeeded();await expect(banner).toBeVisible();
  await expect(banner.getByRole('heading',{level:2})).toHaveText('Your goals, habits and health, in one orbit.');
  await expect(banner.locator('.journey-steps strong')).toHaveText(['Choose your orbit','Take a small step','Keep it yours']);
  // PUBLIC_ALPHA_UNDEPLOYED and LOCAL_DEMO both keep financial execution disabled.
  await expect(banner).toContainText('Financial execution is disabled on this Alpha.');
  await expect(banner).toContainText('Browser storage is not a backup.');
  await expect(banner.getByRole('link',{name:'Make a backup in Settings →'})).toHaveAttribute('href','/app/settings');
  // The footer keeps the wordmark and its line.
  await expect(page.locator('footer .footer-brand')).toContainText('Same you. A brighter tomorrow.');
  for(const el of await banner.locator('.journey-steps p, .journey-truths p').all())expect(parseFloat(await el.evaluate(e=>getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(15);
 });
});
