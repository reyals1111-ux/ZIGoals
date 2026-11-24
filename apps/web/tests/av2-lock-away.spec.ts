import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {openSettings} from './settings-open';

/**
 * Session AV lane 2 (r6-notes; LEDGER #406, Diarium's lock after a while away): with the screen cover on, "Lock again
 * after a while away" set to 5 minutes; ZIGoals hidden 4 minutes comes back open, hidden 6 minutes comes back covered,
 * and the same PIN opens it. The lock's own record is unchanged. Nebula, Light and Dark; axe-clean; no sideways scroll
 * at 320. Fictional PIN only; the page's visibility is set in the page (a test cannot hide a real tab).
 */
const stored = (page: Page) => page.evaluate(() => ({lock: localStorage.getItem('zigoals:device-lock:v1'), away: localStorage.getItem('zigoals:device-lock-away:v1')}));
const visibility = (page: Page, state: 'hidden' | 'visible') => page.evaluate(s => { Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => s}); document.dispatchEvent(new Event('visibilitychange')); }, state);
for (const theme of THEMES) test(`${theme}: the screen cover comes back after a while away`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page); await freshDevice(page);
  await openSettings(page); await hydrated(page);
  const card = page.locator('#device-lock');
  await card.getByLabel('PIN (4 to 8 digits)').fill('2468'); await card.getByLabel('The same PIN again').fill('2468');
  await card.getByRole('button', {name: 'Turn the lock on'}).click();
  await expect(card.getByRole('status').first()).toContainText('The lock is on.');
  const away = card.getByLabel('Lock again after a while away');
  await expect(away).toHaveValue('');
  await away.selectOption('5');
  await expect.poll(async () => JSON.parse((await stored(page)).away ?? 'null')).toEqual({version: 1, minutes: 5});
  const lockBefore = (await stored(page)).lock;
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const cover = page.getByRole('dialog', {name: 'ZIGoals is locked on this device'});
  // Four minutes away: still open.
  await visibility(page, 'hidden'); await page.clock.fastForward('04:00'); await visibility(page, 'visible');
  await expect(cover).toHaveCount(0);
  // Six minutes away: the same cover asks for the same PIN.
  await visibility(page, 'hidden'); await page.clock.fastForward('06:00'); await visibility(page, 'visible');
  await expect(cover).toBeVisible();
  await expect(cover.getByLabel('PIN')).toBeFocused();
  await cover.getByLabel('PIN').fill('2468'); await cover.getByLabel('PIN').press('Enter');
  await expect(cover).toHaveCount(0);
  expect(JSON.parse((await stored(page)).lock!).hash).toBe(JSON.parse(lockBefore!).hash);
  // Never: hidden an hour, still open.
  await away.selectOption('');
  // (fixb6; deliberate) one hour and a minute written as 01:01:00: Playwright refuses '61:00' as an invalid mm:ss.
  await visibility(page, 'hidden'); await page.clock.fastForward('01:01:00'); await visibility(page, 'visible');
  await expect(cover).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
