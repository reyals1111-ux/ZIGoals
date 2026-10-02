import {expect,test,type Page} from '@playwright/test';

/**
 * Session I, Part 4: quick counters without a visible "Today" / "No entry today" subtitle. On phones the name shares the
 * first line with its icon and the options; − / count / + take the second line, so six counters with ~20-character
 * names fit from 320 to 430 px with no truncated number or button and 44 px targets.
 */
const NAMES=['Push-ups with a clap','Wide-grip pull-ups x','Bulgarian split squat','Kettlebell swings 24k','Mountain climbers 30','Plank shoulder taps x'];

async function sixLongCounters(page:Page){
 await page.goto('/app/health');
 // One real counter through the editor gives a valid stored Health record; the other names and counters follow its shape.
 await page.getByRole('button',{name:'+ Add counter'}).click();
 const dialog=page.getByRole('dialog',{name:'Add a counter'});await dialog.getByLabel('Counter name').fill('Seed');await dialog.getByRole('button',{name:'Add counter'}).click();
 await expect(page.getByRole('article',{name:'Seed',exact:true})).toBeVisible();
 await page.evaluate(names=>{
  const health=JSON.parse(localStorage.getItem('zigoals:health:v1')!),icons=['pushup','pullup','squat','run','core','jump'];
  // A four-digit count on today's journal day for the first counter: the widest number a bar has to keep whole.
  const today=document.querySelector('.exercise-counters-day time')!.getAttribute('datetime')!;
  health.exercise.counters=names.map((name,i)=>({id:`health_counter-compact-${i}`,name,icon:icons[i]}));health.exercise.days=[{id:`health_counter-compact-0@${today}`,counterId:'health_counter-compact-0',date:today,count:1234}];
  localStorage.setItem('zigoals:health:v1',JSON.stringify(health));
 },NAMES);
 await page.reload();
 await expect(page.locator('.exercise-counter')).toHaveCount(6);
 await expect(page.getByRole('article',{name:NAMES[0],exact:true}).locator('output')).toHaveText('1234');
}

test('no visible subtitle under a counter name; "today" is still announced with it',async({page})=>{
 await page.goto('/app/health');
 const bar=page.getByRole('article',{name:'Push-ups',exact:true});await expect(bar).toBeVisible();
 const caption=bar.locator('.exercise-counter-caption');
 // Visually hidden (the section heading already says "Today in your Health journal"), still in the reading order.
 expect(await caption.evaluate(e=>{const b=e.getBoundingClientRect();return b.width<=1&&b.height<=1;})).toBe(true);
 await expect(caption).toHaveText('No entry today');
 await expect(bar.locator('output')).toHaveAccessibleName('Push-ups today');
 // The name sits centred beside its icon.
 const [icon,name]=await Promise.all([bar.locator('.exercise-medallion').boundingBox(),bar.locator('h3').boundingBox()]);
 expect(Math.abs((icon!.y+icon!.height/2)-(name!.y+name!.height/2))).toBeLessThanOrEqual(2);
});

for(const width of [320,360,390,430])
 test(`${width} px: six counters with ~20-character names keep every number and button whole, with 44 px targets`,async({page},info)=>{
  await page.setViewportSize({width,height:844});
  await sixLongCounters(page);
  // Measured at rest: the page and card arrival animations have finished (a moving card reads sub-pixel sizes).
  await page.waitForFunction(()=>document.getAnimations().every(a=>a.playState!=='running'));
  await page.mouse.move(1,1);
  const bars=await page.locator('.exercise-counter').evaluateAll(els=>els.map(e=>{
   const b=e.getBoundingClientRect(),box=(s:string)=>e.querySelector(s)!.getBoundingClientRect(),h3=e.querySelector('h3')!,out=e.querySelector('output')!;
   const icon=box('.exercise-medallion'),name=box('h3'),minus=box('.exercise-step'),plus=box('.exercise-step:last-child'),menu=box('.card-options-trigger'),count=box('output');
   return {
    name:h3.textContent,
    nameBesideIcon:icon.right<=name.left&&Math.abs((icon.top+icon.bottom)/2-(name.top+name.bottom)/2)<=12,
    menuOnNameRow:menu.top<name.bottom&&name.top<menu.bottom,
    controlsBelowName:minus.top>=name.bottom-1&&plus.top>=name.bottom-1&&Math.abs(minus.top-plus.top)<1,
    nameNotClipped:h3.scrollHeight<=h3.clientHeight+1&&h3.scrollWidth<=h3.clientWidth+1,
    countWhole:out.scrollWidth<=out.clientWidth+1&&count.right<=plus.left+1&&count.left>=minus.right-1,
    targets:[minus,plus,menu].every(t=>t.width>=43.99&&t.height>=43.99),
    inside:[icon,name,minus,count,plus,menu].every(t=>t.left>=b.left-.5&&t.right<=b.right+.5&&t.top>=b.top-.5&&t.bottom<=b.bottom+.5),
   };
  }));
  expect(bars).toHaveLength(6);
  for(const bar of bars)expect(bar,`${width}px ${bar.name}`).toMatchObject({nameBesideIcon:true,menuOnNameRow:true,controlsBelowName:true,nameNotClipped:true,countWhole:true,targets:true,inside:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.locator('.exercise-counters').screenshot({path:info.outputPath(`counters-${width}.png`)});
 });
