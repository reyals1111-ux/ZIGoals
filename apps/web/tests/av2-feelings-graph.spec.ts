import {expect, test} from '@playwright/test';
import {ENERGY_KEY} from '../lib/energy/schema';
import {AT, back, health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #66, #67 — Bearable's Trends and customisable graph): Health → Activity →
 * "How you felt, and week by week": mood against your usual (the last 90 days against the last 365, the days counted,
 * an arrow and a word), then up to four chosen measures over the same twelve weeks, one row each with its own scale, a
 * table of the same numbers, and the choice kept on this device — at 390 and 1440, in Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional data.
 */
for (const theme of THEMES) test(`${theme}: mood against your usual, and the week-by-week graph`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const days: Record<string, {mood: number; at: string}> = {};
  for (let i = 0; i < 120; i++) days[back(i)] = {mood: i < 90 ? 4 : 2, at: AT};
  await openHealth(page, healthRecord(health({moods: {version: 1, days}} as never)), '/app/health?view=activity');
  await page.getByText('How you felt, and week by week', {exact: true}).click();
  const felt = page.getByRole('region', {name: 'How you felt'});
  await expect(felt.getByText('Mood: Up', {exact: true})).toBeVisible();
  await expect(felt).toContainText('(90 days answered)');
  await expect(felt).toContainText('(120 days)');
  const graph = page.getByRole('region', {name: 'Week by week'});
  await expect(graph.getByRole('img', {name: /^Mood, week by week: /})).toBeVisible();
  await graph.getByText('Choose what to show (up to 4)').click();
  const energy = graph.getByRole('checkbox', {name: 'Energy', exact: true});
  await energy.check();
  await expect(energy).toBeFocused();
  await expect(graph.getByRole('status')).toHaveText('Energy is in the graph.');
  await expect(graph.getByRole('img', {name: /^Energy, week by week: /})).toBeVisible();
  expect((await stored<{checkin: {graph: string[]}}>(page, ENERGY_KEY)).checkin.graph).toEqual(['mood', 'sleep', 'steps', 'energy']);
  await graph.getByText('As a table').click();
  await expect(graph.getByRole('region', {name: 'Week by week as a table'}).getByRole('row')).toHaveCount(13);
  const findings = await axe(page, page.locator('.av2-feelings-fold'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
