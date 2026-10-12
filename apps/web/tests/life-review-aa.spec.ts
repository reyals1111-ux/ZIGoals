import {expect, test, type Page} from '@playwright/test';

/** Session AA-Cloud Part 5: the Life review (week and month) and the cross-pillar insights. */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}

test('the Showcase review: highlights, wins, streaks, health beside the week before, money per currency and the insights', async ({page}) => {
  await showcase(page);
  await page.goto('/app/review');
  await expect(page).toHaveTitle(/Life review/);
  const highlights = page.getByRole('region', {name: 'Highlights'});
  await expect(highlights.getByRole('listitem').first()).toBeVisible();
  await expect(highlights.getByRole('definition').first()).toHaveText(/^\d+$/);
  await expect(page.getByRole('region', {name: 'Streaks'}).getByRole('listitem').first()).toBeVisible();
  const trends = page.getByRole('region', {name: 'Trends'});
  await expect(trends.getByRole('rowheader', {name: /Sleep a night/})).toBeVisible();
  await expect(trends).toContainText('never counted as zero');
  const money = page.getByRole('region', {name: 'Net worth, by currency'});
  await expect(money).toContainText('never converted');
  const insights = page.getByRole('region', {name: 'On the same days'});
  await expect(insights).toContainText('not a cause');
  await expect(insights).not.toContainText(/\bbecause\b|\bimproves\b|\bshould\b/i);
  // The month: another window, the same sections.
  const period = page.getByRole('group', {name: 'Review period'});
  await period.getByRole('button', {name: 'This month'}).click();
  await expect(period.getByRole('button', {name: 'This month'})).toHaveAttribute('aria-pressed', 'true');
  await expect(period).toContainText(/1 [A-Z][a-z]+|[A-Z][a-z]+ 1\b/);
  await page.reload();
  await expect(page.getByRole('group', {name: 'Review period'}).getByRole('button', {name: 'This month'})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', {name: 'Share as an image'})).toBeVisible();
});

test('one focus for the period, kept on this device, with Undo; last period\'s focus comes back', async ({page}) => {
  await showcase(page);
  await page.goto('/app/review');
  const focus = page.getByRole('region', {name: 'One focus'});
  await focus.getByLabel('Your focus').fill('Bed by 23:00 on weeknights');
  await focus.getByRole('button', {name: 'Save focus'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Your focus is saved on this device.'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', {name: 'One focus'}).getByLabel('Your focus')).toHaveValue('Bed by 23:00 on weeknights');
  // Last period's focus comes back (the Showcase's last week).
  await expect(page.getByRole('region', {name: 'One focus'})).toContainText('Last week you chose: A short walk after lunch (Showcase)');
  await page.getByRole('region', {name: 'One focus'}).getByLabel('Your focus').fill('');
  await page.getByRole('region', {name: 'One focus'}).getByRole('button', {name: 'Save focus'}).click();
  // The clear happened (Gate C audit): the stored focus for this period is gone before Undo puts it back.
  await expect.poll(() => page.evaluate(() => { const raw = Object.entries(sessionStorage).find(([k]) => k.endsWith('zigoals:life-review:v1'))?.[1]; return raw ? Object.values(JSON.parse(raw).focus as Record<string, {text: string}>).some(f => f.text === 'Bed by 23:00 on weeknights') : false; })).toBe(false);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Focus put back.'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('region', {name: 'One focus'}).getByLabel('Your focus')).toHaveValue('Bed by 23:00 on weeknights');
});

test('Today opens the review from Updates and summaries; search finds it', async ({page}) => {
  await showcase(page);
  const updates = page.getByRole('region', {name: 'Updates and summaries', exact: true});
  await expect(updates).toBeVisible();
  const fold = updates.getByRole('button', {name: /^Show more/});
  if (await fold.count()) await fold.click();
  const teaser = page.getByRole('region', {name: 'Your week at a glance.'});
  await expect(teaser.getByRole('listitem').first()).toBeVisible();
  await teaser.getByRole('link', {name: 'Open your life review →'}).click();
  await expect(page).toHaveURL(/\/app\/review$/);
  await page.locator('body').press('/');
  await page.getByRole('dialog', {name: 'Search'}).getByRole('combobox').fill('life review');
  await expect(page.getByRole('dialog', {name: 'Search'}).getByRole('option', {name: /^Life review/})).toBeVisible();
});

test('a new device: a designed empty review, nothing counted as zero', async ({page}) => {
  await page.goto('/app/review');
  await expect(page.getByRole('heading', {name: 'A quiet week.'})).toBeVisible();
  const trends = page.getByRole('region', {name: 'Trends'});
  await expect(trends.getByRole('cell', {name: 'Not recorded'}).first()).toBeVisible();
  await expect(page.getByRole('region', {name: 'On the same days'})).toContainText('Not enough data yet');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
