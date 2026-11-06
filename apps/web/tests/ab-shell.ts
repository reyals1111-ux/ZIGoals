import {expect,type Locator,type Page} from '@playwright/test';
import {isPhone,navLink,openMore} from './phone-nav';

/**
 * Session AB-Design (owner request 8, ADR-024 D7): the Alpha's facts moved from the top-of-page banners to one compact
 * notice (closable on the device) and the footer's disclaimer line on every page; a phone keeps every notice in full in
 * the Status & wallet sheet behind More. Session AC: the footer's line moved to Settings (see `aboutAlpha`). These
 * helpers assert the same facts at their new places, as strictly.
 */
// Session AF (crit1, ADR-028 H124; `TIER 3 (public-safety labels)`): the label changed with real-network staking (it was
// "PRACTICE MONEY (NO REAL VALUE) · PUBLIC ALPHA"); every place that asserted it keeps asserting it, word for word.
// Session AK X1 (RELEASE_REVIEW R8; owner: "consumer first, chain invisible"; deliberate): "unless you sign" means nothing to a
// person who never chose the chain, so a new device reads the neutral Alpha line; once the chain is chosen
// (tests/chain-choice.ts) the label is the public-safety one, word for word. The sentence below is unchanged everywhere.
export const ALPHA_LABEL='PUBLIC ALPHA';
export const ALPHA_LABEL_CHOSEN='PUBLIC ALPHA · NOTHING MOVES UNLESS YOU SIGN';
// Session AF (ADR-028 H19, H62; `TIER 3 (public-safety labels)`): the sentence changed with native-staking signing (it was
// "Simulation + wallet connection only. No blockchain transactions or financial signatures.").
export const ALPHA_SENTENCE='Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys.';
/**
 * Session AK P2 (RELEASE_REVIEW_2 R2-7, ADR-036 Q31; deliberate, `TIER 3 (public-safety labels)`): on a device that never
 * chose the chain the notice's line is this consumer line, and the sentence above is behind its More: Help's "About this
 * Alpha" quotes it word for word, Settings' facts block carries it (both asserted where they live). Once the chain is
 * chosen the notice carries the sentence, as before.
 */
export const ALPHA_LINE_PLAIN='Your records stay in this browser and are not a backup.';
/** Where the notice's More leads, and the place there that quotes the sentence. */
export const ALPHA_MORE_HREF='/app/help#help-z-about';
/** Checks the notice's line on a computer: the consumer line with the sentence behind More (never chose), or the sentence. */
export async function expectNoticeLine(page:Page,label:string,path=''){
 if(label===ALPHA_LABEL){
  await expect(alphaNotice(page),path).toContainText(ALPHA_LINE_PLAIN);
  await expect(alphaNotice(page).locator('p').first(),path).not.toContainText(ALPHA_SENTENCE);
  await expect(alphaNotice(page).getByRole('link',{name:'More',exact:true}),path).toHaveAttribute('href',ALPHA_MORE_HREF);
 }else await expect(alphaNotice(page),path).toContainText(ALPHA_SENTENCE);
}
// Session AF (ADR-028 H19, H62): staking signs in the person's own wallet from every mode, so the strip says so.
export const MODE_LOCAL='LOCAL SIMULATION · Mode: this tab · Stored in this browser · Only staking signs, in your own wallet';
/** The compact notice at the top of every page (until closed on this device). */
export const alphaNotice=(page:Page)=>page.getByRole('complementary',{name:'Alpha notice'});
/**
 * Session AC (owner finding 3 on Alpha #41, TIER 3 public-safety labels): the page ends after the footer's link columns;
 * the footer's disclaimer facts moved, word for word and with the hosted verifier's class names, to Settings ("About
 * this alpha" panel, and Settings → Your data), with Help's "About this Alpha". The facts block on a Settings page.
 */
export const aboutAlpha=(page:Page)=>page.locator('.about-alpha');
/**
 * Opens Settings inside the app (the sidebar, or More on a phone: no reload, so this tab's mode and Showcase stay as
 * they are), runs `check` on the facts block there, then goes back to the page it came from.
 */
export async function inAboutAlpha(page:Page,check:(about:Locator)=>Promise<void>,{back=true}:{back?:boolean}={}){
 const from=page.url();
 // A phone's Status & wallet sheet (where Connect Keplr lives) is a modal: it is closed first, as a person would.
 const statusSheet=page.getByRole('dialog',{name:'Status'});
 if(await statusSheet.isVisible()){await page.keyboard.press('Escape');await expect(statusSheet).toBeHidden();}
 if(!new URL(from).pathname.startsWith('/app/settings')){
  await (await navLink(page,'Settings')).click();
  await page.waitForURL(url=>url.pathname==='/app/settings');
 }
 const about=aboutAlpha(page).first();
 await about.scrollIntoViewIfNeeded();
 await check(about);
 if(back&&page.url()!==from){await page.goBack();await page.waitForURL(from);}
}
/**
 * The Alpha's facts, as the hosted verifier reads them: the notice on this page (not yet closed), and the full facts in
 * Settings' block (label, sentence, mode). The second half is what the footer's disclaimer line asserted on every page;
 * since Session AC the page ends after the link columns, so the facts are asserted where they now live.
 */
export async function expectAlphaFacts(page:Page,path='',label=ALPHA_LABEL){
 await expect(alphaNotice(page).locator('strong'),path).toHaveText(label);
 // Session AK P2 (R2-7, deliberate): the line a device that never chose the chain reads, the sentence behind More.
 if(!await isPhone(page))await expectNoticeLine(page,label,path);
 await expect(page.locator('.site-footer .alpha-disclaimer, .site-footer .network-banner, .site-footer .mode-strip'),path).toHaveCount(0);
 // Session AC (owner item 8): the notice's essentials line is for a page that cannot show (no scripts, a stalled read).
 await expect(alphaNotice(page).locator('.alpha-notice-essentials'),path).toHaveCount(0);
 await inAboutAlpha(page,async about=>{
  await expect(about.locator('.network-banner strong'),path).toHaveText(label);
  await expect(about.locator('.network-banner'),path).toContainText(ALPHA_SENTENCE);
  await expect(about.locator('.mode-strip'),path).toContainText('LOCAL SIMULATION');
 });
}
/** The mode as this tab shows it, read in Settings' facts block (the footer's mode strip until Session AC). */
export async function expectAlphaMode(page:Page,text:string|RegExp){
 await inAboutAlpha(page,about=>expect(about.locator('.mode-strip')).toContainText(text));
}
/** On a phone, opens the Status & wallet sheet from More (every notice in full and the wallet buttons); returns it. */
export async function openStatusSheet(page:Page){
 const sheet=page.getByRole('dialog',{name:'Status'});
 if(await sheet.isVisible())return sheet;
 const more=await openMore(page);
 await more.getByRole('button',{name:'Status & wallet',exact:true}).click();
 await expect(sheet).toBeVisible();
 await sheet.evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished.catch(()=>undefined))));
 return sheet;
}

/** Session AB-Design (owner request 13): "See how it works" opens the how-to; the brand film is its "Watch the film" button. */
export async function openFilm(page:Page){
 await page.locator('.today-hero').getByRole('button',{name:'See how it works',exact:true}).click();
 const howTo=page.getByRole('dialog',{name:'Goals, Habits & Health = Wealth',exact:true});
 await expect(howTo).toBeVisible();
 // Session AL (COPY_AUDIT, deliberate; D-184): the film's button says its length in words.
 await howTo.getByRole('button',{name:'Watch the 16-second film',exact:true}).click();
 await expect(page.getByRole('dialog',{name:'ZIGoals brand film',exact:true})).toBeVisible();
 return howTo;
}

/** Session AB-Design (owner request 15): Positions left the Goals filter row for the page's ⋯ menu; this opens it and returns the link. */
export async function goalsPositionsLink(page:Page){
 await page.getByRole('button',{name:'Options for Goals',exact:true}).click();
 const link=page.getByRole('group',{name:'Goals options',exact:true}).getByRole('link',{name:'Positions →',exact:true});
 await expect(link).toHaveAttribute('href','/app/staking#positions');
 return link;
}

/** Session AB-Design (owner request 20): a habit card shows its counter first; the timer, notes, trends, history and management wait behind one "Details" expander. Opens it (idempotent). */
export async function openHabitDetails(card:Locator){
 const more=card.locator('.habit-more').first();
 // The list renders after the store loads: wait for the card itself before deciding it has no details (a count of zero
 // right after navigation once made this helper return early and every click inside the details then waited forever).
 await card.waitFor({timeout:20000});
 if(await more.count()===0)return;
 // Opening is the precondition here, never the behaviour under test. The card is re-created once or twice after the
 // page loads (the list renders again when the store settles; under a fake clock React also client-renders the page
 // afresh), and a details opened on a node that is then replaced reads as closed. So: wait until the same details node
 // survives three checks, open it through the element (`open = true` fires toggle like a tap), and require it to stay open.
 const page=more.page();
 await page.locator('html[data-app-hydrated]').waitFor({timeout:20000});
 let previous=await more.elementHandle(),same=0;
 for(let attempt=0;attempt<40&&same<3;attempt++){
  await page.waitForTimeout(250);
  const current=await more.elementHandle();
  same=previous&&current&&await page.evaluate(([a,b])=>a===b,[previous,current] as const)?same+1:0;
  previous=current;
 }
 const isOpen=()=>more.evaluate(el=>(el as HTMLDetailsElement).open);
 let stable=0;
 for(let attempt=0;attempt<20&&stable<3;attempt++){
  if(!(await isOpen())){stable=0;await more.evaluate(el=>{(el as HTMLDetailsElement).open=true;});}
  await page.waitForTimeout(250);
  if(await isOpen())stable++;else stable=0;
 }
 await expect(more).toHaveAttribute('open','');
}
