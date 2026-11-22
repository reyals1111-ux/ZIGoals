import {expect, test} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';
import {HEALTH_STORAGE_KEY, createEmptyHealth, quickLogFood, type HealthData} from '../lib/health';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AV lane 2 (r5-body; Bevel, LEDGER #371): Health → Insights → Compare offers "Late meal (from your food log)"
 * in Sleep tags, beside the hand-set tag; its two numbers (hours before bed, kcal) are the person's own and are kept on
 * this device; the result says what happened together, never a cause — at 390 and 1440 in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional records.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-20', AT = '2026-11-20T08:00:00.000Z';
function records(): [string, string][] {
  let health: HealthData = createEmptyHealth();
  const nights: Sleep['nights'] = [];
  for (let i = 0; i < 40; i++) {
    const day = addLocalDays(TODAY, -40 + i), even = i % 2 === 0, n = String(i).padStart(4, '0');
    health = quickLogFood(health, {foodId: `health_food-${n}`, logId: `health_logs-${n}`, name: 'Fictional dinner', servingGrams: 300, nutrients: {kcal: 600, proteinMg: null, carbsMg: null, fatMg: null}, date: day, meal: 'Dinner'}, `${day}T${even ? '21:30' : '18:00'}:00.000Z`);
    nights.push({id: `health_sleep-fictional-${day}`, kind: 'night', source: 'manual', start: `${day}T23:00:00.000Z`, end: `${addLocalDays(day, 1)}T${even ? '05' : '07'}:00:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT});
  }
  return [[HEALTH_STORAGE_KEY, JSON.stringify(withHealthGroup(health, 'sleep', {version: 1, nights} as Sleep, false))]];
}

for (const theme of THEMES) test(`${theme}: a late meal from the food log beside the night`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T10:00:00Z`)});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(list => { for (const [k, v] of list) localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, records());
  await page.goto('/app/health?view=insights'); await hydrated(page);
  await page.getByText('Compare: does one thing go with another?').click();
  const explorer = page.locator('.compare-explorer'), factor = page.getByLabel('On days with…'), outcome = page.getByLabel('…what was');
  await expect(factor.locator('optgroup[label="Sleep tags"] option', {hasText: 'Late meal (from your food log)'})).toHaveCount(1);

  await factor.selectOption({label: 'Late meal (from your food log)'});
  await outcome.selectOption({label: 'Time asleep'});
  await expect(page.getByLabel('Late meal: within this time before bed')).toHaveValue('3');
  await expect(page.getByRole('textbox', {name: 'Late meal: at least (kcal)'})).toHaveValue('300');
  await expect(explorer).toContainText('20 days with · 20 without');
  await expect(explorer).toContainText('On days with 300 kcal or more logged in the 3 hours before bed, you slept 6 h that night on average; on other days, 8 h.');
  await expect(explorer).toContainText('Something else could explain it: late evenings');
  await expect(explorer).not.toContainText(/hurts?|bad for/i);

  // The person's own numbers, kept on this device: 6 hours takes the 18:00 dinners in too, so every day is "with".
  await page.getByLabel('Late meal: within this time before bed').selectOption('6');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:food-plus:v1') ?? '{}').lateMeal)).toEqual({hours: 6, kcal: 300});
  await expect(explorer).toContainText('40 days with · 0 without');
  const kcal = page.getByRole('textbox', {name: 'Late meal: at least (kcal)'});
  await kcal.fill('20'); await kcal.blur();
  await expect(explorer.getByRole('alert')).toHaveText('Enter 50 to 3,000 kcal.');
  await kcal.fill('700'); await kcal.blur();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:food-plus:v1') ?? '{}').lateMeal)).toEqual({hours: 6, kcal: 700});
  await expect(explorer).toContainText('0 days with · 40 without');

  const findings = await axe(page, explorer);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
