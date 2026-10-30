import {expect, test, type Page} from '@playwright/test';

/**
 * Session AJ (item 32, D5): Settings → Appearance → Customize. Font (System / Inter), Text size (Standard / Large), Density
 * (Comfortable / Compact) and Glow (Full / Soft), each kept on this device in zigoals:ui-prefs:v1 (`look`), applied at
 * once, and before the first paint of every later page by the early script (public/theme-boot.js). The defaults set no
 * attribute and fetch nothing. Large text never makes a page scroll sideways.
 */
const KEY = 'zigoals:ui-prefs:v1';
const CHOSEN = {'data-font': 'inter', 'data-text': 'large', 'data-density': 'compact', 'data-glow': 'soft'} as const;
const ATTRS = Object.keys(CHOSEN);

/** No server answers (every /api read is "unavailable"), so nothing reaches a third party; the first-visit notice is
 *  dismissed and Motion is off, so every page is a still. */
async function openDevice(page: Page, record: Record<string, unknown> = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, contentType: 'application/json', body: '{}'}));
  await page.goto('/app/settings');
  await page.evaluate(([k, r]) => { localStorage.setItem(k as string, JSON.stringify({version: 1, dismissed: {alphaNotice: true}, ...(r as object)})); localStorage.setItem('zigoals:motion:v1', 'off'); }, [KEY, record] as const);
}
/** The <html> attributes when <body> is created, before any app script has run. */
const recordAtBody = (page: Page) => page.addInitScript(names => {
  new MutationObserver((records, observer) => { for (const r of records) for (const n of r.addedNodes) if (n instanceof HTMLBodyElement) { Reflect.set(window, '__lookAtBody', Object.fromEntries(names.map(a => [a, document.documentElement.getAttribute(a)]))); observer.disconnect(); } }).observe(document.documentElement, {childList: true});
}, ATTRS);
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Record<string, unknown> | null, KEY);
const card = (page: Page) => page.locator('#appearance').getByRole('group', {name: 'Customize'});
const htmlAttrs = (page: Page) => page.evaluate(names => Object.fromEntries(names.map(a => [a, document.documentElement.getAttribute(a)])), ATTRS);
const NONE = Object.fromEntries(ATTRS.map(a => [a, null]));

test('the defaults: every first choice checked, no attribute, no sheet, no font fetched', async ({page}) => {
  const fonts: string[] = [];
  page.on('request', r => { if (/\/fonts\/inter\/|\/themes\/(text-large|density-compact)\.css/.test(r.url())) fonts.push(r.url()); });
  await openDevice(page);
  await page.reload();
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached({timeout: 30_000});
  const group = card(page);
  await expect(group.getByRole('heading', {name: 'Customize'})).toBeVisible();
  await expect(group).toContainText('Only on this device.');
  for (const [legend, first] of [['Font', 'System'], ['Text size', 'Standard'], ['Density', 'Comfortable'], ['Glow', 'Full']] as const) {
    const set = group.getByRole('group', {name: legend});
    await expect(set.getByRole('radio', {name: first, exact: true})).toBeChecked();
    await expect(set.getByRole('radio')).toHaveCount(2);
  }
  expect(await htmlAttrs(page)).toEqual(NONE);
  await expect(page.locator('#zigoals-text-sheet, #zigoals-density-sheet')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  expect(fonts).toEqual([]);
  // Every choice is a 44 px target.
  for (const box of await group.locator('label.customize-option').evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
  expect((await group.getByRole('button', {name: 'Back to the defaults'}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('Inter, Large, Compact and Soft: applied at once, kept, on the first paint of the next page; back to the defaults', async ({page}) => {
  await openDevice(page, {theme: 'dark', heroCollapsed: false});
  await page.reload();
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached({timeout: 30_000});
  const bodySize = () => page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
  const before = await bodySize();
  const group = card(page);
  for (const [legend, choice] of [['Font', 'Inter'], ['Text size', 'Large'], ['Density', 'Compact'], ['Glow', 'Soft']] as const) {
    await group.getByRole('group', {name: legend}).getByRole('radio', {name: choice, exact: true}).check();
    await expect(group.getByRole('status')).toContainText(`${legend}: ${choice}.`);
  }
  expect(await htmlAttrs(page)).toEqual(CHOSEN);
  await expect(page.locator('#zigoals-text-sheet')).toHaveAttribute('href', /^\/themes\/text-large\.css\?v=[0-9a-f]{12}$/);
  await expect(page.locator('#zigoals-density-sheet')).toHaveAttribute('href', /^\/themes\/density-compact\.css\?v=[0-9a-f]{12}$/);
  await expect.poll(bodySize).toBeCloseTo(before * 1.125, 1);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(/^"?Inter"?,/);
  // Only the look changed in the device's record; the theme and the rest stay.
  expect(await stored(page)).toEqual({version: 1, dismissed: {alphaNotice: true}, theme: 'dark', heroCollapsed: false, look: {font: 'inter', textSize: 'large', density: 'compact', glow: 'soft'}});

  // The next load: on <html> right after the response arrives and before <body> exists (before hydration), then after load.
  await recordAtBody(page);
  await page.goto('/app/goals', {waitUntil: 'commit'});
  for (const [name, value] of Object.entries(CHOSEN)) await expect(page.locator('html')).toHaveAttribute(name, value);
  await page.waitForLoadState('load');
  expect(await page.evaluate(() => Reflect.get(window, '__lookAtBody'))).toEqual(CHOSEN);
  expect(await htmlAttrs(page)).toEqual(CHOSEN);
  await expect(page.locator('html')).not.toHaveAttribute('data-look-loading', /.*/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.evaluate(() => document.fonts.ready);
  // The self-hosted Inter is the face in use (fetched same-origin now that it is chosen).
  await expect.poll(() => page.evaluate(() => [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Inter' && f.status === 'loaded'))).toBe(true);

  // Back to the defaults: every attribute and sheet goes, and so does the look group.
  await page.goto('/app/settings');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached({timeout: 30_000});
  for (const [legend, choice] of [['Font', 'Inter'], ['Text size', 'Large'], ['Density', 'Compact'], ['Glow', 'Soft']] as const) await expect(card(page).getByRole('group', {name: legend}).getByRole('radio', {name: choice, exact: true})).toBeChecked();
  await card(page).getByRole('button', {name: 'Back to the defaults'}).click();
  await expect(card(page).getByRole('status')).toHaveText('Back to the defaults.');
  expect(await htmlAttrs(page)).toEqual(NONE);
  await expect(page.locator('#zigoals-text-sheet, #zigoals-density-sheet')).toHaveCount(0);
  expect(await stored(page)).toEqual({version: 1, dismissed: {alphaNotice: true}, theme: 'dark', heroCollapsed: false});
  await page.reload();
  expect(await htmlAttrs(page)).toEqual(NONE);
});

test('one choice stores only that choice; choosing its default again removes the group', async ({page}) => {
  await openDevice(page);
  await page.reload();
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached({timeout: 30_000});
  const glow = card(page).getByRole('group', {name: 'Glow'});
  await glow.getByRole('radio', {name: 'Soft', exact: true}).check();
  expect(await stored(page)).toEqual({version: 1, dismissed: {alphaNotice: true}, look: {glow: 'soft'}});
  expect(await htmlAttrs(page)).toEqual({...NONE, 'data-glow': 'soft'});
  await glow.getByRole('radio', {name: 'Full', exact: true}).check();
  expect(await stored(page)).toEqual({version: 1, dismissed: {alphaNotice: true}});
  expect(await htmlAttrs(page)).toEqual(NONE);
});

// Large text never makes a page scroll sideways: the phone widths in the mobile project, a tablet and a computer in the
// desktop project, in the Showcase (full pages).
const ROUTES = ['/app', '/app/goals', '/app/health', '/app/wealth', '/app/settings'];
const WIDTHS: Record<string, number[]> = {mobile: [320, 390], desktop: [768, 1440]};
for (const route of ROUTES) for (const [project, widths] of Object.entries(WIDTHS)) for (const width of widths) {
  test(`${route} at ${width} px with Large text: nothing scrolls sideways`, async ({page}, info) => {
    test.skip(info.project.name !== project, `${width} px runs in the ${project} project`);
    test.setTimeout(90_000);
    await page.setViewportSize({width, height: width < 700 ? 844 : 900});
    await openDevice(page, {look: {textSize: 'large'}});
    await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
    await page.waitForURL('**/app');
    await page.goto(route);
    await expect(page.locator('html[data-app-hydrated]')).toBeAttached({timeout: 30_000});
    await expect(page.locator('html')).toHaveAttribute('data-text', 'large');
    await expect(page.locator('html')).not.toHaveAttribute('data-look-loading', /.*/);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    const fit = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, inner: innerWidth}));
    expect(fit.scroll, `${route} at ${width} px: ${fit.scroll} > ${fit.inner}`).toBeLessThanOrEqual(fit.inner);
  });
}
