import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (D-088, N-BN-10, DV-266, D-005, N-BN-05): Berlin, Denver and Nairobi found Settings on a computer too long to
// scan. Each of its six groups folds from its heading; every group is open by default (so nothing anyone reaches today
// moves or hides); "Fold all" beside the sticky index shortens the page to six headings, each with a one-line summary;
// a jump (an index link, a deep link, a fragment) opens the group that holds its target and lands on it. The folds last
// for this tab only (sessionStorage 'zigoals:settings-folds:v1').
const GROUPS = [['settings-data', 'Data & privacy'], ['settings-app', 'Your app'], ['settings-areas', 'Your areas'], ['settings-account', 'Account & devices'], ['settings-zigi', 'Your assistant'], ['settings-help', 'Help & diagnostics']] as const;
const KEY = 'zigoals:settings-folds:v1';
const toggle = (page: Page, title: string) => page.getByRole('heading', {level: 2, name: title, exact: true}).getByRole('button', {name: title, exact: true});
const foldAll = (page: Page) => page.getByRole('navigation', {name: 'Settings sections'}).getByRole('button', {name: /^(Fold all|Open all)$/});
const stored = (page: Page) => page.evaluate(key => sessionStorage.getItem(key), KEY);

async function open(page: Page, path = '/app/settings') {
  await page.goto(path);
  await hydrated(page);
  await expect(page.locator('.settings-sections')).toBeVisible();
}

for (const width of [1280, 1440]) test.describe(`at ${width} px`, () => {
  test.use({viewport: {width, height: 900}});
  test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

  test('D-088: every group starts open; its heading is a 44 px button inside the h2', async ({page}) => {
    await open(page);
    for (const [id, title] of GROUPS) {
      const button = toggle(page, title);
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      await expect(button).toHaveAttribute('aria-controls', `${id}-body`);
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator(`#${id}-body`)).toBeAttached();
      await expect(page.locator(`#${id}-summary`)).toHaveCount(0);
      // The group keeps its name, from the heading (tests/settings-groups.spec.ts).
      await expect(page.getByRole('group', {name: title, exact: true})).toHaveAttribute('id', id);
    }
    await expect(page.locator('#send-feedback')).toBeAttached();
    await expect(foldAll(page)).toHaveText('Fold all');
    expect((await foldAll(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await stored(page)).toBeNull();
  });

  test('D-088: Fold all shortens the page to six headings with summaries; a deep link then opens its group', async ({page}) => {
    await open(page);
    const tall = await page.evaluate(() => document.documentElement.scrollHeight);
    await foldAll(page).click();
    await expect(foldAll(page)).toHaveText('Open all');
    for (const [id, title] of GROUPS) {
      await expect(toggle(page, title)).toHaveAttribute('aria-expanded', 'false');
      await expect(page.locator(`#${id}-summary`)).toBeVisible();
      await expect(page.locator(`#${id}-body`)).toBeHidden();
    }
    await expect(page.locator('#settings-data-summary')).toHaveText('Your data, backups, export everything, import from other apps and erase everything');
    await expect(page.locator('#settings-help-summary')).toHaveText('Storage health, diagnostics, send feedback, Point & tell and about this alpha');
    // Each summary is one line.
    for (const [id] of GROUPS) expect((await page.locator(`#${id}-summary`).boundingBox())!.height).toBeLessThan(32);
    await expect(page.locator('#send-feedback')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(tall * 0.6);
    expect(JSON.parse((await stored(page))!)).toEqual(GROUPS.map(([id]) => id));
    // A deep link to a section inside a folded group opens that group only and lands on the section.
    await page.goto('/app/settings#send-feedback');
    await hydrated(page);
    await expect(toggle(page, 'Help & diagnostics')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#send-feedback')).toBeInViewport();
    await expect(toggle(page, 'Data & privacy')).toHaveAttribute('aria-expanded', 'false');
    expect(JSON.parse((await stored(page))!)).not.toContain('settings-help');
    // A group's own deep link (as Help and Search use) does the same.
    await page.goto('/app/settings#settings-zigi');
    await hydrated(page);
    await expect(toggle(page, 'Your assistant')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#settings-zigi-title')).toBeInViewport();
  });

  test('D-088: an index link opens its folded group and scrolls to it; a fragment change does too', async ({page}) => {
    await open(page);
    await foldAll(page).click();
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

  test('D-088: Open all restores every group; the folds last for this tab only', async ({page}) => {
    await open(page);
    await foldAll(page).click();
    await page.reload();
    await hydrated(page);
    await expect(toggle(page, 'Your areas')).toHaveAttribute('aria-expanded', 'false');
    await expect(foldAll(page)).toHaveText('Open all');
    await foldAll(page).click();
    for (const [id, title] of GROUPS) {
      await expect(toggle(page, title)).toHaveAttribute('aria-expanded', 'true');
      await expect(page.locator(`#${id}-summary`)).toHaveCount(0);
    }
    await expect(page.locator('#send-feedback')).toBeVisible();
    await expect(foldAll(page)).toHaveText('Fold all');
    expect(await stored(page)).toBeNull();
    // Never a record: localStorage holds no fold.
    expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBeNull();
  });

  test('D-088: the keyboard folds and opens a group from its heading, with focus visible', async ({page}) => {
    await open(page);
    const button = toggle(page, 'Your app');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#settings-app-summary')).toBeVisible();
    await expect(button).toBeFocused();
    expect(await button.evaluate(el => el.matches(':focus-visible'))).toBe(true);
    // A folded group's heading is described by its summary.
    await expect(button).toHaveAttribute('aria-describedby', 'settings-app-summary');
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#settings-app-summary')).toHaveCount(0);
    // Tab moves from the heading into its open group.
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.getElementById('settings-app-body')?.contains(document.activeElement))).toBe(true);
    // The other groups never moved.
    for (const [, title] of GROUPS) await expect(toggle(page, title)).toHaveAttribute('aria-expanded', 'true');
  });

  test('D-088: no motion on a fold under reduced motion', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await open(page);
    const chevron = page.locator('#settings-help-title .settings-fold-chevron');
    expect(await chevron.evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0))).toBe(true);
    expect(await toggle(page, 'Help & diagnostics').evaluate(el => getComputedStyle(el).transitionDuration.split(',').every(d => parseFloat(d) === 0))).toBe(true);
  });
});
