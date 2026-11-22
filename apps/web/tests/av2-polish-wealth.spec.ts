import {expect, test} from '@playwright/test';
import {foldMarker, go, noSideways, start} from './av2-polish-helpers';
import {THEMES} from './p6-helpers';
import {openWealthSection} from './ap/ap-money-fixtures';

/**
 * Session AV lane 2 (polish), Wealth:
 * - P-5: on a phone Spending's heading keeps the width; "Import from your bank" goes under it.
 * - P-32: an entry's day reads "Sun, Nov 22", never the stored "2026-11-22".
 * - P-35: each Plan line keeps its button in one right-hand column.
 * - P-36: inside its fold, "Budgets by category" is not said twice on screen (the title stays for screen readers).
 * - P-37: the budget table's headers are 14 px.
 * - P-40: a fresh device with "All" chosen reads "Build your wealth picture", not "No assets in this category yet".
 * - P-34 (polish 2): Money tools in three labelled pairs, counts of 0 not shown; a fresh Budgets folds its extra tools.
 */
test.use({timezoneId: 'Europe/Amsterdam'});

for (const theme of THEMES) test(`${theme}: Spending's heading has the width at 390; days read as days`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/wealth#spending');
  const heading = page.locator('#spending > .wealth-section-heading');
  await expect(heading).toBeVisible({timeout: 15_000});
  const title = (await heading.locator('h2').boundingBox())!, text = (await heading.locator(':scope > div').boundingBox())!, button = (await heading.getByRole('button', {name: 'Import from your bank'}).boundingBox())!;
  expect(text.width, 'the words keep the heading width').toBeGreaterThanOrEqual(260);
  expect(button.y, 'the button stands under the words').toBeGreaterThanOrEqual(text.y + text.height - 1);
  expect(title.height, 'Room to spend on one line').toBeLessThanOrEqual(40);
  const days = await page.locator('.spending-entries .spending-entry-what').allInnerTexts();
  expect(days.length).toBeGreaterThan(0);
  for (const d of days) expect(d).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  await expect(page.locator('.spending-entries time').first()).toHaveText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}$/);
  await noSideways(page);
});

test('Budgets: the Plan buttons share one column; headers 14 px', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/wealth?view=budgets');
  const plans = page.locator('.budgets-assign-head > button');
  await expect(plans.first()).toBeAttached({timeout: 15_000});
  await plans.first().scrollIntoViewIfNeeded();
  const rights = await plans.evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().right)));
  expect(rights.length).toBeGreaterThan(1);
  expect(Math.max(...rights) - Math.min(...rights)).toBeLessThanOrEqual(2);
  const tops = await page.locator('.budgets-assign-head').evaluateAll(els => els.map(e => { const b = e.querySelector(':scope > button')!.getBoundingClientRect(), t = e.querySelector(':scope > span')!.getBoundingClientRect(); return b.top - t.top; }));
  for (const gap of tops) expect(Math.abs(gap), 'Plan beside its line, not under it').toBeLessThanOrEqual(12);
  for (const size of await page.locator('.budgets-table thead th').evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).fontSize)))) expect(size).toBeGreaterThanOrEqual(14);
  await expect(page.locator('.budgets-assign')).not.toContainText(/\d{4}-\d{2}\)/);
  const title = page.locator('#budgets-title');
  await expect(title).toHaveText('Budgets by category');
  expect((await title.boundingBox())!.width).toBeLessThanOrEqual(1);
  await expect(page.getByRole('region', {name: 'Budgets by category'})).toBeVisible();
  await expect(page.locator('#budgets .wealth-section-heading .eyebrow')).toBeVisible();
});

/**
 * P-34 (polish 2): Money tools in three labelled pairs (Review · Your entries · Plan ahead), each pair one even row of two
 * (they had wrapped raggedly, six widths mixing purposes).
 */
for (const theme of THEMES) for (const width of [390, 1440])
  test(`P-34 ${theme} ${width}: Money tools in three labelled pairs, each an even row`, async ({page}) => {
    await start(page, {theme, width});
    await go(page, '/app/wealth#spending');
    const tools = page.getByRole('group', {name: 'Money tools'});
    await expect(tools.getByRole('button', {name: /^To review \(\d+\)$/})).toBeVisible({timeout: 20_000});
    await tools.scrollIntoViewIfNeeded();
    const pairs = {Review: [/^To review \(\d+\)$/, /^Rules \(\d+\)$/], 'Your entries': [/^Split an entry$/, /^Receipt photos$/], 'Plan ahead': [/^Next 60 days$/, /^If something happens to me$/]};
    for (const [name, buttons] of Object.entries(pairs)) {
      const group = tools.getByRole('group', {name, exact: true});
      await expect(group).toBeVisible();
      await expect(group.getByText(name, {exact: true})).toBeVisible();
      await expect(group.getByRole('button')).toHaveCount(2);
      for (const [i, button] of buttons.entries()) await expect(group.getByRole('button').nth(i)).toHaveAccessibleName(button);
      const boxes = await group.getByRole('button').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return {top: r.top, width: r.width, height: r.height}; }));
      expect(Math.abs(boxes[0]!.top - boxes[1]!.top), name).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes[0]!.width - boxes[1]!.width), name).toBeLessThanOrEqual(1);
      for (const b of boxes) expect(b.height).toBeGreaterThanOrEqual(44);
    }
    // The Showcase has entries to review: the count shows.
    await expect(tools.getByRole('button', {name: /^To review \(\d+\)$/})).toHaveText(/^To review \([1-9]\d*\)$/);
    await noSideways(page);
  });

test('P-34 a fresh device: counts of 0 are read aloud, not shown; Budgets shows one first step', async ({page}) => {
  await start(page, {width: 390, showcase: false});
  await go(page, '/app/wealth#spending');
  const tools = page.getByRole('group', {name: 'Money tools'});
  for (const name of ['To review (0)', 'Rules (0)']) {
    const button = tools.getByRole('button', {name, exact: true});
    await expect(button).toBeVisible({timeout: 20_000});
    const zero = button.locator('.visually-hidden');
    await expect(zero).toHaveText(' (0)');
    expect(await zero.evaluate(e => { const r = e.getBoundingClientRect(); return r.width <= 1 && r.height <= 1; })).toBe(true);
  }
  const budgets = await openWealthSection(page, 'budgets', 'Budgets by category');
  const add = budgets.getByRole('button', {name: '+ Set a monthly budget'});
  await expect(add).toBeVisible({timeout: 20_000});
  const more = budgets.locator('details.budgets-more-tools');
  const summary = more.locator(':scope > summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('More budget tools');
  await expect(more).not.toHaveAttribute('open');
  await foldMarker(summary);
  // None of the extra forms stands open before a first budget; the fold comes after the first step.
  for (const form of ['Watch a category', 'Watch a payee', 'Start a challenge']) await expect(budgets.getByRole('form', {name: form})).toBeHidden();
  await expect(budgets.getByRole('button', {name: '+ Add your own budget'})).toBeHidden();
  expect((await summary.boundingBox())!.y).toBeGreaterThan((await add.boundingBox())!.y);
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await summary.click();
  await expect(more).toHaveAttribute('open', '');
  await foldMarker(summary, true);
  await expect(budgets.getByRole('form', {name: 'Watch a category'})).toBeVisible();
  await expect(budgets.getByRole('form', {name: 'Watch a payee'})).toBeVisible();
  await expect(budgets.getByRole('button', {name: '+ Add your own budget'})).toBeVisible();
  await noSideways(page);
});

test('P-34 the Showcase (budgets set up): Budgets\' tools stand open, no extra fold', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/wealth?view=budgets');
  await expect(page.locator('#budgets').getByRole('form', {name: 'Watch a payee'})).toBeVisible({timeout: 20_000});
  await expect(page.locator('#budgets details.budgets-more-tools')).toHaveCount(0);
});

test('a fresh device: "All" chosen is the whole picture', async ({page}) => {
  await start(page, {width: 390, showcase: false});
  await go(page, '/app/wealth');
  const empty = page.locator('.holdings-empty');
  await expect(empty).toBeVisible({timeout: 15_000});
  await expect(empty).toContainText('Build your wealth picture');
  await expect(empty).not.toContainText('No assets in this category yet');
});
