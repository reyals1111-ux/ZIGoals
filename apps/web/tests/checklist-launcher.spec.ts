import {expect, test, type Page} from '@playwright/test';
import {navLink} from './phone-nav';

/**
 * Session AF (L3; P7.19, P7.20, ADR-028 H65, H68): the Checklist button is ZIGi's and the music button's twin, between
 * Music (above) and ZIGi (below), one column; tucked, its edge tab keeps the slot; switched off (this device), it leaves
 * and Music drops back to exactly where it sat before Session AF. The mark's check draws once per visit, never under
 * reduced motion. Phones: no third floating button; the Checklist is in More.
 */
const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;
const centreX = (b: {x: number; width: number}) => b.x + b.width / 2;
async function showcase(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
/** The Showcase keeps its records in this tab's session storage under its own prefix: change the display record there. */
const setChecklistPrefs = (page: Page, patch: Record<string, unknown>) => page.evaluate(patch => {
  const key = Object.keys(sessionStorage).find(k => k.endsWith('zigoals:ui-prefs:v1')) ?? Object.keys(sessionStorage).find(k => k.includes('zigoals:showcase:'))!.replace(/zigoals:[^:]+:v1$/, 'zigoals:ui-prefs:v1');
  const prefs = JSON.parse(sessionStorage.getItem(key) ?? '{"version":1}');
  sessionStorage.setItem(key, JSON.stringify({...prefs, checklist: {...(prefs.checklist ?? {}), ...patch}}));
}, patch);

test('between Music and ZIGi, one column, the twins’ circle; tucked and switched off, the stack adapts', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'on phones ZIGi is the one floating button');
  await showcase(page);
  const music = page.locator('.music-launcher'), checklist = page.locator('.checklist-launcher'), zigi = page.locator('.ai-launcher-button');
  await expect(music).toBeVisible(); await expect(checklist).toBeVisible(); await expect(zigi).toBeVisible();
  const read = (sel: string) => page.locator(sel).evaluate(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius, border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, background: s.backgroundImage, shadow: s.boxShadow}; });
  expect(await read('.checklist-launcher')).toEqual(await read('.ai-launcher-button'));
  const m = await box(page, '.music-launcher'), c = await box(page, '.checklist-launcher'), z = await box(page, '.ai-launcher-button');
  expect(Math.abs(centreX(m) - centreX(c))).toBeLessThan(1.5); expect(Math.abs(centreX(c) - centreX(z))).toBeLessThan(1.5);
  expect(m.y + m.height).toBeLessThan(c.y); expect(c.y + c.height).toBeLessThan(z.y);
  await expect(checklist).toHaveAttribute('href', '/app/checklist');
  expect(await checklist.locator('svg.checklist-mark linearGradient stop').count()).toBeGreaterThanOrEqual(3);
  // Tucked: the edge tab keeps the Checklist's slot, so Music stays where it is.
  const musicLifted = m.y;
  await page.getByRole('button', {name: 'Tuck the Checklist button away'}).click();
  const tab = page.getByRole('button', {name: 'Show the Checklist button'});
  await expect(tab).toBeVisible();
  expect(await tab.evaluate(el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return {w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius}; })).toEqual({w: 44, h: 52, radius: '16px 0px 0px 16px'});
  expect((await box(page, '.music-launcher')).y).toBeCloseTo(musicLifted, 0);
  await tab.click();
  await expect(checklist).toBeVisible();
  // Switched off on this device: the button leaves, Music drops back one slot (its pre-AF place: 118 px above ZIGi's corner).
  await setChecklistPrefs(page, {launcher: false});
  await page.reload();
  await expect(music).toBeVisible();
  await expect(page.locator('.checklist-launcher, .checklist-edge-tab')).toHaveCount(0);
  const dropped = await page.locator('.music-launcher-stack').evaluate(el => getComputedStyle(el).bottom);
  expect(dropped).toBe('122px');
  expect((await box(page, '.music-launcher')).y).toBeGreaterThan(musicLifted);
  // The page stays reachable from the navigation.
  await (await navLink(page, 'Checklist')).click();
  await expect(page.getByRole('heading', {level: 1, name: 'Your orbit'})).toBeVisible();
});

const firstVisit = async (page: Page) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/settings');
  await expect(page.locator('.checklist-launcher')).toBeVisible();
};
test('the mark’s check draws once per visit', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'the floating button is desktop only');
  await firstVisit(page);
  await expect(page.locator('.checklist-launcher .checklist-mark[data-draw]')).toHaveCount(1);
  await expect(page.locator('.checklist-launcher .checklist-mark[data-draw]')).toHaveCount(0, {timeout: 3000});
  await page.reload();
  await expect(page.locator('.checklist-launcher')).toBeVisible();
  await page.waitForTimeout(300);
  await expect(page.locator('.checklist-launcher .checklist-mark[data-draw]')).toHaveCount(0);
});
test.describe('under reduced motion', () => {
  test.use({reducedMotion: 'reduce'});
  test('the mark is a still: its check never draws', async ({page}, info) => {
    test.skip(info.project.name !== 'desktop', 'the floating button is desktop only');
    await firstVisit(page);
    await page.waitForTimeout(300);
    await expect(page.locator('.checklist-launcher .checklist-mark[data-draw]')).toHaveCount(0);
    expect(await page.locator('.checklist-launcher').evaluate(el => el.getAnimations({subtree: true}).length)).toBe(0);
  });
});

test('phones: no third floating button; the Checklist is in More', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone layout');
  await showcase(page);
  await expect(page.locator('.ai-launcher')).toBeVisible();
  await expect(page.locator('.checklist-launcher, .checklist-edge-tab')).toHaveCount(0);
  await (await navLink(page, 'Checklist')).click();
  await expect(page).toHaveURL(/\/app\/checklist$/);
  await expect(page.getByRole('heading', {level: 1, name: 'Your orbit'})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
