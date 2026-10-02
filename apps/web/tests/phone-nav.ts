import {expect,type Locator,type Page} from '@playwright/test';
import {PHONE_QUERY} from '../components/phone/use-phone-layout';

/** Whether the page renders the phone experience (below 768 px, or a coarse pointer at most 500 px tall). */
export const isPhone=(page:Page)=>page.evaluate(query=>matchMedia(query).matches,PHONE_QUERY);
export const mainNav=(page:Page)=>page.getByRole('navigation',{name:'Main navigation'});

/**
 * Opens the phone's More sheet (Wealth, Markets, Staking, Portfolio, Ecosystem, Activity, Settings). The tab bar is
 * server-rendered, so a tap that lands before hydration is simply repeated.
 */
export async function openMore(page:Page){
 const more=mainNav(page).getByRole('button',{name:'More',exact:true}),sheet=mainNav(page).getByRole('dialog',{name:'More'});
 await expect(async()=>{if(!await sheet.isVisible())await more.click();await expect(sheet).toBeVisible({timeout:1500});}).toPass({timeout:15000});
 // The sheet slides up (280 ms, none under reduced motion or Motion Off): return it at rest, so measurements of its
 // contents are taken in one place rather than across the slide.
 await sheet.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>undefined))));
 return sheet;
}

/**
 * The Main navigation link for a destination. On a desktop or tablet every destination is in the sidebar; on a phone
 * the first four are tabs and the rest are in the More sheet, which is opened first.
 */
export async function navLink(page:Page,name:string):Promise<Locator>{
 const link=mainNav(page).getByRole('link',{name,exact:true});
 if(await isPhone(page)&&!await link.isVisible())await openMore(page);
 return link;
}

/** Closes the More sheet if it is open, so the page behind it can be used again. A no-op on desktop and tablet. */
export async function closeMore(page:Page){
 const sheet=mainNav(page).getByRole('dialog',{name:'More'});
 if(await sheet.isVisible()){await page.keyboard.press('Escape');await expect(sheet).toBeHidden();}
}

/**
 * On a phone, opens a secondary module that Today or Wealth folds to one row (Session I, Part 9) and returns once its
 * content shows; elsewhere nothing is folded and this does nothing.
 */
export async function openFold(page:Page,label:string){
 if(!await isPhone(page))return;
 const toggle=page.locator('.phone-fold-toggle').filter({hasText:label}).first();
 await expect(async()=>{if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true',{timeout:1500});}).toPass({timeout:15000});
}
/** On a phone, opens the Log a meal sheet from its button (Session I, Part 9); elsewhere the form is already in the page. */
export async function openMealLog(page:Page){
 if(!await isPhone(page))return;
 const sheet=page.getByRole('dialog',{name:'Log a meal'});
 await expect(async()=>{if(!await sheet.isVisible())await page.getByRole('button',{name:'Log a meal',exact:true}).click();await expect(sheet).toBeVisible({timeout:1500});}).toPass({timeout:15000});
 return sheet;
}
/** On a phone, closes an open form sheet with Escape, as a reader would; elsewhere there is none and this does nothing. */
export async function closeFormSheet(page:Page){
 if(!await isPhone(page))return;
 const sheet=page.locator('dialog.phone-form-sheet[open]');
 if(await sheet.count()){await page.keyboard.press('Escape');await expect(sheet).toHaveCount(0);}
}
