import {expect, test, type Page} from '@playwright/test';

/** Session AA-Cloud Part 3: the compound interest calculator on Wealth and its own page. */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});
const results = (page: Page) => page.getByRole('region', {name: 'What it could grow to'});
async function plan(page: Page, values: {start: string; contribution: string; rate: string; years: string}) {
  await page.getByLabel('Starting amount').fill(values.start);
  await page.getByLabel('Regular contribution').fill(values.contribution);
  await page.getByRole('textbox', {name: 'Yearly return', exact: true}).fill(values.rate);
  await page.getByRole('textbox', {name: 'Years', exact: true}).fill(values.years);
}

test('Wealth opens the calculator; results follow every change, exactly, and always say they are an estimate', async ({page}) => {
  await page.goto('/app/wealth');
  const card = page.getByRole('region', {name: 'Compound interest calculator'});
  await expect(card).toContainText('returns are not guaranteed');
  await card.getByRole('link', {name: 'Open the calculator'}).click();
  await expect(page).toHaveURL(/\/app\/wealth\/calculator$/);
  await expect(page).toHaveTitle(/Compound interest calculator/);
  await plan(page, {start: '10000', contribution: '0', rate: '5', years: '10'});
  await page.getByLabel('Interest added').selectOption('yearly');
  // 10,000 × 1.05^10 = 16,288.95 (lib/compound/engine.test.ts has the closed forms).
  await expect(results(page).getByRole('definition').first()).toHaveText('$16,288.95');
  await expect(results(page)).toContainText('$10,000.00');
  await expect(results(page)).toContainText('+$6,288.95');
  await expect(results(page)).toContainText('An estimate; returns are not guaranteed.');
  await expect(page.locator('body')).not.toContainText(/you should|we recommend|guaranteed return/i);
  // The slider moves the same value, from the keyboard.
  const years = page.getByRole('slider', {name: 'Years, slider'});
  await years.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('textbox', {name: 'Years', exact: true})).toHaveValue('11');
  await expect(results(page).getByRole('definition').first()).toHaveText('$17,103.39');
  // Assertion changed (Session AH TR14, B-123; stronger): a field being corrected says why, and no figure stays on screen
  // (the last numbers that worked read as current); the result comes back with a valid field.
  await page.getByLabel('Starting amount').fill('12.345');
  await expect(page.getByRole('alert').filter({hasText: 'up to two decimals'})).toBeVisible();
  await expect(page.getByRole('region', {name: 'Correct the marked field to see the estimate.'})).toBeVisible();
  await expect(results(page)).toHaveCount(0);
  await expect(page.locator('.calc-figures')).toHaveCount(0);
  // A comma reads as the rest of the app reads it: a decimal comma, thousands only when unambiguous, "1,500" asks.
  await page.getByLabel('Starting amount').fill('1,500');
  await expect(page.getByRole('alert').filter({hasText: 'could mean 1500 or 1.500'})).toBeVisible();
  await page.getByLabel('Starting amount').fill('10000,50');
  await expect(results(page).getByRole('definition').first()).toBeVisible();
  await expect(page.getByRole('region', {name: 'Correct the marked field to see the estimate.'})).toHaveCount(0);
  await page.getByLabel('Starting amount').fill('1,000,000');
  await expect(page.locator('.calc-error')).toHaveCount(0);
  // Read as a million: 1,000,000 × 1.05^11 = 1,710,339.358… (Gate C audit: the figure proves the parse).
  await expect(results(page).getByRole('definition').first()).toHaveText(/^\$1,710,339\.3[56]$/);
  // Inflation shows today's money and a column in the table.
  await page.getByLabel('Starting amount').fill('10000');
  await page.getByText('Rising contributions and inflation (optional)').click();
  await page.getByLabel('Inflation each year').fill('2');
  await expect(results(page).getByRole('term').filter({hasText: 'In today’s money'})).toBeVisible();
  await expect(page.getByRole('columnheader', {name: 'In today’s money'})).toBeVisible();
});

test('The chart reads a year from the keyboard; what-ifs, milestones and the year-by-year table agree', async ({page}) => {
  await page.goto('/app/wealth/calculator');
  await plan(page, {start: '9000', contribution: '500', rate: '6', years: '30'});
  const chart = page.getByRole('group', {name: /Growth chart/});
  await expect(chart.getByRole('img')).toHaveAccessibleName(/^An estimate: .* after 30 years/);
  await chart.focus();
  await page.keyboard.press('End');
  await expect(chart.locator('.calc-tip')).toContainText('After year 30');
  await page.keyboard.press('ArrowLeft');
  await expect(chart.locator('.calc-tip')).toContainText('After year 29');
  // Higher and lower returns are compared by default, each with its own line and its difference in words.
  const compare = page.getByRole('group', {name: 'Compare with'});
  await expect(compare.getByRole('checkbox', {name: '8 % return'})).toBeChecked();
  await compare.getByRole('checkbox', {name: 'Started 5 years earlier'}).check();
  await expect(chart.locator('.calc-whatif')).toHaveCount(3);
  await expect(page.locator('.calc-whatifs li')).toHaveCount(3);
  await expect(page.locator('.calc-whatifs li').first()).toContainText('compared with your plan');
  const milestones = page.getByRole('region', {name: 'Milestones'});
  await expect(milestones).toContainText('Year 1, month 2 (estimate)');
  await expect(milestones).toContainText('Not within 30 years');
  const table = page.getByRole('region', {name: 'Year by year'});
  await expect(table.getByRole('row')).toHaveCount(11);
  await table.getByRole('button', {name: 'Show all 30 years'}).click();
  await expect(table.getByRole('row')).toHaveCount(31);
});

test('Scenarios are kept on this device with Undo, and a result becomes a prefilled Value goal', async ({page}) => {
  await page.goto('/app/wealth/calculator');
  await plan(page, {start: '1000', contribution: '200', rate: '5', years: '20'});
  const saved = page.getByRole('region', {name: 'Saved scenarios'});
  await saved.getByLabel('Name this scenario').fill('Steady');
  await saved.getByRole('button', {name: 'Save scenario'}).click();
  await expect(saved.getByRole('listitem')).toHaveCount(1);
  await page.reload();
  await expect(saved.getByRole('listitem').filter({hasText: 'Steady'})).toContainText('(estimate)');
  // The page opens on the last inputs.
  await expect(page.getByRole('textbox', {name: 'Years', exact: true})).toHaveValue('20');
  await saved.getByRole('button', {name: 'Remove Steady'}).click();
  await expect(saved.getByRole('listitem')).toHaveCount(0);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect(saved.getByRole('listitem').filter({hasText: 'Steady'})).toBeVisible();
  await expect(page.getByRole('status').filter({hasText: '“Steady” is back.'})).toBeVisible();
  // "Turn this into a goal": a Value goal with the estimate as its target, in the same currency.
  await page.getByRole('link', {name: 'Turn this into a goal'}).click();
  await expect(page).toHaveURL(/\/app\/goals\/new\?from=calculator/);
  const from = page.getByRole('region', {name: 'From the calculator'});
  await expect(from).toContainText('not a promise');
  await expect(page.getByRole('radio', {name: /^Value/})).toBeChecked();
  // Assertion changed (Session AH TR14, B-130; stronger): the estimate exactly, cents included (it was cut to 84919).
  await expect(page.getByLabel('Target amount')).toHaveValue('84919.37');
  await expect(page.getByRole('radio', {name: 'USD · US dollar'})).toBeChecked();
});

test('Phones: the result figures, then the chart, then the inputs; nothing wider than the screen', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'the phone layout');
  await page.goto('/app/wealth/calculator');
  const final = results(page).getByRole('definition').first();
  await expect(final).toBeVisible();
  const [figuresTop, chartTop, inputsTop] = await Promise.all([final.boundingBox(), page.getByRole('group', {name: /Growth chart/}).boundingBox(), page.getByLabel('Starting amount').boundingBox()]);
  expect(figuresTop!.y).toBeLessThan(chartTop!.y);
  expect(chartTop!.y).toBeLessThan(inputsTop!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.getByLabel('Starting amount').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
});

// Gate C (persona round): opening the calculator writes nothing; a result too large to read reliably says so.
test('opening the calculator writes nothing; a result past a quadrillion is not shown as exact digits', async ({page}) => {
  await page.goto('/app');
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  await page.goto('/app/wealth/calculator');
  await expect(results(page)).toBeVisible();
  await page.waitForTimeout(1200);
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
  await plan(page, {start: '1000000000000', contribution: '0', rate: '100', years: '60'});
  await expect(page.getByRole('status').filter({hasText: 'Too large to estimate here.'})).toBeVisible();
  await expect(page.locator('body')).not.toContainText('−Unavailable');
});
