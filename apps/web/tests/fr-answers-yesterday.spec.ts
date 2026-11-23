import {expect, test} from '@playwright/test';
import {SANNE_RECORDS} from '../lib/ai/local-answers/fr-answers-fixture';
import {hydrated} from './ah-helpers';
import {THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV lane 2 (fr-answers; FR-S-3): a water habit counted from the water journal, partly done yesterday (750 mL of
 * 2 liters, no tick yet), reads "0.75 of 2" in "Yesterday, still open" on Habits and on Today, as its Habits card counts
 * it, never "0 of 2". Sanne's own records (lib/ai/local-answers/fr-answers-fixture.ts, fictional), Sun 29 Nov 2026 in
 * Amsterdam; every /api call answers 503. At 390 (mobile) and 1440, in Nebula, Light and Dark.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const NOW = new Date('2026-11-29T09:00:00+01:00');
for (const theme of THEMES) test(`${theme}: yesterday's water reads what the journal holds, on Habits and Today`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(records => { for (const [k, v] of Object.entries(records)) localStorage.setItem(k, v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, SANNE_RECORDS);
  for (const path of ['/app/habits', '/app']) {
    await page.goto(path); await hydrated(page);
    const card = page.getByRole('region', {name: 'Yesterday, still open'});
    const water = card.getByRole('list', {name: "Yesterday's open habits"}).getByRole('listitem').filter({hasText: 'Drink water'});
    await expect(water, path).toContainText('Drink water · 0.75 of 2');
    await expect(water, path).not.toContainText('0 of 2');
  }
});
