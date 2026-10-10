import {expect, test, type Locator, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

/**
 * Session V Part 14, ZIGi's mini window (Document Picture-in-Picture), end to end. The test browser's own Document
 * Picture-in-Picture is used (Chromium has it); a browser without it gets a stand-in that does what the API does:
 * `requestWindow` opens a same-origin window of the given size, from the click. The test notes which one ran.
 * Checked: "Pop out" only where the API exists and never on phones; the same chat goes on in the mini window with the
 * page's own styles; "Back to tab", ZIGi's button and the window's own close; a private screen in the tab pauses it.
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
async function seed(page: Page) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const values = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})};
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
/** The browser's own Document Picture-in-Picture ('real'), the stand-in, or none at all. */
async function pictureInPicture(page: Page, mode: 'real' | 'stand-in' | 'none') {
  if (mode === 'real') return;
  await page.addInitScript(on => {
    if (!on) { Object.defineProperty(window, 'documentPictureInPicture', {value: undefined, configurable: true}); return; }
    const host = {window: null as Window | null, requestWindow: async ({width, height}: {width: number; height: number}) => {
      const win = window.open('', 'zigi-mini-window', `popup,width=${width},height=${height}`);
      if (!win) throw new Error('The mini window was refused.');
      host.window = win; return win;
    }};
    Object.defineProperty(window, 'documentPictureInPicture', {value: host, configurable: true});
    // Like the real one, the mini window goes when the page that opened it goes.
    window.addEventListener('pagehide', () => host.window?.close());
  }, mode === 'stand-in');
}
/** The real API where this browser has it, else the stand-in; the choice is noted on the test. */
async function bestPictureInPicture(page: Page) {
  await page.goto('/app/settings');
  const real = await page.evaluate(() => typeof (window as unknown as {documentPictureInPicture?: {requestWindow?: unknown}}).documentPictureInPicture?.requestWindow === 'function');
  test.info().annotations.push({type: 'mini window', description: real ? "the browser's own Document Picture-in-Picture" : 'the stand-in'});
  await pictureInPicture(page, real ? 'real' : 'stand-in');
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
/**
 * A click on a control that closes the mini window it sits in. Real Chrome can close the window before Playwright's click
 * returns ("Target page, context or browser has been closed", CI on d157fbc), so the click and the window's close are
 * awaited together; a click error counts only while the window is still open.
 */
async function clickThatCloses(mini: Page, target: Locator) {
  await Promise.all([mini.waitForEvent('close'), target.click().catch(error => { if (!mini.isClosed()) throw error; })]);
}
const openButton = (page: Page) => page.getByRole('button', {name: /Open ZIGi|Close ZIGi, your AI/});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('"Pop out" only where the browser offers the mini window, and never on a phone', async ({page, isMobile}) => {
  if (isMobile) await pictureInPicture(page, 'real'); else await bestPictureInPicture(page);
  await seed(page);
  await page.goto('/app/habits');
  await openButton(page).click();
  await expect(panel(page)).toBeVisible();
  // A phone layout never offers it, whatever the browser has.
  await expect(panel(page).getByRole('button', {name: 'Pop out ZIGi into a mini window'})).toHaveCount(isMobile ? 0 : 1);
});

test('without the API there is no "Pop out"', async ({page, isMobile}) => {
  test.skip(isMobile, 'computers only');
  await pictureInPicture(page, 'none');
  await seed(page);
  await page.goto('/app/habits');
  await openButton(page).click();
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).getByRole('button', {name: 'Expand the chat'})).toBeVisible();
  await expect(panel(page).getByRole('button', {name: 'Pop out ZIGi into a mini window'})).toHaveCount(0);
});

test('the same chat goes on in the mini window; "Back to tab" and ZIGi\'s button bring it back; a private screen pauses it', async ({page, context, isMobile}) => {
  test.skip(isMobile, 'computers only');
  await bestPictureInPicture(page);
  await seed(page);
  await page.goto('/app/habits');
  await openButton(page).click();
  await panel(page).getByLabel('Ask ZIGi about your records').fill('How many minutes did I meditate this month?');
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(1);
  const opened = context.waitForEvent('page');
  await panel(page).getByRole('button', {name: 'Pop out ZIGi into a mini window'}).click();
  const mini = await opened;
  const chat = mini.locator('section.ai-chat-pip');
  await expect(chat).toBeVisible();
  // The tab's panel is closed; the conversation is the same one.
  await expect(panel(page)).toHaveCount(0);
  await expect(chat.locator('.ai-turn-assistant')).toHaveCount(1);
  // The page's own styles came over as style elements (nothing to fetch), and the panel fills the window.
  expect(await mini.evaluate(() => document.querySelectorAll('style').length)).toBeGreaterThan(0);
  expect(await mini.evaluate(() => document.querySelectorAll('link').length)).toBe(0);
  expect(await mini.evaluate(() => getComputedStyle(document.querySelector('section.ai-chat-pip')!).display)).toBe('flex');
  expect(await mini.title()).toBe('ZIGi · Your Personal AI Companion');
  // Asking goes on there.
  await chat.getByLabel('Ask ZIGi about your records').fill('How many minutes did I meditate this month?');
  await chat.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(chat.locator('.ai-turn-assistant')).toHaveCount(2);
  // The tab moves on (the chat stays in the mini window), and a private screen there (any of its own sheets, here
  // "Add asset") pauses it behind a blur, with nothing inside usable until the sheet closes.
  await page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Wealth', exact: true}).click();
  await page.waitForURL('**/app/wealth');
  await expect(chat.locator('.ai-turn-assistant')).toHaveCount(2);
  await page.locator('.wealth-actions').getByRole('button', {name: '+ Add asset', exact: true}).click();
  await expect(page.locator('dialog.wealth-sheet[open]')).toBeVisible();
  await expect(mini.getByRole('status').filter({hasText: 'Paused while a private screen is open in the tab'})).toBeVisible();
  expect(await chat.evaluate(el => (el as HTMLElement).inert)).toBe(true);
  await page.locator('dialog.wealth-sheet[open]').getByRole('button', {name: 'Close dialog'}).click();
  await expect(mini.getByText('Paused while a private screen is open in the tab')).toHaveCount(0);
  // "Back to tab": the window closes and the panel opens in the tab with the same conversation.
  await clickThatCloses(mini, chat.getByRole('button', {name: 'Back to the tab'}));
  await expect.poll(() => mini.isClosed()).toBe(true);
  await expect(panel(page)).toBeVisible();
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(2);
  // ZIGi's button while the chat is popped out also brings it back.
  const again = context.waitForEvent('page');
  await panel(page).getByRole('button', {name: 'Pop out ZIGi into a mini window'}).click();
  const second = await again;
  await expect(second.locator('section.ai-chat-pip')).toBeVisible();
  await openButton(page).click();
  await expect.poll(() => second.isClosed()).toBe(true);
  await expect(panel(page)).toBeVisible();
  // Its own close button closes it, and the panel stays closed.
  const third = context.waitForEvent('page');
  await panel(page).getByRole('button', {name: 'Pop out ZIGi into a mini window'}).click();
  const last = await third;
  await clickThatCloses(last, last.locator('section.ai-chat-pip').getByRole('button', {name: 'Close ZIGi', exact: true}));
  await expect.poll(() => last.isClosed()).toBe(true);
  await expect(panel(page)).toHaveCount(0);
});
