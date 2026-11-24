import {expect, test, type Page} from '@playwright/test';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {MACRO_MODE_KEY} from '../lib/aa-device-keys';
import {FOOD_PLUS_STORAGE_KEY} from '../lib/food-plus/day-target';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Review b2b #4 (LEDGER #88): one rule for net carbs. With 10 g of sugar alcohols set on a logged food and fiber on every
 * entry, the Carbs tile (Diary) and Targets → Macro mode say the same figure, both naming fiber and the sugar alcohols.
 * An entry without fiber: both say fiber is not taken off (and why), and the sugar alcohols still are. At 390 and 1440,
 * in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api call 503.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-20', at = `${TODAY}T08:00:00.000Z`;
const bowl = {kcal: 600, proteinMg: 30000, carbsMg: 60000, fatMg: 20000, fiberMg: 8000};
function health(withoutFiber = false): HealthData {
  const h = createEmptyHealth();
  h.targets = {...h.targets, carbsMg: 200000};
  h.foods.push({id: 'health_food-fict-0001', name: 'Fictional sugar-free bowl', brand: '', servingGrams: 300, nutrients: bowl, createdAt: at, updatedAt: at});
  h.diary.push({id: 'health_diary-fict-0001', sourceId: 'health_food-fict-0001', sourceKind: 'food', snapshot: {name: 'Fictional sugar-free bowl', servingGrams: 300, nutrients: bowl}, date: TODAY, meal: 'Lunch', quantityMilli: 1000, createdAt: at, updatedAt: at});
  h.diary.push({id: 'health_diary-fict-0002', sourceId: 'health_food-fict-0001', sourceKind: 'food', snapshot: {name: 'Fictional sugar-free bowl', servingGrams: 300, nutrients: bowl}, date: TODAY, meal: 'Dinner', quantityMilli: 1000, createdAt: at, updatedAt: at});
  if (withoutFiber) h.diary.push({id: 'health_diary-fict-0003', sourceId: 'health_food-fict-0009', sourceKind: 'food', snapshot: {name: 'Fictional crackers', servingGrams: 30, nutrients: {kcal: 120, proteinMg: 3000, carbsMg: 20000, fatMg: 4000}}, date: TODAY, meal: 'Snacks', quantityMilli: 1000, createdAt: at, updatedAt: at});
  return healthSchema.parse({...h, schemaVersion: 4});
}
async function seed(page: Page, withoutFiber = false) {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    [HEALTH_STORAGE_KEY]: JSON.stringify(health(withoutFiber)),
    [MACRO_MODE_KEY]: JSON.stringify({version: 1, mode: 'net-carbs'}),
    // 5 g of sugar alcohols per serving of the bowl: two servings today, 10 g.
    [FOOD_PLUS_STORAGE_KEY]: JSON.stringify({version: 1, sugarAlcohols: {'health_food-fict-0001': 5000}}),
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
  });
}
const view = (page: Page, name: string) => page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name, exact: true}).click();

for (const theme of THEMES) test(`${theme}: the Carbs tile and Macro mode give one net-carbs figure, naming what was taken off`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seed(page);
  await page.goto('/app/health'); await hydrated(page);
  await view(page, 'Diary');
  // 120 g carbs − 16 g fiber − 10 g sugar alcohols = 94 g.
  const tile = page.getByRole('region', {name: 'Daily nutrition summary'}).locator('.health-macro-carbsMg');
  await expect(tile).toContainText('Net carbs');
  await expect(tile.locator('.health-macro-partial')).toHaveText('94 g after fiber and 10 g sugar alcohols');
  const findings = await axe(page, tile);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await view(page, 'Targets');
  const macro = page.getByRole('region', {name: 'Macro mode'});
  await expect(macro.locator('[data-net-carbs]')).toHaveText('Net carbs today: 94 g · carbs minus fiber and 10 g sugar alcohols');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('an entry without fiber: both places say fiber is not taken off, and still take off the sugar alcohols', async ({page}) => {
  await offline(page);
  await seed(page, true);
  await page.goto('/app/health'); await hydrated(page);
  await view(page, 'Diary');
  // 140 g carbs − 10 g sugar alcohols = 130 g; fiber is on 2 of the 3 entries, so it is not taken off.
  const tile = page.getByRole('region', {name: 'Daily nutrition summary'}).locator('.health-macro-carbsMg');
  await expect(tile.locator('.health-macro-partial').filter({hasText: 'after'})).toHaveText('130 g after 10 g sugar alcohols');
  await expect(tile).toContainText('Fiber is not taken off: 2 of 3 entries carry it.');
  await view(page, 'Targets');
  const macro = page.getByRole('region', {name: 'Macro mode'});
  await expect(macro.locator('[data-net-carbs]')).toHaveText('Net carbs today: 130 g · carbs minus 10 g sugar alcohols · Fiber is not taken off: 2 of 3 entries carry it.');
});
