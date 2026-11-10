import {expect, test, type Page} from '@playwright/test';
import {hydrated, offlineApi} from '../../ah-helpers';
import {applyTheme} from '../../p6-helpers';
import {chooseChain} from '../../chain-choice';
import {openZigi, zigiPanel} from '../../zigi-open';

/**
 * Session AL second pass, lane L10a (the shared shell). Each test names the finding ids it reproduces; fresh profile,
 * the bot's width and theme, /api answering 503. Written to fail on main and pass on the branch.
 */
test.beforeEach(async ({page}) => { await offlineApi(page); });
const desktopOnly = (isMobile: boolean) => test.skip(isMobile, 'A computer window');

async function ready(page: Page, path: string) {
  await page.goto(path); await hydrated(page);
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('main h1').first()).toBeVisible();
}

test('Q6 (ADR-037; L7, BN-064/PR-042): a focused private field pauses the open ZIGi panel instead of closing it', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1280, height: 900});
  await ready(page, '/app/goals');
  await openZigi(page);
  // A password field on the page takes the focus while the panel is open (the sign-in form's case on Settings).
  await page.evaluate(() => { const field = Object.assign(document.createElement('input'), {type: 'password', id: 'q6-secret'}); field.setAttribute('aria-label', 'A secret'); document.querySelector('main')!.prepend(field); field.focus(); });
  await expect(page.locator('#q6-secret')).toBeFocused();
  await expect(zigiPanel(page)).toBeVisible();
  await expect(zigiPanel(page)).toContainText(/private screen/i);
  // Leaving the field: the panel is still there and reads the page again.
  await page.locator('#q6-secret').blur();
  await expect(zigiPanel(page)).toBeVisible();
  await expect(zigiPanel(page)).not.toContainText(/private screen/i);
});

test('AL-NAV-013 (TK-046, TK-154, TK-6B-03, X3-06): an opened page that is not in the menu yet gets one line to add it, never "is off"', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await ready(page, '/app/markets');
  const note = page.getByRole('region', {name: 'Hidden page', exact: true});
  await expect(note).toContainText('Markets isn’t in your menu yet.');
  await expect(note).not.toContainText(/is off/);
  expect((await note.boundingBox())!.height).toBeLessThanOrEqual(56);
  await note.getByRole('button', {name: 'Add Markets to your menu'}).click();
  await expect(note).toHaveCount(0);
  await expect(page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Markets', exact: true})).toBeVisible();
});

test('TK-122, NB-002: short addresses lead to the page they mean (calculator, onboarding)', async ({page}) => {
  await page.goto('/app/calculator');
  await expect(page).toHaveURL(/\/app\/wealth\/calculator$/);
  await page.goto('/app/onboarding');
  await expect(page).toHaveURL(/\/app\/welcome$/);
  await page.goto('/app/no-such-page');
  await expect(page.getByRole('heading', {name: 'Page not found.'})).toBeVisible();
});

test('DV-095, NB-028, BN-072: with the game layer on, More lists Journey once; the notes tell Checklist, Tasks and Notes apart', async ({page}) => {
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:game:v1', JSON.stringify({version: 1, enabled: true})); } catch { /* none */ } });
  await page.setViewportSize({width: 375, height: 812});
  await ready(page, '/app');
  await page.getByRole('button', {name: 'More', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'More'});
  await expect(sheet.getByRole('link', {name: 'Journey', exact: true})).toHaveCount(1);
  await expect(sheet.locator('[data-note="Today\'s short list: the few things you starred"]')).toHaveCount(1);
  await expect(sheet.locator('[data-note="Everything to do, by day, project or goal"]')).toHaveCount(1);
  await expect(sheet.locator('[data-note*="ZIGi\'s"]')).toHaveCount(0);
});

test('NB-193, NB-228 (P-NB-38): while arranging, the toast region sits above the Arrange bar', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1280, height: 800});
  await ready(page, '/app/goals');
  await page.getByRole('button', {name: 'Unlock layout to rearrange'}).click();
  const bar = page.getByRole('region', {name: 'Arrange this page'});
  await expect(bar).toBeVisible();
  const [barBox, region] = await Promise.all([bar.boundingBox(), page.locator('.aa-toast-region').evaluate(el => { const r = el.getBoundingClientRect(); return {bottom: r.bottom}; })]);
  expect(region.bottom).toBeLessThanOrEqual(barBox!.y);
});

test('MO-157, DV-244 (AL-NAV-012): beside the tablet rail the theme is one tap away in Apps & extras, with a line for the chosen theme (TK-183)', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 800, height: 900});
  await ready(page, '/app/health');
  await page.getByTestId('apps-extras-button').click();
  const sheet = page.getByRole('dialog', {name: 'Apps & extras'});
  const group = sheet.getByRole('radiogroup', {name: 'Theme'});
  await expect(group).toBeVisible();
  await group.getByRole('radio', {name: 'Light theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(sheet).toContainText('Light is ZIGoals by day');
});

test('DV-029a, DV-051c (AL-LAYOUT-DESKTOP-017): a theme switch keeps the sidebar where it was scrolled', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1280, height: 640});
  await ready(page, '/app');
  const sidebar = page.locator('aside.app-sidebar');
  const top = await sidebar.evaluate(s => { s.scrollTop = s.scrollHeight; return s.scrollTop; });
  test.skip(top === 0, 'the sidebar fits this window');
  await sidebar.getByRole('radio', {name: 'Light theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.waitForTimeout(600);
  expect(Math.abs(await sidebar.evaluate(s => s.scrollTop) - top)).toBeLessThanOrEqual(1);
});

for (const width of [901, 960, 1024, 1099] as const)
  test(`NB-245 (3c): a ${width} px computer window keeps the page at a readable width beside the sidebar`, async ({page, isMobile}) => {
    desktopOnly(isMobile);
    await page.setViewportSize({width, height: 800});
    await ready(page, '/app/habits');
    const main = (await page.locator('main#main').boundingBox())!;
    expect(main.width, `${width}: main ${Math.round(main.width)} px`).toBeGreaterThanOrEqual(640);
    const lede = (await page.locator('main .pillar-hero-lede').first().boundingBox())!;
    expect(lede.width).toBeGreaterThanOrEqual(320);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });

test('BN-127 (P-BN-49, decided under O3): Governance keeps its launcher lane only where launchers float without the gutter', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await chooseChain(page);
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:earn-prefs:v1', JSON.stringify({version: 1, pageShown: true, governanceShown: true})); } catch { /* none */ } });
  const lane = async (width: number) => { await page.setViewportSize({width, height: 900}); await ready(page, '/app/governance'); return page.locator('.governance-page').evaluate(el => getComputedStyle(el).paddingInlineEnd); };
  expect(await lane(1440)).toBe('0px'); // the main column's 58 px gutter already keeps the lane
  // Session AL (CI 1629, deliberate; D-064/AL-LAUNCHER-OVERLAP-001, 53df729f): from 901 px the main column keeps the same 58 px
  // gutter as from 1280 px (app/globals.css), so Governance needs no lane of its own at 1024 either; the gutter is asserted.
  expect(await lane(1024)).toBe('0px');
  expect(await page.locator('main#main').evaluate(el => getComputedStyle(el).paddingInlineEnd)).toBe('58px');
  expect(await lane(800)).toBe('0px'); // nothing floats below 901 px (O3)
});

test('BN-016, BN-186 (P-BN-34): a page switch that changes more than itself says so beside the switches', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1280, height: 900});
  await ready(page, '/app/settings');
  const card = page.locator('#your-pages');
  await card.getByRole('switch', {name: 'Today', exact: true}).click();
  await expect(card.getByRole('status')).toContainText('Today is hidden. You can show it again here at any time. ZIGoals now opens on Goals');
  await card.getByRole('switch', {name: 'Markets', exact: true}).click();
  await expect(card.getByRole('status')).toContainText('The money pages that start off');
});

test('DV-045c, D-249 (AL-NAV-010): the Pages preview shows the sidebar as it is, the Checklist and the Apps group included', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await page.setViewportSize({width: 1280, height: 900});
  await ready(page, '/app/settings');
  const preview = page.locator('#your-pages .pages-preview-sidebar');
  await expect(preview).toContainText('Checklist');
  await expect(preview).toContainText('Apps');
  await expect(preview).toContainText('NOVA');
});

test('TK-6B-05 (P-TK-65): on a phone the Alpha notice keeps "Saved in this browser only" beside its whole label', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/app/goals');
  const notice = page.getByRole('complementary', {name: 'Alpha notice'});
  await expect(notice.locator('.alpha-notice-short')).toBeVisible();
  await expect(notice.locator('.alpha-notice-short')).toHaveText('Saved in this browser only');
  expect(await notice.locator('strong').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test('MO-068, BUG-033 (AL-LAYOUT-375-012): Health in Dark at 375 px in a touch phone profile never pans sideways', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 375, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
  const page = await context.newPage();
  await offlineApi(page);
  await applyTheme(page, 'dark');
  await ready(page, '/app/health');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await page.locator('main h1').first().click();
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
  expect(await page.evaluate(() => scrollX)).toBe(0);
  await context.close();
});

test('NB-073, NB-075 (P-NB-32): the 30-day grid keeps "Under half" apart from an empty day in Dark', async ({page, isMobile}) => {
  desktopOnly(isMobile);
  await applyTheme(page, 'dark');
  await page.setViewportSize({width: 1280, height: 900});
  await ready(page, '/app/habits');
  const colours = await page.evaluate(() => {
    const probe = (level: string | null) => { const el = document.createElement('span'); if (level) el.dataset.level = level; const grid = document.createElement('div'); grid.className = 'habit-month-grid'; grid.append(el); document.body.append(grid); const c = getComputedStyle(el).backgroundColor; grid.remove(); return c; };
    return {empty: probe(null), some: probe('some')};
  });
  expect(colours.some).toBe('rgb(55, 85, 115)');
  expect(colours.some).not.toBe(colours.empty);
});
