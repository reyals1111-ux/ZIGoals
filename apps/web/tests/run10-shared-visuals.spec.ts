import {test,expect,type Page} from '@playwright/test';
async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
 await expect(page.locator('.today-daily .habits-today')).toBeVisible();
}
test('Quick add belongs to navigation and Escape returns focus',async({page})=>{
 await showcase(page);expect(await page.locator('.app-topbar .quick-add-trigger').count()).toBe(0);
 const trigger=page.locator('.app-sidebar .quick-add-trigger');await trigger.click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await trigger.click();await expect(page.getByRole('dialog')).toBeVisible();
});
for(const width of [320,360,390,430,768,1440])test(`Habit labels and controls have distinct space at ${width}px`,async({page},testInfo)=>{
 await page.setViewportSize({width,height:1000});await showcase(page);
 const habits=page.locator('.today-daily .habits-today');
 const rows=habits.locator('.habit-today-list li');await expect(rows).toHaveCount(3);
 const overlaps=await rows.evaluateAll(items=>items.flatMap(row=>{
  const title=row.firstElementChild!.getBoundingClientRect(),completion=row.querySelector('.habit-completion')!.getBoundingClientRect();
  return title.right>completion.left+1&&completion.right>title.left+1&&title.bottom>completion.top+1&&completion.bottom>title.top+1?[{title:title.toJSON(),completion:completion.toJSON()}]:[];
 }));expect(overlaps).toEqual([]);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 for(const button of await rows.locator('button').all()){const box=await button.boundingBox();expect(box?.width).toBeGreaterThanOrEqual(43);expect(box?.height).toBeGreaterThanOrEqual(43);}
 await habits.screenshot({animations:'disabled',path:testInfo.outputPath(`run10-habits-${width}.png`)});
});

test('long build, quit, limit and duration Habit cards reflow with enlarged text and save actions',async({page},testInfo)=>{
 const {createHabit,emptyHabitData,HABITS_KEY}=await import('../lib/habits');let data=emptyHabitData();
 for(const [i,type,measurement,target] of [[1,'build',{kind:'count',unit:'practice repetitions'},1000000000],[2,'quit',{kind:'count',unit:'distraction events'},0],[3,'limit',{kind:'quantity',unit:'custom measurement units'},1000000000],[4,'build',{kind:'duration',unit:'minutes'},120]] as const){
  data=createHabit(data,{title:`${type} ${i} — A long descriptive habit name with enough detail to need several lines`,category:'Personal practice',description:'Fictional layout test',notes:'',type,measurement,schedule:{kind:'daily'},target},new Date('2026-09-23T10:00:00Z'),`f46b40cd-7d6d-4295-962f-87945a1c700${i}`);
 }
 await page.clock.install({time:new Date('2026-09-23T12:00:00Z')});await page.addInitScript(({key,raw})=>localStorage.setItem(key,raw),{key:HABITS_KEY,raw:JSON.stringify(data)});
 await page.setViewportSize({width:320,height:850});await page.goto('/app/habits');await page.addStyleTag({content:'html { font-size: 125%; }'});
 await expect(page.locator('.habit-card')).toHaveCount(4);await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const escapes=await page.locator('.habit-card').evaluateAll(cards=>cards.flatMap(card=>{const outer=card.getBoundingClientRect();return [...card.querySelectorAll('h2,.habit-count,button')].filter(el=>{const r=el.getBoundingClientRect();return r.right>outer.right+1||r.left<outer.left-1;}).map(el=>el.textContent);}));expect(escapes).toEqual([]);
 const first=page.locator('.habit-card').first();await first.getByRole('button',{name:/^Add one to/}).click();await expect(first.locator('.habit-count strong')).toHaveText('1');
 await first.getByText('Consistency & trends',{exact:true}).click();await expect(first.locator('.habit-insights')).toBeVisible();
 await first.screenshot({animations:'disabled',path:testInfo.outputPath('run10-long-habit-320.png')});
});

test('category rings, exact history and finite route entrance have visible evidence',async({page},testInfo)=>{
 await page.setViewportSize({width:1440,height:1000});await showcase(page);
 const slogan=page.locator('.slogan-entrance');await expect(slogan).toHaveAttribute('data-entrance','once');
 await expect.poll(()=>slogan.evaluate(el=>el.getAnimations().filter(a=>a.playState==='running').length)).toBe(0);
 await page.locator('.today-hero').screenshot({animations:'disabled',path:testInfo.outputPath('run10-hero-1440.png')});
 await page.goto('/app/goals');const card=page.locator('.goal-card').filter({hasText:'Emergency fund'});await expect(card.locator('.flow-ring>span')).toHaveText('45%');
 const colors=await card.evaluate(el=>({composition:getComputedStyle(el.querySelector('.flow-ring-fill')!).backgroundImage,legend:[...el.querySelectorAll('.goal-mix-legend i')].map(i=>getComputedStyle(i).backgroundColor)}));for(const color of colors.legend)expect(colors.composition).toContain(color);
 await card.screenshot({animations:'disabled',path:testInfo.outputPath('run10-goal-ring-1440.png')});await page.locator('.app-sidebar').screenshot({animations:'disabled',path:testInfo.outputPath('run10-sidebar-1440.png')});
 await page.goto('/app/wealth');await expect(page.locator('.wealth-history .evidence-line').first()).toBeVisible();await expect.poll(()=>page.locator('.wealth-history .evidence-line').first().evaluate(el=>getComputedStyle(el).strokeDasharray)).toBe('none');await page.locator('.wealth-history').screenshot({animations:'disabled',path:testInfo.outputPath('run10-history-1440.png')});
 await page.goto('/app');await expect(page.locator('.slogan-entrance')).not.toHaveAttribute('data-entrance','once');
});
