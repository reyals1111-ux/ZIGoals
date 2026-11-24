import {expect, test, type Page} from '@playwright/test';
import {openPhoneRow} from './phone-length-folds';
import {hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {HEALTH_STORAGE_KEY} from '../lib/health';

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
  // Session AV lane 2 (missing setup: the maintenance estimate, where the pace is chosen, needs 10 weigh-ins in its 28 days
  // and the Showcase keeps 7 there (its readings every fourth day, which lib/insights pins), so three more fictional
  // weigh-ins are added on the days between, on the same line; deliberate)
  await page.evaluate(key => {
    const k = Object.keys(sessionStorage).find(x => x.startsWith('zigoals:showcase:v1:') && x.endsWith(`:${key}`))!;
    const h = JSON.parse(sessionStorage.getItem(k)!) as {weights: {id: string; date: string; grams: number; createdAt: string; updatedAt: string}[]};
    const day = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    for (const n of [-3, -7, -11]) { const at = `${day(n)}T07:00:00.000Z`; h.weights.push({id: `health_weight-fixb2${-n}`, date: day(n), grams: 74_600 - (n + 29) * 40, createdAt: at, updatedAt: at}); }
    h.weights.sort((a, b) => a.date.localeCompare(b.date));
    sessionStorage.setItem(k, JSON.stringify(h));
  }, HEALTH_STORAGE_KEY);
  await page.goto('/app/health?view=weight'); await hydrated(page);
  await expect(page.locator('#health-energy .health-big')).toBeVisible();
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
  // Session AV lane 2 (fix2011; deliberate): on a phone "only partly logged" is in one row with the portion counters
  // (tests/phone-length-folds.ts: there and closed on a phone, absent at 1440); it is opened, then checked as before.
  await openPhoneRow(page, 'Portions, and a partly logged day');
  const partial = page.getByLabel('This day is only partly logged (leave it out of the maintenance estimate)');
  await partial.check();
  await expect(page.locator('.food-plus-partial [role="status"]')).toContainText('is left out of the maintenance estimate.');
  expect(((await foodPlus(page))?.checkIn?.partial ?? []).length).toBe(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.goto('/app/health?view=weight'); await hydrated(page);
  await expect(page.locator('#health-coach')).toContainText('1 partly logged day is left out of the estimate.');
});
