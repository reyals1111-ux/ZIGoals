import {expect, test} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';
import {SYMPTOMS_KEY} from '../lib/symptoms/schema';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema} from '../lib/health';
import {NUTRIENT_EXTRAS_KEY, emptyNutrientExtras, rememberExtras} from '../lib/health-vitamins/extras';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AV lane 2 (rest, LEDGER #98; Cronometer's custom charts): Health → Insights → Compare offers the diary's other
 * nutrients (fibre, sodium…) and a further nutrient from the food library (selenium) as outcomes, each with its unit, and
 * compares fibre against a symptom — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 * Fictional records.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-14', d = Array.from({length: 40}, (_, i) => addLocalDays(TODAY, -(40 - i)));
const symptoms = {version: 1, items: [{id: 'bloat', name: 'Fictional bloating', kind: 'symptom', createdAt: '2026-09-01T10:00:00.000Z'}], days: Object.fromEntries(d.map((date, i) => [date, {bloat: i % 2 ? 2 : 0}]))};
const diary = d.map((date, i) => ({id: `health_diary-nut-${String(i).padStart(3, '0')}`, sourceId: 'health_food-nut-0001', sourceKind: 'food', snapshot: {name: 'Fictional bowl', servingGrams: 300, nutrients: {kcal: 600, proteinMg: 20_000, carbsMg: 80_000, fatMg: 9_000, fiberMg: i % 2 ? 4_000 : 12_000, sodiumMg: 900}}, date, meal: 'Lunch', quantityMilli: 1000, createdAt: `${date}T12:00:00.000Z`, updatedAt: `${date}T12:00:00.000Z`}));
const health = healthSchema.parse({...createEmptyHealth(), diary});
const extras = rememberExtras(emptyNutrientExtras(), [], 'health_food-nut-0001', {seleniumUg: 30});

for (const theme of THEMES) test(`${theme}: nutrients as Compare outcomes`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T10:00:00Z`)});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(records => { for (const [k, v] of records) localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); },
    [[SYMPTOMS_KEY, JSON.stringify(symptoms)], [HEALTH_STORAGE_KEY, JSON.stringify(health)], [NUTRIENT_EXTRAS_KEY, JSON.stringify(extras)]] as [string, string][]);
  await page.goto('/app/health?view=insights'); await hydrated(page);
  await page.getByText('Compare: does one thing go with another?').click();
  const factor = page.getByLabel('On days with…'), outcome = page.getByLabel('…what was');
  for (const label of ['Fiber logged (g)', 'Sodium logged (mg)', 'Carbs logged (g)', 'Selenium logged (µg)']) await expect(outcome.locator('option', {hasText: label})).toHaveCount(1);
  await factor.selectOption({label: 'Had “Fictional bloating” (level 1 or more)'});
  await outcome.selectOption({label: 'Fiber logged (g)'});
  const explorer = page.locator('.compare-explorer');
  await expect(explorer).toContainText('you logged 4 g of fiber that day on average; on other days, 12 g.');
  const findings = await axe(page, explorer);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
