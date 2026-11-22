import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #106, #107; MacroFactor's check-in, goal pace and goal date): in the Showcase, Health →
 * Weight → "Your coach" says when the goal weight is reached at the trend; its check-in day is changed to Friday; the
 * pace chosen on the maintenance estimate (−0.25 kg a week) is kept and the coach's goal line names it; in the Diary,
 * today is marked partly logged. At 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
const foodPlus = (page: Page) => page.evaluate(() => { for (const s of [sessionStorage, localStorage]) for (const k of Object.keys(s)) if (k.endsWith('zigoals:food-plus:v1')) return JSON.parse(s.getItem(k)!); return null; });
for (const theme of THEMES) test(`${theme}: check-in day, chosen pace, goal date and a partly logged day`, async ({page, isMobile}) => {
  await offlineApi(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page);
  await page.goto('/app/health?view=weight'); await hydrated(page);
  const coach = page.locator('#health-coach');
  await expect(coach.locator('.health-coach-eta')).toContainText(/^Goal [\d.,]+ kg: at your trend \(−[\d.,]+ kg\/week\), about /);
  await coach.getByLabel('Check-in day').selectOption({label: 'Friday'});
  await expect.poll(async () => (await foodPlus(page))?.checkIn?.weekday).toBe(5);
  const energy = page.locator('#health-energy');
  await energy.getByText('Adjust my calorie target from this estimate').click();
  await energy.getByLabel('Pace').selectOption('-0.25');
  await expect.poll(async () => (await foodPlus(page))?.pace).toBe(-0.25);
  await expect(coach.locator('.health-coach-eta')).toContainText('at your chosen pace (−0.25 kg/week)');
  const findings = await axe(page, coach);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // After a reload the choices are still there.
  await page.reload(); await hydrated(page);
  await expect(page.locator('#health-coach').getByLabel('Check-in day')).toHaveValue('5');
  await page.goto('/app/health?view=diary'); await hydrated(page);
  const partial = page.getByLabel('This day is only partly logged (leave it out of the maintenance estimate)');
  await partial.check();
  await expect(page.locator('.food-plus-partial [role="status"]')).toContainText('is left out of the maintenance estimate.');
  expect(((await foodPlus(page))?.checkIn?.partial ?? []).length).toBe(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.goto('/app/health?view=weight'); await hydrated(page);
  await expect(page.locator('#health-coach')).toContainText('1 partly logged day is left out of the estimate.');
});
