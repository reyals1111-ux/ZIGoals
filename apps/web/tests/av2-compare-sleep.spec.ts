import {expect, test} from '@playwright/test';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';
import {HEALTH_STORAGE_KEY, createEmptyHealth, saveActivity, type HealthData} from '../lib/health';
import {addWater} from '../lib/health-daily';
import {HEALTH_EXTRAS_KEY} from '../lib/health-extras';
import {withHealthGroup} from '../lib/vault/w-homes';
import type {Sleep} from '../lib/sleep/schema';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AV lane 2, round 4 (health; Pillow, LEDGER #332): Health → Insights → Compare offers "Caffeine above an amount",
 * "Caffeine after a time" and "Steps above an amount" as factors for the night; each has its amount (the usual day to
 * start, this visit only), and the result says what happened together, never a cause — at 390 and 1440 in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional records.
 */
test.use({timezoneId: 'UTC'});
const TODAY = '2026-11-20', AT = '2026-11-20T08:00:00.000Z';
function records(): [string, string][] {
  let health: HealthData = createEmptyHealth();
  const drinks: Record<string, {type: string; caffeineMg: number}> = {}, nights: Sleep['nights'] = [];
  for (let i = 0; i < 40; i++) {
    const day = addLocalDays(TODAY, -40 + i), even = i % 2 === 0, id = `health_drink-${String(i).padStart(4, '0')}`;
    health = addWater(health, {id, date: day, amountMilli: 250_000, unit: 'ml'}, `${day}T${even ? '16' : '09'}:05:00.000Z`);
    drinks[id] = even ? {type: 'coffee', caffeineMg: 160} : {type: 'tea', caffeineMg: 60};
    health = saveActivity(health, {id: `health_walk-${String(i).padStart(4, '0')}`, date: day, name: 'Fictional walk', steps: even ? 11_000 : 4000, minutes: 30}, `${day}T20:00:00.000Z`);
    nights.push({id: `health_sleep-fictional-${day}`, kind: 'night', source: 'manual', start: `${day}T${even ? '23:30' : '22:30'}:00.000Z`, end: `${addLocalDays(day, 1)}T${even ? '05:30' : '06:30'}:00.000Z`, timeZone: 'UTC', createdAt: AT, updatedAt: AT});
  }
  return [[HEALTH_STORAGE_KEY, JSON.stringify(withHealthGroup(health, 'sleep', {version: 1, nights} as Sleep, false))], [HEALTH_EXTRAS_KEY, JSON.stringify({version: 1, drinks})]];
}

for (const theme of THEMES) test(`${theme}: caffeine and steps beside the night`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(`${TODAY}T10:00:00Z`)});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(list => { for (const [k, v] of list) localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, records());
  await page.goto('/app/health?view=insights'); await hydrated(page);
  await page.getByText('Compare: does one thing go with another?').click();
  const explorer = page.locator('.compare-explorer'), factor = page.getByLabel('On days with…'), outcome = page.getByLabel('…what was');
  for (const label of ['Caffeine above an amount', 'Caffeine after a time', 'Steps above an amount']) await expect(factor.locator('option', {hasText: label})).toHaveCount(1);

  await factor.selectOption({label: 'Caffeine above an amount'});
  await outcome.selectOption({label: 'Time asleep'});
  const mg = page.getByRole('textbox', {name: 'Caffeine above (mg)'});
  await expect(mg).toHaveValue('60');
  await mg.fill('100'); await mg.blur();
  await expect(explorer).toContainText('On days with over 100 mg of caffeine logged, you slept 6 h that night on average; on other days, 8 h.');
  await expect(explorer).toContainText('Something else could explain it: busy or tiring days');

  await factor.selectOption({label: 'Caffeine after a time'});
  // Session AV lane 2 (fixb4; deliberate): getByLabel reads a <label>'s whole text, its options' words with it, so
  // "Caffeine after" also matched "On days with…" (its option "Caffeine after a time"). The new select's accessible name,
  // exactly; as strict.
  await expect(page.getByRole('combobox', {name: 'Caffeine after', exact: true})).toHaveValue('14');
  await expect(explorer).toContainText('On days with caffeine logged after 14:00');

  await factor.selectOption({label: 'Steps above an amount'});
  await expect(outcome.locator('option', {hasText: /^Steps$/})).toHaveCount(0);
  const steps = page.getByRole('textbox', {name: 'Steps above'});
  await steps.fill('8000'); await steps.blur();
  await expect(explorer).toContainText('On days you walked over 8,000 steps');
  await expect(explorer).toContainText('never a cause');

  const findings = await axe(page, explorer);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
