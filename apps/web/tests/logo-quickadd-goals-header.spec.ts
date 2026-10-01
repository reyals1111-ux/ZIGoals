import {expect,test,type Page} from '@playwright/test';

async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}
const OPTIONS=['Goal','Asset','Contribution','Habit','Health entry'];

test('the Today hero Quick add is the primary action and opens the same Quick add options',async({page,isMobile})=>{
 await showcase(page);
 const hero=page.locator('.today-hero'),trigger=hero.getByRole('button',{name:'+ Quick add',exact:true});
 await expect(trigger).toHaveClass(/\bprimary\b/);await expect(hero.getByRole('link',{name:'+ Create a goal',exact:true})).toHaveCount(0);
 const box=(await trigger.boundingBox())!;expect(box.height).toBeGreaterThanOrEqual(44);
 const options=page.getByRole('navigation',{name:'Quick add actions'}).locator('strong');
 await trigger.click();await expect(page.getByRole('dialog',{name:'What would you like to add?'})).toBeVisible();
 expect(await options.allTextContents()).toEqual(OPTIONS);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
 if(isMobile){
  // The phone top bar (Session E) keeps its own Quick add, with the same options.
  const header=page.locator('.phone-topbar .quick-add-trigger');await header.click();
  expect(await options.allTextContents()).toEqual(OPTIONS);await page.keyboard.press('Escape');await expect(header).toBeFocused();
 }
 await trigger.click();await page.getByRole('navigation',{name:'Quick add actions'}).getByRole('link').filter({hasText:'Goal'}).click();
 await page.waitForURL('**/app/goals/new');
});

test('the Goals header reads "Your Goals" and the cards follow one compact controls row',async({page,isMobile})=>{
 await showcase(page);await page.goto('/app/goals');
 const title=page.getByRole('heading',{level:1,name:'Your Goals',exact:true});
 await expect(title).toBeVisible();await expect(page.getByRole('heading',{name:'Your goals.',exact:true})).toHaveCount(0);
 // Part 18.5: white on the left, the nebula from the middle to the right, through the one shared utility.
 await expect(title.locator('.nebula-flow')).toHaveText('Your Goals');
 expect(await title.locator('.nebula-flow').evaluate(e=>getComputedStyle(e).backgroundImage)).toMatch(/linear-gradient.*42%/);
 await expect(page.getByText('A destination worth building',{exact:true})).toBeVisible();await expect(page.getByText('Small steps. A bigger future. Every plan starts with you.',{exact:true})).toBeVisible();
 const create=page.getByRole('link',{name:'+ Create a goal',exact:true}),t=(await title.boundingBox())!,c=(await create.boundingBox())!;
 await expect(create).toHaveAttribute('href','/app/goals/new');
 // UI design pass: at the far right of the title row, vertically centred on the title.
 const header=(await page.locator('.goals-heading').boundingBox())!;
 expect(c.x).toBeGreaterThanOrEqual(t.x+t.width);expect(Math.abs((c.x+c.width)-(header.x+header.width))).toBeLessThanOrEqual(2);expect(Math.abs((c.y+c.height/2)-(t.y+t.height/2))).toBeLessThanOrEqual(8);
 const toolbar=page.locator('.goals-toolbar'),controls=toolbar.locator(':scope a, :scope button'),count=toolbar.getByText(/^\d+ destinations?$/);
 await expect(toolbar.getByRole('navigation',{name:'Goal workspace'})).toBeVisible();await expect(toolbar.getByRole('navigation',{name:'Goal views'})).toBeVisible();await expect(count).toBeVisible();
 const tops=new Set((await controls.evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)))));expect(tops.size).toBeLessThanOrEqual(isMobile?2:1);
 for(const box of await controls.evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {h:r.height,w:r.width,font:parseFloat(s.fontSize)};}))){expect(box.h).toBeGreaterThanOrEqual(44);expect(box.font).toBeGreaterThanOrEqual(14);}
 expect(parseFloat(await count.evaluate(e=>getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
 const subtitle=(await page.getByText('Small steps. A bigger future. Every plan starts with you.',{exact:true}).boundingBox())!,bar=(await toolbar.boundingBox())!,grid=(await page.getByRole('region',{name:'Your goals',exact:true}).boundingBox())!;
 expect(bar.y-(subtitle.y+subtitle.height)).toBeLessThanOrEqual(32);expect(grid.y-(bar.y+bar.height)).toBeLessThanOrEqual(32);
 // The filters still filter.
 await toolbar.getByRole('button',{name:'All',exact:true}).click();await expect(toolbar.getByRole('button',{name:'All',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
});

test('"See how it works" opens the intro video dialog, which loads nothing until opened and returns focus',async({page})=>{
 // The logo fold intro is separate (/brand/logo-fold/, tests/logo-fold.spec.ts); the hero's intro video must wait to be opened.
 const media:string[]=[];page.on('request',r=>{if(r.url().includes('/media/'))media.push(r.url());});
 await showcase(page);
 const trigger=page.locator('.today-hero').getByRole('button',{name:'See how it works',exact:true});
 await expect(trigger).toBeVisible();await expect(page.getByRole('region',{name:'How it works',exact:true})).toBeAttached();
 await page.waitForLoadState('networkidle');expect(media).toEqual([]);
 await trigger.click();
 const dialog=page.getByRole('dialog',{name:'ZIGoals intro',exact:true}),video=dialog.locator('video'),close=dialog.getByRole('button',{name:'Close intro video',exact:true});
 await expect(dialog).toBeVisible();await expect(dialog).toContainText('Full walkthrough video coming soon.');await expect(close).toBeFocused();
 const c=(await close.boundingBox())!;expect(c.width).toBeGreaterThanOrEqual(44);expect(c.height).toBeGreaterThanOrEqual(44);
 await expect(video).toHaveAttribute('preload','none');await expect(video).toHaveAttribute('playsinline','');await expect(video).toHaveAttribute('controls','');
 await expect(video).toHaveAttribute('poster','/media/zigoals-intro-poster.jpg');await expect(video).toHaveAttribute('src','/media/zigoals-intro.mp4');
 await expect.poll(()=>video.evaluate(v=>!(v as HTMLVideoElement).paused)).toBe(true);
 const box=(await video.boundingBox())!,viewport=page.viewportSize()!;
 expect(box.height).toBeLessThanOrEqual(viewport.height*.86);expect(box.width).toBeLessThanOrEqual(viewport.width);expect(Math.abs(box.width/box.height-784/1168)).toBeLessThan(.02);
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
 // A closed dialog has no role, so read the element directly. The close event (pause + rewind) follows the dialog closing, so poll.
 await expect.poll(()=>page.locator('dialog.intro-video-dialog video').evaluate(v=>({paused:(v as HTMLVideoElement).paused,time:(v as HTMLVideoElement).currentTime}))).toEqual({paused:true,time:0});
 // The backdrop closes it too.
 await trigger.click();await expect(dialog).toBeVisible();await page.mouse.click(4,4);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
});

test('reduced motion and the Off preference never autoplay the intro; the poster and play control stay',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 const trigger=page.locator('.today-hero').getByRole('button',{name:'See how it works',exact:true}),video=page.getByRole('dialog',{name:'ZIGoals intro',exact:true}).locator('video');
 await trigger.click();await expect(video).toBeVisible();await expect(video).toHaveAttribute('poster','/media/zigoals-intro-poster.jpg');await expect(video).toHaveAttribute('controls','');
 await page.waitForTimeout(500);expect(await video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));await page.reload();
 await trigger.click();await expect(video).toBeVisible();await page.waitForTimeout(500);expect(await video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
});
