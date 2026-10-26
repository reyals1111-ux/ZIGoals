import {expect, test} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {openHabitDetails} from './ab-shell';

// Session AH Part 14 (CO6, CO7, CO12, L1, L2; ADR-033 M48): what other apps offer that ZIGoals lacked, built where it
// fits, from saved records only. Fictional Showcase data; every /api/ call answers 503 here.
test.beforeEach(async ({page}) => { await offlineApi(page); });

test('Wealth: the chart says why a record differs from the one before it, and Hide amounts blurs it', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/wealth'); await hydrated(page);
  const history = page.locator('#wealth-history');
  const fold = history.locator('xpath=ancestor::details[1]');
  if (await fold.count()) await fold.locator('> summary').click();
  // One chart per currency the records hold; the first is the base currency's.
  const why = history.locator('.wealth-history-why').first();
  await expect(why).toContainText(/^Since [A-Z][a-z]{2} \d{1,2}, \d{4}: /);
  await expect(why).toContainText(/(\+|−)[$€][\d,]+\.\d{2}|no change/);
  await page.evaluate(() => { document.documentElement.dataset.hideAmounts = 'on'; });
  await expect(why).toHaveCSS('filter', 'blur(7px)');
  await expect(history.locator('.wealth-history-readout strong').first()).toHaveCSS('filter', 'blur(7px)');
});

test('Ecosystem: the projects Earn covers show their value locked with its source and a way to Earn; others show none', async ({page}) => {
  await page.goto('/app/ecosystem'); await hydrated(page);
  const oroswap = page.locator('#project-oroswap .ecosystem-live');
  await expect(oroswap).toContainText('Value locked:');
  // The route answers 503 here: the line says so instead of a number.
  await expect(oroswap).toContainText('unavailable right now');
  await expect(oroswap.getByRole('link', {name: 'On Earn →'})).toHaveAttribute('href', '/app/earn#oroswap');
  await expect(page.locator('#project-valdora .ecosystem-live')).toHaveCount(1);
  await expect(page.locator('#project-zig-markets .ecosystem-live')).toHaveCount(0);
});

test('Help states the data-freshness policy', async ({page}) => {
  await page.goto('/app/help#help-ah-freshness'); await hydrated(page);
  const answer = page.locator('#help-ah-freshness');
  await expect(answer).toContainText('current for 15 minutes');
  await expect(answer).toContainText('once a day');
  await expect(answer).toContainText('every 10 minutes');
});

test('Habits: a habit with enough history shows its Strength, explained', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/habits'); await hydrated(page);
  const walk = page.getByRole('article', {name: 'Walk', exact: true});
  await openHabitDetails(walk);
  await walk.getByText('Consistency & trends', {exact: true}).click();
  const strength = walk.locator('.habit-strength');
  await expect(strength).toContainText(/^Strength \d{1,3} of 100, from \d+ scheduled days? in the last 90\./);
});

test('Workouts: the exercise history draws each session\'s best as a line, described in words', async ({page}) => {
  await loadShowcase(page);
  await page.goto('/app/health?view=workouts'); await hydrated(page);
  const line = page.getByRole('region', {name: 'Exercise history'}).locator('.workouts-progress-line');
  await expect(line.getByRole('img')).toHaveAttribute('aria-label', /over \d+ sessions: .+ on [A-Z][a-z]{2} \d{1,2}, \d{4}, .+; highest /);
  await expect(line.locator('figcaption')).toContainText('Progress, session by session');
});
