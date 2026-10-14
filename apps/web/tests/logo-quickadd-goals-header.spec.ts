import {expect,test,type Page} from '@playwright/test';
import {openFilm} from './ab-shell';
import {openFold} from './phone-nav';

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
 // Session AB-Design: on phones the title takes its own row and the actions follow below it (ADR-024, second round).
 // Session AB-Design Phase 2 (deliberate, ADR-024 "Phase 2 — assertions changed"): one header grid on every pillar page — the
 // title spans the row and the actions (Create first, the minor links under it) sit at the far right of the lede row below it,
 // their block bottom-aligned with the lede. As strict.
 const lede=(await page.locator('.goals-heading .pillar-hero-lede').boundingBox())!,actions=(await page.locator('.goals-heading .pillar-hero-actions').boundingBox())!;
 expect(c.y).toBeGreaterThanOrEqual(t.y+t.height);
 if(!isMobile){expect(c.x).toBeGreaterThanOrEqual(lede.x+lede.width);expect(Math.abs((c.x+c.width)-(header.x+header.width))).toBeLessThanOrEqual(2);expect(Math.abs((actions.y+actions.height)-(lede.y+lede.height))).toBeLessThanOrEqual(8);}
 // Session AB-Design (owner request 15): the filters on the left, the Cards / Vision board / Tree switch and the ⋯ menu (Positions) at the right end; the count is the active filter's name, not a text of its own.
 const toolbar=page.locator('.goals-toolbar'),controls=toolbar.locator(':scope a, :scope button');
 await expect(toolbar.getByRole('navigation',{name:'Goal views'})).toBeVisible();await expect(toolbar.getByRole('group',{name:'Show goals as'})).toBeVisible();await expect(toolbar.getByRole('button',{name:'Options for Goals',exact:true})).toBeVisible();
 await expect(toolbar.getByRole('button',{name:'Active',exact:true})).toHaveAttribute('aria-description',/^\d+ destinations?$/);await expect(toolbar.getByText(/^\d+ destinations?$/)).toHaveCount(0);
 const tops=new Set((await controls.evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().top)))));expect(tops.size).toBeLessThanOrEqual(isMobile?2:1);
 for(const box of await controls.evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {h:r.height,w:r.width,font:parseFloat(s.fontSize)};}))){expect(box.h).toBeGreaterThanOrEqual(44);expect(box.font).toBeGreaterThanOrEqual(14);}
 const sw=(await toolbar.getByRole('group',{name:'Show goals as'}).boundingBox())!,hb=(await page.locator('.goals-heading').boundingBox())!;expect(Math.abs((sw.x+sw.width)-(hb.x+hb.width))).toBeLessThanOrEqual(60); // the switch at the right end
 const subtitle=(await page.getByText('Small steps. A bigger future. Every plan starts with you.',{exact:true}).boundingBox())!,bar=(await toolbar.boundingBox())!,grid=(await page.getByRole('region',{name:'Your goals',exact:true}).boundingBox())!;
 // Phase 2 (deliberate, ADR-024 "Phase 2 — assertions changed"): the shared header ends with its actions (under the lede on
 // phones), so the controls row is measured from the header's end, not the lede's. As strict: ≤ 32 px.
 expect(subtitle.y).toBeLessThan(bar.y);expect(bar.y-(header.y+header.height)).toBeLessThanOrEqual(32);expect(grid.y-(bar.y+bar.height)).toBeLessThanOrEqual(32);
 // The filters still filter.
 await toolbar.getByRole('button',{name:'All',exact:true}).click();await expect(toolbar.getByRole('button',{name:'All',exact:true})).toHaveAttribute('aria-pressed','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(0);
});

test('"See how it works" opens the brand film, which loads nothing until opened, never plays by itself and returns focus',async({page})=>{
 // The logo fold intro is separate (/brand/logo-fold/, tests/logo-fold.spec.ts); the hero's brand film must wait to be opened.
 const media:string[]=[];page.on('request',r=>{if(/\/media\/|\/brand\/how-it-works\//.test(r.url()))media.push(r.url());});
 await showcase(page);
 const trigger=page.locator('.today-hero').getByRole('button',{name:'See how it works',exact:true});
 await expect(trigger).toBeVisible();await expect(page.getByRole('list',{name:'How ZIGoals works',exact:true})).toBeAttached(); // Session AB-Design: the steps are the footer's
 await page.waitForLoadState('networkidle');expect(media).toEqual([]);
 // Session AB-Design (owner request 13): "See how it works" opens the how-to first; the film is its "Watch the film" button.
 const howTo=await openFilm(page),film=howTo.getByRole('button',{name:'Watch the film (16 s)',exact:true});
 const dialog=page.getByRole('dialog',{name:'ZIGoals brand film',exact:true}),video=dialog.locator('video'),close=dialog.getByRole('button',{name:'Close brand film',exact:true});
 await expect(dialog).toBeVisible();await expect(dialog).toContainText('A 16-second film: the Z folds into a swan, lotus, butterfly, heart and bull');await expect(close).toBeFocused();
 const c=(await close.boundingBox())!;expect(c.width).toBeGreaterThanOrEqual(44);expect(c.height).toBeGreaterThanOrEqual(44);
 await expect(video).toHaveAttribute('preload','metadata');await expect(video).toHaveAttribute('playsinline','');await expect(video).toHaveAttribute('controls','');
 // 720p unless the window is wide on a high-density screen (these test screens are not).
 await expect(video).toHaveAttribute('poster','/brand/how-it-works/how-it-works-poster.webp');await expect(video).toHaveAttribute('src','/brand/how-it-works/how-it-works-720p.mp4');
 await page.waitForTimeout(600);expect(await video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 const box=(await video.boundingBox())!,viewport=page.viewportSize()!;
 expect(box.height).toBeLessThanOrEqual(viewport.height*.86);expect(box.width).toBeLessThanOrEqual(viewport.width);expect(Math.abs(box.width/box.height-1280/720)).toBeLessThan(.02);
 // The viewer starts it.
 await video.evaluate(v=>(v as HTMLVideoElement).play());await expect.poll(()=>video.evaluate(v=>!(v as HTMLVideoElement).paused)).toBe(true);
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(film).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
 // A closed dialog has no role, so read the element directly. The close event (pause + rewind) follows the dialog closing, so poll.
 await expect.poll(()=>page.locator('dialog.intro-video-dialog video').evaluate(v=>({paused:(v as HTMLVideoElement).paused,time:(v as HTMLVideoElement).currentTime}))).toEqual({paused:true,time:0});
 // The backdrop closes it too (the film, then the how-to).
 await openFilm(page);await expect(dialog).toBeVisible();await page.mouse.click(4,4);await expect(dialog).toBeHidden();await page.mouse.click(4,4);await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
});

test('with reduced motion, Motion Off or neither, the film never starts by itself; the poster and play control stay',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await showcase(page);
 const trigger=page.locator('.today-hero').getByRole('button',{name:'See how it works',exact:true}),video=page.getByRole('dialog',{name:'ZIGoals brand film',exact:true}).locator('video');
 await openFilm(page);await expect(video).toBeVisible();await expect(video).toHaveAttribute('poster','/brand/how-it-works/how-it-works-poster.webp');await expect(video).toHaveAttribute('controls','');
 await page.waitForTimeout(500);expect(await video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>localStorage.setItem('zigoals:motion:v1','off'));await page.reload();
 await openFilm(page);await expect(video).toBeVisible();await page.waitForTimeout(500);expect(await video.evaluate(v=>(v as HTMLVideoElement).paused)).toBe(true);
 // Motion Off does not stop the viewer from playing it.
 await video.evaluate(v=>(v as HTMLVideoElement).play());await expect.poll(()=>video.evaluate(v=>!(v as HTMLVideoElement).paused)).toBe(true);
});
