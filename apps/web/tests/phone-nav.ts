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
 // Session AO (RR-16, owner decision 13 Nov): on a computer or a tablet Wealth's longer sections fold too (desk folds,
 // remembered on the device); one is opened from its row as a reader would. Other pages fold only on a phone.
 if(!await isPhone(page)){
  // A client-side navigation (a nav link) may still be landing: the address is read once it has settled (≤ 3 s).
  const deskPage=()=>/^\/app\/(wealth|journey)(\/?$|[?#])/.test(new URL(page.url()).pathname+new URL(page.url()).search);
  if(!await expect.poll(deskPage,{timeout:3000}).toBe(true).then(()=>true,()=>false))return;
  const desk=page.locator('.desk-fold-toggle').filter({hasText:label}).first();
  if(!await desk.waitFor({state:'attached',timeout:10000}).then(()=>true,()=>false))return;
  await expect(async()=>{if(await desk.getAttribute('aria-expanded')!=='true')await desk.click();await expect(desk).toHaveAttribute('aria-expanded','true',{timeout:1500});}).toPass({timeout:15000});
  return;
 }
 const toggle=page.locator('.phone-fold-toggle').filter({hasText:label}).first();
 // Session AK RB (RELEASE_REVIEW_2 R2-8): on a phone, Wealth with fewer than two assets keeps its analytic rows inside one
 // "More about your wealth" row; a row inside it is reached by opening that row first, as a reader would.
 const group=page.locator('.phone-fold-toggle').filter({hasText:'More about your wealth'}).first();
 // Session AK (CI run 41309452842, run10-financial-evidence on mobile): the rows exist only once the phone layout has
 // taken over after hydration; asked before that, the group looked absent, so a row inside it stayed hidden. Wait for the row.
 await toggle.waitFor({state:'attached',timeout:15000});
 if(label!=='More about your wealth'&&await group.count()&&await group.getAttribute('aria-expanded')!=='true'&&!await toggle.isVisible())await group.click();
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
 // Session AC: a widget standing in for its hidden built-in (the habits list for Daily Habits) shows open as that built-in
 // does, so the rows are counted on the other widgets; the stand-in must have no row and its card in view.
 const modules=page.locator('.today-page .placed-module[data-kind="widget"]:not([data-stands-in])');
 await expect(modules.first()).toBeAttached();
 // Read as one state until it holds: a seeded page shows the default Today (with its stand-in) for a moment before its
 // saved placement, so a stand-in listed then can be gone a moment later (CI run 38883353936, both at 320 px).
 const standIns=page.locator('.today-page .placed-module[data-stands-in]');
 await expect.poll(async()=>{const [n,open,folds]=[await standIns.count(),await standIns.filter({has:page.locator('article.dashboard-widget:visible')}).count(),await standIns.locator('.phone-fold-toggle').count()];return open===n&&folds===0?'every stand-in open':`${open} of ${n} stand-ins open, ${folds} folds`;}).toBe('every stand-in open');
 if(await page.getByRole('button',{name:'Finish customizing',exact:true}).isVisible())return;
 // Session AB-Design Phase 2 (ADR-024): both counts read together until they agree, so a widget that mounts a moment later
 // (a lazy part) is counted on both sides; still exactly one fold per widget.
 await expect.poll(async()=>{const [m,t]=[await modules.count(),await modules.locator('.phone-fold-toggle').count()];return t===m?'one fold per widget':`${t} folds for ${m} widgets`;}).toBe('one fold per widget');
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
