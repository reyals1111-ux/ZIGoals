import {expect,type Locator,type Page} from '@playwright/test';
import {PHONE_QUERY} from '../components/phone/use-phone-layout';

/** Whether the page renders the phone experience (below 768 px, or a coarse pointer at most 500 px tall). */
export const isPhone=(page:Page)=>page.evaluate(query=>matchMedia(query).matches,PHONE_QUERY);
export const mainNav=(page:Page)=>page.getByRole('navigation',{name:'Main navigation'});

/**
 * Opens the phone's More sheet (Markets, Staking, Portfolio, Ecosystem, Activity, Settings, Help) from the top bar's More
 * button (Session AB-Design, owner request 10; the sheet itself stays in the Main navigation). The chrome is
 * server-rendered, so a tap that lands before hydration is simply repeated.
 */
export async function openMore(page:Page){
 const more=page.getByRole('button',{name:'More',exact:true}),sheet=mainNav(page).getByRole('dialog',{name:'More'});
 await expect(async()=>{if(!await sheet.isVisible())await more.click();await expect(sheet).toBeVisible({timeout:1500});}).toPass({timeout:15000});
 // The sheet slides up (280 ms, none under reduced motion or Motion Off): return it at rest, so measurements of its
 // contents are taken in one place rather than across the slide.
 await sheet.evaluate(el=>Promise.all(el.getAnimations().map(animation=>animation.finished.catch(()=>undefined))));
 return sheet;
}

/**
 * The Main navigation link for a destination. On a desktop or tablet every destination is in the sidebar; on a phone
 * the first five are tabs and the rest are in the More sheet, which is opened first.
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

/**
 * Session U follow-up F3: on a phone each Today widget card is a folded row that opens in place. Opens every row, so a
 * test reads or uses the cards as on a larger screen; does nothing elsewhere or while Today is being customized (no
 * widget folds then). The rows appear once the phone layout has taken over after hydration, so it waits for one per card.
 */
export async function openTodayWidgets(page:Page){
 if(!await isPhone(page))return;
 const modules=page.locator('.today-page .placed-module[data-kind="widget"]');
 await expect(modules.first()).toBeAttached();
 if(await page.getByRole('button',{name:'Finish customizing',exact:true}).isVisible())return;
 await expect(modules.locator('.phone-fold-toggle')).toHaveCount(await modules.count());
 const closed=modules.locator('.phone-fold-toggle[aria-expanded="false"]');
 while(await closed.count())await closed.first().click();
}
/** Session Z-Cloud Part 4.2: "Connect Keplr" wherever it is (the Status sheet on a phone), then that sheet closed again. */
export async function connectKeplr(page:Page){
 await (await walletArea(page)).getByRole('button',{name:'Connect Keplr'}).click();
 const sheet=page.getByRole('dialog',{name:'Status'});
 if(await sheet.isVisible()){await page.keyboard.press('Escape');await expect(sheet).toBeHidden();}
}
/** The wallet buttons: in the status row on a computer; on a phone in the Status & wallet sheet behind More (Session AB-Design). */
export async function walletArea(page:Page):Promise<Locator>{
 if(!await isPhone(page))return page.locator('.status-row .status-wallet');
 const sheet=page.getByRole('dialog',{name:'Status'});
 if(await sheet.isVisible())return sheet;
 const more=await openMore(page);
 await more.getByRole('button',{name:'Status & wallet',exact:true}).click();
 await expect(sheet).toBeVisible();
 return sheet;
}
