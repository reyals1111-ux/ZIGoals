import {expect, test} from '@playwright/test';
import {EXPERIMENTS_KEY} from '../lib/experiments/store';
import {SYMPTOMS_KEY} from '../lib/symptoms/schema';
import {ENERGY_KEY} from '../lib/energy/schema';
import {AT, back, health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #64 — Bearable's experiments): one experiment follows up to eight outcomes,
 * and a symptom or factor can be the change tried or an outcome. Health → Insights → Experiments: "Follow more
 * outcomes" adds "Fictional headache (0–3)" beside energy, and its line shows under the card — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
for (const theme of THEMES) test(`${theme}: an experiment with a second outcome, a symptom`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const energy: Record<string, {energy: number; at: string}> = {}, levels: Record<string, Record<string, number>> = {};
  for (let i = 0; i < 30; i++) { energy[back(i)] = {energy: i < 14 ? 4 : 2, at: AT}; levels[back(i)] = {'fictional-headache': i < 14 ? 0 : 2}; }
  const experiment = {id: 'fictionalwalk01', title: 'Fictional walk', factor: 'symptom:fictional-headache', outcome: 'energy', start: back(13), days: 14};
  await openHealth(page, {...healthRecord(health()),
    [ENERGY_KEY]: {version: 1, days: energy},
    [SYMPTOMS_KEY]: {version: 1, items: [{id: 'fictional-headache', name: 'Fictional headache', kind: 'symptom', createdAt: AT}], days: levels},
    [EXPERIMENTS_KEY]: {version: 1, items: [experiment]}}, '/app/health?view=insights');
  await page.getByText('Experiments: try one change for 14 days').first().click();
  const list = page.getByRole('list', {name: 'Your experiments'});
  await expect(list.getByRole('article', {name: 'Fictional walk'})).toBeVisible();
  await list.getByText('Follow more outcomes (up to 8)').click();
  const pick = list.getByRole('checkbox', {name: 'Fictional headache (0–3)'});
  await pick.check();
  await expect(pick).toBeFocused();
  await expect(page.getByRole('status').filter({hasText: 'Now following 2 outcomes.'})).toBeVisible();
  const more = list.getByRole('list', {name: 'More outcomes of “Fictional walk”'});
  await expect(more.getByRole('listitem')).toHaveCount(1);
  await expect(more).toContainText('Fictional headache (0–3):');
  expect((await stored<{items: {more?: string[]}[]}>(page, EXPERIMENTS_KEY)).items[0]!.more).toEqual(['symptom:fictional-headache']);
  const findings = await axe(page, list);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
