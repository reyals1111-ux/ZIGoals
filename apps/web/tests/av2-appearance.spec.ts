import {expect, test, type Page} from '@playwright/test';
import {openAllSettingsGroups, openSettings} from './settings-open';
import {axe} from './p6-helpers';

/**
 * Session AV lane 2 (sync and appearance; LEDGER #34 Notion's high contrast, N6 #191 Loop's pure black, N6 #192 Daylio's
 * fonts): Settings → Appearance → Customize gains "Dark style" (Standard, Pure black, High contrast) and three more fonts
 * from the device's own (Serif, Rounded, Monospace). High contrast holds every word to WCAG AAA (7:1), checked here with
 * axe's own AAA rule (color-contrast-enhanced) on the Appearance group; the generator's rule is unit-tested in
 * scripts/themes/av2-dark-styles.test.mjs.
 */
const card = (page: Page) => page.locator('#appearance').getByRole('group', {name: 'Customize'});
const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:ui-prefs:v1') ?? 'null'));
async function open(page: Page, prefs: Record<string, unknown> = {}) {
  await page.addInitScript(p => { if (!sessionStorage.getItem('av2-seeded')) { localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, dismissed: {alphaNotice: true}, ...p})); sessionStorage.setItem('av2-seeded', '1'); } }, prefs);
  await openSettings(page);
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached({timeout: 30_000});
  await openAllSettingsGroups(page);
}
/** axe's AAA contrast rule (color-contrast-enhanced, 7:1 and 4.5:1 for large text), with the engine the p6 helper injects. */
async function aaa(page: Page, selector: string) {
  await axe(page, page.locator(selector));
  return page.evaluate(async sel => {
    const engine = (window as unknown as {axe: {run: (c: unknown, o: unknown) => Promise<{violations: {id: string; nodes: {target: unknown[]; failureSummary?: string}[]}[]}>}}).axe;
    const r = await engine.run(document.querySelector(sel), {runOnly: {type: 'rule', values: ['color-contrast-enhanced']}, resultTypes: ['violations']});
    return r.violations.flatMap(v => v.nodes.map(n => `${n.target.join(' ')}: ${(n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 200)}`));
  }, selector);
}

test('High contrast: chosen from Nebula it turns Dark on, holds the Appearance group to AAA, and is there on the first paint of the next page', async ({page, isMobile}) => {
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await open(page);
  const style = card(page).getByRole('group', {name: 'Dark style'});
  await expect(style.getByRole('radio', {name: 'Standard', exact: true})).toBeChecked();
  await expect(style.getByRole('radio')).toHaveCount(3);
  await expect(style).toHaveAccessibleDescription(/Used whenever Dark is on\./);
  await style.getByRole('radio', {name: 'High contrast', exact: true}).check();
  await expect(card(page).getByRole('status')).toHaveText('Dark style: High contrast. Dark is on now. Saved on this device.');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-dark-style', 'contrast');
  await expect(page.locator('#zigoals-dark-style-sheet')).toHaveAttribute('href', /^\/themes\/dark-contrast\.css\?v=[0-9a-f]{12}$/);
  expect(await stored(page)).toEqual({version: 1, dismissed: {alphaNotice: true}, theme: 'dark', look: {darkStyle: 'contrast'}});
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
  expect(await aaa(page, '#appearance')).toEqual([]);
  const findings = await axe(page, page.locator('#appearance'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // A strong ring on whatever takes focus.
  await style.getByRole('radio', {name: 'High contrast', exact: true}).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(style.getByRole('radio', {name: 'Pure black', exact: true})).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-dark-style', 'black');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('html')).toHaveAttribute('data-dark-style', 'contrast');
  // Session AV lane 2 (Pure black and back swaps the style's sheet, and the contrast sheet's ring lands once it has loaded
  // again: read until it has, the same 3 px solid ring, deliberate)
  await expect(page.locator('#zigoals-dark-style-sheet')).toHaveAttribute('href', /^\/themes\/dark-contrast\.css\?v=[0-9a-f]{12}$/);
  await expect.poll(() => page.evaluate(() => { const s = getComputedStyle(document.activeElement!); return {wide: parseFloat(s.outlineWidth) >= 3, style: s.outlineStyle}; })).toEqual({wide: true, style: 'solid'});
  // The next page: on <html> before hydration.
  await page.goto('/app/goals', {waitUntil: 'commit'});
  await expect(page.locator('html')).toHaveAttribute('data-dark-style', 'contrast');
  await page.waitForLoadState('load');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('Pure black: a true black page in Dark; another theme shows no style; Standard and Back to the defaults remove it', async ({page}) => {
  await open(page, {theme: 'dark'});
  const style = card(page).getByRole('group', {name: 'Dark style'});
  await style.getByRole('radio', {name: 'Pure black', exact: true}).check();
  await expect(card(page).getByRole('status')).toHaveText('Dark style: Pure black. Saved on this device.');
  await expect(page.locator('html')).toHaveAttribute('data-dark-style', 'black');
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(0, 0, 0)');
  // Light chosen: no style on the page, the choice kept for the next time Dark is on.
  await page.evaluate(() => { const raw = JSON.parse(localStorage.getItem('zigoals:ui-prefs:v1')!); raw.theme = 'light'; localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify(raw)); });
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).not.toHaveAttribute('data-dark-style', /.*/);
  await expect(page.locator('#zigoals-dark-style-sheet')).toHaveCount(0);
  await openAllSettingsGroups(page);
  await expect(card(page).getByRole('group', {name: 'Dark style'}).getByRole('radio', {name: 'Pure black', exact: true})).toBeChecked();
  await card(page).getByRole('button', {name: 'Back to the defaults'}).click();
  expect((await stored(page)).look).toBeUndefined();
  await expect(card(page).getByRole('group', {name: 'Dark style'}).getByRole('radio', {name: 'Standard', exact: true})).toBeChecked();
});

for (const [word, value, family] of [['Serif', 'serif', /serif/], ['Rounded', 'rounded', /sans-serif|rounded/i], ['Monospace', 'mono', /monospace/]] as const) test(`the ${word} font: one attribute, the device's own letters, nothing fetched`, async ({page}) => {
  const fetched: string[] = [];
  page.on('request', r => { if (/\.(woff2?|ttf|otf)(\?|$)/.test(r.url())) fetched.push(r.url()); });
  await open(page);
  const font = card(page).getByRole('group', {name: 'Font'});
  await font.getByRole('radio', {name: word, exact: true}).check();
  await expect(card(page).getByRole('status')).toContainText(`Font: ${word}.`);
  await expect(page.locator('html')).toHaveAttribute('data-font', value);
  expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toMatch(family);
  expect((await stored(page)).look).toEqual({font: value});
  await page.evaluate(() => document.fonts.ready);
  expect(fetched).toEqual([]);
  for (const box of await font.locator('label.customize-option').evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
});
