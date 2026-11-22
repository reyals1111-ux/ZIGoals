import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {HEALTH_NUMBERS_KEY} from '../lib/health-numbers/store';
import {MORE_GOALS_KEY} from '../lib/health-goals/more';

/**
 * Session AV lane 2 (health r3; LEDGER #287, Carb Manager): Goals → Health goals → "Goals on a nutrient, a measurement or
 * your own number": the empty state teaches; your numbers offer Resting pulse but never Ketones; "Resting pulse at most 60
 * bpm" over the last 7 days reads 60 bpm from 2 readings, Met; a waist goal with no measurement says so; Close moves it to
 * Closed — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; /api 503.
 */
test.use({timezoneId: 'UTC'});
for (const theme of THEMES) test(`${theme}: goals on a nutrient, a measurement or your own number`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-23T10:00:00Z')});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(([k, v]) => { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); localStorage.setItem(k, v); }, [HEALTH_NUMBERS_KEY, JSON.stringify({version: 1, entries: [
    {id: 'n1', date: '2026-11-21', kind: 'lab', name: 'Resting pulse', value: 58, unit: 'bpm'},
    {id: 'n2', date: '2026-11-22', kind: 'lab', name: 'Resting pulse', value: 62, unit: 'bpm'},
    {id: 'n3', date: '2026-11-22', kind: 'lab', name: 'Ketones', value: 0.6, unit: 'mmol/L'},
  ]})] as const);
  await page.goto('/app/goals'); await settle(page);
  const section = page.locator('#goals-health');
  await section.locator('details.more-goals-fold > summary').click();
  const more = section.locator('.more-goals');
  await expect(more).toContainText('No goal of this kind yet.');
  await expect(more).toContainText('setting one is medical advice');
  const form = more.getByRole('form', {name: 'Add a goal on a health number'});
  const on = form.getByRole('combobox', {name: 'Goal on'});
  await expect(on.locator('option', {hasText: 'Resting pulse (bpm)'})).toHaveCount(1);
  await expect(on.locator('option', {hasText: 'Ketones'})).toHaveCount(0);

  await on.selectOption({label: 'Resting pulse (bpm)'});
  await form.getByRole('combobox', {name: 'Direction'}).selectOption('at-most');
  await form.getByRole('textbox', {name: 'Your target (bpm)'}).fill('60');
  await form.getByRole('button', {name: 'Add the goal'}).click();
  await expect(more.getByRole('status')).toHaveText('Goal added: Resting pulse at most 60 bpm.');
  const row = more.locator('.more-goal-row').filter({hasText: 'Resting pulse at most 60 bpm'});
  await expect(row).toContainText('Resting pulse: 60 bpm on average over 2 readings in the last 7 days. Your goal: at most 60 bpm. Met.');

  await on.selectOption({label: 'Waist (cm)'});
  await form.getByRole('combobox', {name: 'Direction'}).selectOption('at-most');
  await form.getByRole('textbox', {name: 'Your target (cm)'}).fill('abc');
  await form.getByRole('button', {name: 'Add the goal'}).click();
  await expect(form.getByRole('textbox', {name: 'Your target (cm)'})).toBeFocused();
  await expect(form.getByRole('alert')).toContainText('Enter your target as a number');
  await form.getByRole('textbox', {name: 'Your target (cm)'}).fill('85');
  await form.getByRole('button', {name: 'Add the goal'}).click();
  await expect(more.locator('.more-goal-row').filter({hasText: 'Waist at most 85 cm'})).toContainText('No waist measurement in the last 7 days yet');
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), MORE_GOALS_KEY);
  expect(stored.goals.map((g: {source: string; key: string; target: number}) => [g.source, g.key, g.target])).toEqual([['number', 'Resting pulse', 60], ['body', 'waist', 85]]);

  const findings = await axe(page, section);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await more.getByRole('button', {name: 'Close Waist at most 85 cm'}).click();
  await expect(more.locator('details.health-goals-done > summary')).toHaveText('Closed (1)');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
