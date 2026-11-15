import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (D-088, N-BN-10, DV-266, D-005, N-BN-05): Berlin, Denver and Nairobi found Settings on a computer too long to
// scan. Each of its six groups folds from its heading; every group is open by default (so nothing anyone reaches today
// moves or hides); "Fold all" beside the sticky index shortens the page to six headings, each with a one-line summary;
// a jump (an index link, a deep link, a fragment) opens the group that holds its target and lands on it. The folds last
// for this tab only (sessionStorage 'zigoals:settings-folds:v1').
// Session AO (owner decision 13 Nov, deliberate): Appearance is the first group (theme, motion, display; #appearance moved
// out of Your app unchanged).
const GROUPS = [['settings-look', 'Appearance'], ['settings-data', 'Data & privacy'], ['settings-app', 'Your app'], ['settings-areas', 'Your areas'], ['settings-account', 'Account & devices'], ['settings-zigi', 'Your assistant'], ['settings-help', 'Help & diagnostics']] as const;
// Session AP (D-088 completed, owner brief 14 Nov; deliberate, ADR-040): on a computer every group now STARTS folded, a page of
// headings each with its one-line summary; the groups a person opens stay open on this device (localStorage
// 'zigoals:settings-open:v1'); a jump still opens the group it lands in. Each check below is the AL check for the same
// behaviour with the new start: nothing is weakened (the 44 px buttons, the summaries, one line each, the deep links, the
// keyboard, no motion).
const KEY = 'zigoals:settings-open:v1', OLD_KEY = 'zigoals:settings-folds:v1';
const toggle = (page: Page, title: string) => page.getByRole('heading', {level: 2, name: title, exact: true}).getByRole('button', {name: title, exact: true});
const foldAll = (page: Page) => page.getByRole('navigation', {name: 'Settings sections'}).getByRole('button', {name: /^(Fold all|Open all)$/});
const stored = (page: Page) => page.evaluate(key => localStorage.getItem(key), KEY);

async function open(page: Page, path = '/app/settings') {
  await page.goto(path);
  await hydrated(page);
  await expect(page.locator('.settings-sections')).toBeVisible();
}

for (const width of [1280, 1440]) test.describe(`at ${width} px`, () => {
  test.use({viewport: {width, height: 900}});
  // A device that holds a record of its own (a money log), so every group folds (D20: a new device keeps the Showcase's
  // group open; tested below).
  test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); await page.evaluate(() => localStorage.setItem('zigoals:money-log:v1', JSON.stringify({version: 1, entries: [], weekStartsOn: 'monday'}))); });

  test('D-088 (D20): on a device with no record yet, and in the Showcase, the group with the Showcase card starts open', async ({page}) => {
    await page.evaluate(() => localStorage.removeItem('zigoals:money-log:v1'));
    await open(page);
    await expect(toggle(page, 'Your app')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('button', {name: 'Load Showcase Demo', exact: true})).toBeVisible();
    for (const [id, title] of GROUPS) if (id !== 'settings-app') await expect(toggle(page, title)).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
    await page.waitForURL('**/app');
    await open(page);
    await expect(toggle(page, 'Your app')).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle(page, 'Data & privacy')).toHaveAttribute('aria-expanded', 'false');
  });

  test('D-088: every group starts folded, a 44 px button inside the h2 with a one-line summary of what it holds', async ({page}) => {
    await open(page);
    for (const [id, title] of GROUPS) {
      const button = toggle(page, title);
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(button).toHaveAttribute('aria-controls', `${id}-body`);
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator(`#${id}-body`)).toBeAttached();
      await expect(page.locator(`#${id}-body`)).toBeHidden();
      await expect(page.locator(`#${id}-summary`)).toBeVisible();
      expect((await page.locator(`#${id}-summary`).boundingBox())!.height).toBeLessThan(32);
      // The group keeps its name, from the heading (tests/settings-groups.spec.ts).
      await expect(page.getByRole('group', {name: title, exact: true})).toHaveAttribute('id', id);
    }
    await expect(page.locator('#settings-data-summary')).toHaveText('Your data, backups, export everything, import from other apps and erase everything');
    await expect(page.locator('#settings-help-summary')).toHaveText('Storage health, diagnostics, send feedback, Point & tell and about this alpha');
    await expect(page.locator('#send-feedback')).toBeAttached();
    await expect(page.locator('#send-feedback')).toBeHidden();
    await expect(foldAll(page)).toHaveText('Open all');
    expect((await foldAll(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await stored(page)).toBeNull();
  });

  test('D-088: Open all shows every group; a deep link opens its own group and lands on it; Fold all shortens the page again', async ({page}) => {
    await open(page);
    const short = await page.evaluate(() => document.documentElement.scrollHeight);
    await foldAll(page).click();
    await expect(foldAll(page)).toHaveText('Fold all');
    for (const [id, title] of GROUPS) {
      await expect(toggle(page, title)).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator(`#${id}-summary`)).toHaveCount(0);
    }
    await expect(page.locator('#send-feedback')).toBeVisible();
    expect(short).toBeLessThan(await page.evaluate(() => document.documentElement.scrollHeight) * 0.6);
    expect(JSON.parse((await stored(page))!)).toEqual(GROUPS.map(([id]) => id));
    await foldAll(page).click();
    await expect(foldAll(page)).toHaveText('Open all');
    expect(await stored(page)).toBeNull();
    // A deep link to a section inside a folded group opens that group only and lands on the section.
    await page.goto('/app/settings#send-feedback');
    await hydrated(page);
    await expect(toggle(page, 'Help & diagnostics')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#send-feedback')).toBeInViewport();
    await expect(toggle(page, 'Data & privacy')).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse((await stored(page))!)).toContain('settings-help');
    // A group's own deep link (as Help and Search use) does the same.
    await page.goto('/app/settings#settings-zigi');
    await hydrated(page);
    await expect(toggle(page, 'Your assistant')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#settings-zigi-title')).toBeInViewport();
  });

  test('D-088: an index link opens its folded group and scrolls to it; a fragment change does too', async ({page}) => {
    await open(page);
    await page.getByRole('navigation', {name: 'Settings sections'}).getByRole('link', {name: 'Your assistant', exact: true}).click();
    await expect(page).toHaveURL(/#settings-zigi$/);
    await expect(toggle(page, 'Your assistant')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#settings-zigi-title')).toBeInViewport();
    await expect(page.locator('#settings-zigi-body')).toBeVisible();
    await expect(toggle(page, 'Your app')).toHaveAttribute('aria-expanded', 'false');
    // A fragment set some other way (back and forward, a typed address).
    await page.evaluate(() => { window.location.hash = 'send-feedback'; });
    await expect(toggle(page, 'Help & diagnostics')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#send-feedback')).toBeInViewport();
  });

  test('D-088: the groups opened stay open on this device after a reload; never in the tab-only key', async ({page}) => {
    await open(page);
    await toggle(page, 'Your areas').click();
    await expect(toggle(page, 'Your areas')).toHaveAttribute('aria-expanded', 'true');
    await page.reload();
    await hydrated(page);
    await expect(toggle(page, 'Your areas')).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle(page, 'Your app')).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse((await stored(page))!)).toEqual(['settings-areas']);
    expect(await page.evaluate(key => sessionStorage.getItem(key), OLD_KEY)).toBeNull();
  });

  test('D-088: the keyboard opens and folds a group from its heading, with focus visible', async ({page}) => {
    await open(page);
    const button = toggle(page, 'Your app');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#settings-app-summary')).toHaveCount(0);
    await expect(button).toBeFocused();
    expect(await button.evaluate(el => el.matches(':focus-visible'))).toBe(true);
    // Tab moves from the heading into its open group.
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.getElementById('settings-app-body')?.contains(document.activeElement))).toBe(true);
    await button.focus();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    // A folded group's heading is described by its summary.
    await expect(button).toHaveAttribute('aria-describedby', 'settings-app-summary');
    await expect(page.locator('#settings-app-summary')).toBeVisible();
    // The other groups never moved.
    for (const [, title] of GROUPS) await expect(toggle(page, title)).toHaveAttribute('aria-expanded', 'false');
  });

  test('D-088: no motion on a fold under reduced motion', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await open(page);
    const chevron = page.locator('#settings-help-title .settings-fold-chevron');
    expect(await chevron.evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0))).toBe(true);
    expect(await toggle(page, 'Help & diagnostics').evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0))).toBe(true);
  });
});
