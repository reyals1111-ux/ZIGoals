import {expect, test, type Page, type Route} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {NOVA_KEY} from '../lib/nova/store';

/**
 * Session AK, lane WB (WIRING_AUDIT_2.md N8, Z1C-L1, Z1C-L2): NOVA always open, on the UI path.
 * - "Open ZIGoals on NOVA" (Make it yours): a fresh visit to /app opens NOVA; Today is one tap away; a reload or Back
 *   stays on Today; switched off, /app is Today again.
 * - Z1C-L1: the redirect re-checks that the person is still on Today when its code arrives. The test holds the code of
 *   the check (the chunks that carry NOVA's record, found on a first visit), moves to Habits, then lets the code arrive:
 *   the person stays on Habits. Without the hold released early, the same visit does open NOVA (the control).
 * - Z1C-L2: ⌘/Ctrl + J never opens NOVA's bar over an open dialog (Quick add here); with the dialog closed it does.
 * - NOVA's mini window (Document Picture-in-Picture, or the stand-in that does what the API does where a browser lacks
 *   it): it opens from the top bar, shows the orb, the time and today's line, and closes from the same button.
 * The app's /api routes answer 503 and every other outside host is aborted. No personal data.
 */
const hydrated = (page: Page) => page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
const mainNav = (page: Page) => page.getByRole('navigation', {name: 'Main navigation'});
const startSwitch = (page: Page) => page.getByRole('switch', {name: /^Open ZIGoals on NOVA/});
const novaRecord = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {startOnNova?: boolean} | null, NOVA_KEY);
async function seed(page: Page, nova: Record<string, unknown> = {}) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3\d{3}\/)(?!localhost:3\d{3}\/)/, route => route.abort());
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/robots.txt');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), [NOVA_KEY]: JSON.stringify({version: 1, openingSeen: true, ...nova}),
  });
}
/** Long enough for the start check's code to load and act (it is one small lazy chunk from this same server). */
const settle = (page: Page) => page.waitForTimeout(2_000);

test.describe('NOVA always open, on a computer', () => {
  test.skip(({isMobile}) => isMobile, 'the start page, ⌘/Ctrl + J and the mini window are a computer\'s; the phone opens NOVA from More');
  test.use({viewport: {width: 1440, height: 900}});

  test('N8: "Open ZIGoals on NOVA" — a fresh visit opens NOVA, Today is one tap away, a reload or Back stays on Today', async ({page}) => {
    await seed(page);
    await page.goto('/app/nova');
    await page.getByRole('button', {name: 'Customize the view'}).click();
    await expect(startSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await startSwitch(page).click();
    await expect(startSwitch(page)).toHaveAttribute('aria-checked', 'true');
    await expect.poll(async () => (await novaRecord(page))?.startOnNova).toBe(true);
    await page.getByRole('button', {name: 'Close Make NOVA yours'}).click();

    // A fresh visit to the start URL opens on NOVA.
    await page.goto('/app');
    await expect(page).toHaveURL(/\/app\/nova$/);
    // Today is one tap away.
    await page.getByRole('button', {name: /^Exit NOVA/}).click();
    await expect(page).toHaveURL(/\/app\/today$/);
    await mainNav(page).getByRole('link', {name: 'Today', exact: true}).click();
    await expect(page).toHaveURL(/\/app$/);
    await settle(page);
    await expect(page).toHaveURL(/\/app$/);
    // A reload of Today stays on Today.
    await page.reload();
    await hydrated(page);
    await settle(page);
    await expect(page).toHaveURL(/\/app$/);
    // Back to Today stays on Today.
    await page.goto('/app/habits');
    await hydrated(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/app$/);
    await settle(page);
    await expect(page).toHaveURL(/\/app$/);
    // Any other page opens as itself.
    await page.goto('/app/habits');
    await settle(page);
    await expect(page).toHaveURL(/\/app\/habits$/);

    // Switched off, the start URL is Today again.
    await page.goto('/app/nova');
    await page.getByRole('button', {name: 'Customize the view'}).click();
    await startSwitch(page).click();
    await expect(startSwitch(page)).toHaveAttribute('aria-checked', 'false');
    await expect.poll(async () => (await novaRecord(page))?.startOnNova).toBe(false);
    await page.goto('/app');
    await hydrated(page);
    await settle(page);
    await expect(page).toHaveURL(/\/app$/);
  });

  test('Z1C-L1: a start check whose code arrives late leaves the person on the page they moved to', async ({page}) => {
    test.setTimeout(90_000);
    await seed(page, {startOnNova: true});
    // A first visit: every script chunk it loads, then the ones that carry NOVA's record (its schema names startOnNova)
    // and are not among the start page's own scripts — the code the start check loads on use.
    const loaded = new Set<string>();
    const listen = (r: {url: () => string}) => { const u = new URL(r.url()); if (u.pathname.startsWith('/_next/static/chunks/') && u.pathname.endsWith('.js')) loaded.add(u.pathname); };
    page.on('request', listen);
    await page.goto('/app');
    await expect(page).toHaveURL(/\/app\/nova$/);
    await page.waitForLoadState('networkidle');
    page.off('request', listen);
    const html = await (await page.request.get('/app')).text();
    const startCode = new Set<string>();
    for (const path of loaded) if (!html.includes(path) && (await (await page.request.get(path)).text()).includes('startOnNova')) startCode.add(path);
    expect(startCode.size, 'the start check loads NOVA\'s record code on use').toBeGreaterThan(0);

    // Hold that code; `release` lets it arrive.
    const hold = async () => {
      const held: Route[] = []; let release = () => {};
      const gate = new Promise<void>(resolve => { release = resolve; });
      await page.route(url => startCode.has(url.pathname), async route => { held.push(route); await gate; await route.continue(); });
      return {held, release: () => release()};
    };
    // The control: held, then released while the person is still on Today, the visit opens NOVA.
    await page.goto('/robots.txt');
    let code = await hold();
    await page.goto('/app');
    await hydrated(page);
    await expect.poll(() => code.held.length).toBeGreaterThan(0);
    await expect(page).toHaveURL(/\/app$/);
    code.release();
    await expect(page).toHaveURL(/\/app\/nova$/);
    await page.unrouteAll({behavior: 'ignoreErrors'});

    // The case: the person moves to Habits while the code is on its way; when it arrives they stay on Habits.
    await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
    await page.goto('/robots.txt');
    code = await hold();
    await page.goto('/app');
    await hydrated(page);
    await expect.poll(() => code.held.length).toBeGreaterThan(0);
    await mainNav(page).getByRole('link', {name: 'Habits', exact: true}).click();
    await expect(page).toHaveURL(/\/app\/habits$/);
    code.release();
    await settle(page);
    await expect(page).toHaveURL(/\/app\/habits$/);
  });

  test('Z1C-L2: ⌘/Ctrl + J does not open NOVA\'s bar over an open dialog; with the dialog closed it does', async ({page}) => {
    await seed(page);
    await page.goto('/app');
    await hydrated(page);
    const shortcut = process.platform === 'darwin' ? 'Meta+j' : 'Control+j';
    const bar = page.locator('dialog.nova-bar[open]');
    await page.locator('.today-hero').getByRole('button', {name: '+ Quick add', exact: true}).click();
    const quickAdd = page.locator('dialog.quick-add-dialog[open]');
    await expect(quickAdd).toBeVisible();
    await page.keyboard.press(shortcut);
    await page.waitForTimeout(800);
    await expect(bar).toHaveCount(0);
    await expect(quickAdd).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(quickAdd).toHaveCount(0);
    await page.keyboard.press(shortcut);
    await expect(bar).toBeVisible();
  });

  test('N8: NOVA\'s mini window opens from the top bar with the orb, the time and today, and closes from the same button', async ({page, context}) => {
    await seed(page);
    await page.goto('/app/settings'); /* Session AP: a seed only writes storage here; no group needs opening */
    const real = await page.evaluate(() => typeof (window as unknown as {documentPictureInPicture?: {requestWindow?: unknown}}).documentPictureInPicture?.requestWindow === 'function');
    test.info().annotations.push({type: 'mini window', description: real ? "the browser's own Document Picture-in-Picture" : 'the stand-in'});
    if (!real) await page.addInitScript(() => {
      const host = {window: null as Window | null, requestWindow: async ({width, height}: {width: number; height: number}) => {
        const win = window.open('', 'nova-mini-window', `popup,width=${width},height=${height}`);
        if (!win) throw new Error('The mini window was refused.');
        host.window = win; return win;
      }};
      Object.defineProperty(window, 'documentPictureInPicture', {value: host, configurable: true});
      window.addEventListener('pagehide', () => host.window?.close());
    });
    await page.goto('/app/nova');
    const open = page.getByRole('button', {name: 'Open a mini window that stays on top'});
    await expect(open).toHaveAttribute('aria-pressed', 'false');
    const opened = context.waitForEvent('page');
    await open.click();
    const mini = await opened;
    const frame = mini.locator('.nova-mini');
    await expect(frame).toBeVisible();
    expect(await mini.title()).toBe('NOVA · mini window');
    await expect(frame.locator('.nova-name')).toHaveText('NOVA');
    await expect(frame.getByRole('region', {name: 'Today'})).toBeVisible();
    await expect(frame.getByRole('button', {name: 'Back to NOVA'})).toBeVisible();
    // The page's own styles came over (nothing to fetch in the window).
    expect(await mini.evaluate(() => document.querySelectorAll('style').length)).toBeGreaterThan(0);
    const close = page.getByRole('button', {name: 'Close the mini window'});
    await expect(close).toHaveAttribute('aria-pressed', 'true');
    await Promise.all([mini.waitForEvent('close'), close.click()]);
    await expect(page.getByRole('button', {name: 'Open a mini window that stays on top'})).toHaveAttribute('aria-pressed', 'false');
  });
});
