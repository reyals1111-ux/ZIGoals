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
