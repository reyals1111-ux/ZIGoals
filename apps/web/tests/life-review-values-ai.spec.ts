import {expect, test} from '@playwright/test';
import {seed, stored} from './zigi-af';
import {LIFE_REVIEW_KEY} from '../lib/life-review/store';

/**
 * Session AI (feature 9, G13, GO14): the weekly Life review across life — Chapter 5 "Your days" (spending, journal,
 * energy, mood from the person's own records) and the values check (up to three values, a 1–5 answer per week). The
 * Showcase's fictional records; offline; no AI.
 */
test.use({timezoneId: 'UTC'});
test('the week: Your days, then choosing values and rating the week', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page, {ai: null});
  await page.goto('/app/review');
  const days = page.getByRole('region', {name: 'Spending, journal, energy and mood'});
  await expect(days).toContainText('Energy');
  await expect(days).toContainText(/of 5 on average/);
  await expect(days).toContainText('never counted as zero');
  const values = page.getByRole('region', {name: 'Did this week reflect them?'});
  await values.getByRole('button', {name: 'Health'}).click();
  await values.getByRole('button', {name: 'Family'}).click();
  await values.getByLabel('Your own word').fill('Patience');
  await values.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(values.getByRole('button', {name: 'Patience'})).toHaveAttribute('aria-pressed', 'true');
  // A fourth is not taken.
  await values.getByRole('button', {name: 'Calm'}).click();
  await expect(values.getByRole('button', {name: 'Calm'})).toHaveAttribute('aria-pressed', 'false');
  await values.getByRole('button', {name: 'Save values'}).click();
  await expect(values.getByRole('status')).toContainText('Your values are saved on this device.');
  await values.getByRole('group', {name: 'Health'}).getByRole('radio', {name: '4'}).check();
  await expect(values.getByRole('status')).toContainText('Health: 4 of 5 this week.');
  const record = (await stored(page, LIFE_REVIEW_KEY)) as {values?: string[]; valueChecks?: Record<string, {ratings: Record<string, number>}>} | null;
  expect(record?.values).toEqual(['Health', 'Family', 'Patience']);
  expect(Object.values(record?.valueChecks ?? {})[0]?.ratings).toEqual({Health: 4});
});
