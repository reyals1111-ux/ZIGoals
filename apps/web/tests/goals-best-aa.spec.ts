import {expect, test, type Page} from '@playwright/test';

/** Session AA-Cloud Part 2: Goals best-in-class (G1–G8), in the Showcase and on a new device. */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}

test('Goals: key figures, average goals among the cards, a vision board and a three-level tree', async ({page}) => {
  await showcase(page);
  await page.goto('/app/goals');
  const figures = page.getByRole('definition').filter({hasText: 'goals in motion'});
  await expect(figures).toContainText('7');
  // G8: the two active average goals sit among the cards.
  await expect(page.getByRole('article', {name: 'Create 2 hours a day'})).toBeVisible();
  await expect(page.getByRole('article', {name: 'Sleep 7 hours a night'})).toContainText(/h a night on average · \d+ of 14 days recorded/);
  // G3: the board, every goal a picture with its ring.
  await page.getByRole('group', {name: 'Show goals as'}).getByRole('button', {name: 'Vision board'}).click();
  await expect(page).toHaveURL(/view=board/);
  const tiles = page.getByRole('list', {name: 'Vision board'}).getByRole('listitem');
  await expect(tiles).toHaveCount(7);
  await expect(tiles.first().getByRole('img').first()).toHaveAttribute('aria-label', /picture for|photo for/);
  // G5: the tree, three levels deep.
  await page.getByRole('group', {name: 'Show goals as'}).getByRole('button', {name: 'Tree'}).click();
  const studio = page.locator('.goals-tree li[data-depth="0"]').filter({hasText: 'Launch my creative studio'});
  await expect(studio.locator('li[data-depth="1"]').filter({hasText: 'Create 2 hours a day'})).toBeVisible();
  await expect(studio.locator('li[data-depth="2"]').filter({hasText: 'Sleep 7 hours a night'})).toBeVisible();
  await expect(studio.locator('> a')).toContainText('0 of 1 sub-goal done');
  // G2: the balance wheel with every area named in words.
  const balance = page.getByRole('region', {name: 'Life balance'});
  await expect(balance.getByRole('img')).toHaveAccessibleName(/Health: \d+%; Habits & Mind: \d+%; Wealth: \d+%; Relationships: no data yet/);
  await expect(balance).toContainText('never counted as zero');
  // G7: the Hall of achievements.
  const hall = page.getByRole('region', {name: 'Hall of achievements'});
  await expect(hall.locator('.hall-title')).toHaveText(['Drink 2 litres a day', '8,000 steps a day, all summer', 'My first 0.1 BTC']);
  await expect(hall).toContainText('Finish day not recorded');
});

test('a goal’s pace forecast is labelled an estimate; its plan saves with Undo', async ({page}) => {
  await showcase(page);
  await page.goto('/app/goals/tracked/9201');
  const forecast = page.getByRole('region', {name: /^At this pace: about /});
  await expect(forecast).toContainText('An estimate from your pace so far, not a promise.');
  await expect(forecast).toContainText('Growth is not assumed.');
  await expect(forecast.getByRole('img')).toHaveAttribute('aria-label', /Recorded progress from .* of \$20,000\.00; at this pace about/);
  await forecast.getByText('Show the numbers').click();
  await expect(forecast.getByRole('table')).toBeVisible();
  // G4: the plan is there; G2: a new area, then Undo.
  const plan = page.getByRole('region', {name: 'Why, and how you get there'});
  await expect(plan.getByLabel('Why it matters to you')).toHaveValue('So a broken boiler is an annoyance, not a crisis.');
  await plan.getByText('Learning', {exact: true}).click();
  const toast = page.locator('.aa-toast');
  await expect(toast).toContainText('Emergency fund is in Learning now.');
  await toast.getByRole('button', {name: 'Undo'}).click();
  await expect(toast).toContainText('Change undone.');
  await expect(plan.getByRole('radio', {name: 'Wealth'})).toBeChecked();
});

test('a template fills in the goal wizard and offers its habits', async ({page}) => {
  await page.goto('/app/goals/templates');
  await expect(page.getByRole('heading', {name: 'Goal templates', level: 1})).toBeVisible();
  await expect(page.locator('.template-card')).toHaveCount(42);
  await page.getByLabel('Search templates').fill('10k');
  await expect(page.locator('.template-card')).toHaveCount(1);
  await page.getByRole('link', {name: 'Use the template: Run a 10K'}).click();
  await expect(page).toHaveURL(/\/app\/goals\/new\?template=run-10k/);
  await expect(page.getByRole('region', {name: 'From the template library'})).toContainText('Run a 10K');
  await expect(page.getByLabel(/Goal name|Name/).first()).toHaveValue('Run a 10K');
  await expect(page.getByRole('checkbox', {name: /Easy run/})).not.toBeChecked();
  await expect(page.getByLabel(/^Life area/)).toHaveValue('health');
  // A money template never names an amount.
  await page.goto('/app/goals/templates');
  await page.getByRole('button', {name: 'Wealth', exact: true}).click();
  for (const text of await page.locator('.template-card').allTextContents()) expect(text).not.toMatch(/[$€£]\s?\d|\d\s?(USD|EUR)/);
});

test('an average goal from a template: no data yet, then a day, its average and Undo', async ({page}) => {
  await page.goto('/app/goals/average/new?template=sleep-7h');
  await expect(page.getByLabel('Name')).toHaveValue('Sleep 7 hours a night');
  await expect(page.getByLabel('Target')).toHaveValue('7');
  await page.getByRole('button', {name: 'Save goal'}).click();
  await expect(page).toHaveURL(/\/app\/goals\/average\//);
  await expect(page.getByRole('heading', {name: 'Sleep 7 hours a night', level: 1})).toBeVisible();
  await expect(page.locator('.average-goal-overview')).toContainText('No data yet');
  await page.getByLabel('h a night').fill('7.5');
  await page.getByRole('button', {name: 'Save the day'}).click();
  await expect(page.locator('.average-goal-overview')).toContainText('7.5');
  await expect(page.locator('.average-goal-overview')).toContainText('1 of 14 days recorded');
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
  await expect(page.locator('.average-goal-overview')).toContainText('No data yet');
  // It is a goal like the others on Goals.
  await page.goto('/app/goals');
  await expect(page.getByRole('article', {name: 'Sleep 7 hours a night'})).toBeVisible();
});

test('the Hall’s share image is made on the device (a download, nothing uploaded)', async ({page}) => {
  test.skip((page.viewportSize()?.width ?? 1280) < 600, 'A phone hands the image to its share sheet instead.');
  await showcase(page);
  await page.goto('/app/goals');
  const requests: string[] = [];
  page.on('request', r => { if (!r.url().startsWith('blob:') && !r.url().startsWith('data:') && r.method() !== 'GET') requests.push(r.url()); });
  const card = page.locator('.hall-card').filter({hasText: 'Drink 2 litres a day'});
  const download = page.waitForEvent('download');
  await card.getByRole('button', {name: 'Share image'}).click();
  expect((await download).suggestedFilename()).toBe('Drink-2-litres-a-day.png');
  expect(requests).toEqual([]);
});
