import {expect,test,type Page} from '@playwright/test';

// Accessibility follow-ups for the new motion and dialogs (2026-09-29 review).
async function showcase(page:Page){
 await page.route('**/api/market-**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"fixture offline"}'}));
 await page.goto('/app/settings');await page.getByRole('button',{name:'Load Showcase Demo',exact:true}).click();await page.waitForURL('**/app');
}

test('every Quick add dialog on Today is named by its own heading',async({page})=>{
 await showcase(page);
 // Each Quick add portals its dialog into <body> after hydration: the sidebar one and the Today hero one.
 await expect.poll(()=>page.locator('dialog.quick-add-dialog').count()).toBeGreaterThanOrEqual(2);
 const named=await page.evaluate(()=>[...document.querySelectorAll('dialog.quick-add-dialog')].map(d=>{const id=d.getAttribute('aria-labelledby')!,heading=document.getElementById(id);return {id,inside:!!heading&&d.contains(heading),matches:document.querySelectorAll(`[id="${CSS.escape(id)}"]`).length};}));
 expect(named.length).toBeGreaterThanOrEqual(2);
 for(const dialog of named){expect(dialog.inside,'the heading naming a dialog is inside that dialog').toBe(true);expect(dialog.matches,'heading ids are unique').toBe(1);}
 const hero=page.locator('.today-hero').getByRole('button',{name:'+ Quick add',exact:true});await hero.click();
 const dialog=page.getByRole('dialog',{name:'What would you like to add?'});await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:/Contribution/}).click();await expect(page.getByRole('dialog',{name:'Choose your Goal'})).toBeVisible();
});

test('after Quick add navigates away from Today, focus lands on the new page, not <body>',async({page})=>{
 await showcase(page);
 await page.locator('.today-hero').getByRole('button',{name:'+ Quick add',exact:true}).click();
 await page.getByRole('navigation',{name:'Quick add actions'}).getByRole('link',{name:/Goal/}).first().click();
 await page.waitForURL('**/app/goals/new');
 await expect.poll(()=>page.evaluate(()=>document.activeElement===document.body||document.activeElement===null)).toBe(false);
 expect(await page.evaluate(()=>!!document.getElementById('main')?.contains(document.activeElement))).toBe(true);
});

test('the intro video has an accessible name and says it is music only',async({page})=>{
 await showcase(page);
 await page.locator('.today-hero').getByRole('button',{name:'See how it works',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'ZIGoals intro',exact:true});
 await expect(dialog.getByText('Music only, no narration.',{exact:false})).toBeVisible();
 await expect(dialog.locator('video')).toHaveAccessibleName('ZIGoals intro video (music only, no narration)');
 await expect(dialog).toHaveAccessibleDescription(/Music only, no narration\./);
});

test('forced colors: the navigation arrival sweep and pop are off',async({page,isMobile})=>{
 test.skip(isMobile,'The sidebar navigation is the desktop layout.');
 await page.emulateMedia({forcedColors:'active'});await showcase(page);
 await page.locator('.app-nav').getByRole('link',{name:'Habits',exact:true}).click();await page.waitForURL('**/app/habits');
 const link=page.locator('.app-nav a[aria-current=page]');
 const styles=await link.evaluate(a=>({after:getComputedStyle(a,'::after').content,afterAnimation:getComputedStyle(a,'::after').animationName,icon:getComputedStyle(a.firstElementChild!).animationName}));
 expect(styles.after).toBe('none');expect(styles.icon).toBe('none');
});

test('reduced motion: the page settle animation is off by its own rule',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/app/goals');
 // The rule lives with the animation in motion.css, so it holds even without the global kill-switches.
 const own=await page.evaluate(()=>{for(const sheet of document.styleSheets){let rules:CSSRuleList;try{rules=sheet.cssRules;}catch{continue;}for(const rule of rules)if(rule instanceof CSSMediaRule&&rule.conditionText.includes('prefers-reduced-motion'))for(const inner of rule.cssRules)if(inner instanceof CSSStyleRule&&inner.selectorText.replace(/\s+/g,'')==='.workspacemain>div'&&inner.style.animationName==='none')return true;}return false;});
 expect(own).toBe(true);
 expect(await page.locator('.workspace main>div').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
});

test('keyboard focus on the logo link is never covered by the intro clip',async({page,isMobile})=>{
 test.skip(isMobile,'The logo intro is desktop only.');
 await page.goto('/app/goals');
 // Stand in for the clip while it plays (this Chromium build may not decode it), then focus the link by keyboard.
 await page.evaluate(()=>{const brand=document.querySelector('.app-sidebar .brand')!,clip=document.createElement('video');clip.className='logo-intro';clip.dataset.state='playing';clip.setAttribute('aria-hidden','true');brand.append(clip);brand.querySelector('.brand-logo')?.setAttribute('data-intro','playing');});
 const brand=page.locator('.app-sidebar .brand');
 await page.keyboard.press('Tab');await page.keyboard.press('Tab');await expect(brand).toBeFocused();
 expect(await brand.evaluate(b=>b.matches(':focus-visible'))).toBe(true);
 expect(await page.locator('.app-sidebar .brand .logo-intro').evaluate(el=>getComputedStyle(el).display)).toBe('none');
 const logo=page.locator('.app-sidebar .brand .brand-logo');if(await logo.count())expect(await logo.evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
});
