import {expect, test} from '@playwright/test';
import {earnRoutes, openEarnFolds, seedShowcase} from '../../earn-fixtures';
import {chooseChain} from '../../chain-choice';

// Session AL sweep 4 (lane SW4): the L6 fourth pass's requests 2 and 9 (Earn part). Recorded fixtures only, a fixed clock.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
test.beforeEach(async ({page}) => { await chooseChain(page); await seedShowcase(page); await page.clock.setFixedTime(new Date('2026-11-04T09:30:00Z')); });

test('BN-027/B-122: the Ecosystem header\'s day is the newest read on the page, the live value-locked read included', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await earnRoutes(page);
  await page.goto('/app/ecosystem');
  const live = page.locator('.ecosystem-live time').first();
  await expect(live).toBeAttached();
  const liveDay = (await live.getAttribute('datetime'))!;
  const header = page.locator('.ecosystem-review time');
  await expect(page.locator('.ecosystem-review')).toContainText('Sources last read');
  // The newest read: never older than the live read's day (in the person's zone).
  const day = (await header.getAttribute('datetime'))!;
  expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  const liveLocal = await page.evaluate(iso => new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Brussels'}).format(new Date(iso)), liveDay);
  expect(day >= liveLocal).toBe(true);
});

test('C-BN-17: the Sort offers value locked, largest first; projects with a read lead, largest first', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await earnRoutes(page);
  await page.goto('/app/ecosystem');
  await expect(page.locator('.ecosystem-live[data-live]').first()).toBeAttached();
  const sort = page.getByRole('combobox', {name: /^Sort/});
  await expect(sort.locator('option')).toHaveText(['Directory order', 'Name, A to Z', 'Live projects first', 'Value locked, largest first (projects with a read)']);
  await sort.selectOption('value');
  const figures = await page.locator('.ecosystem-projects > *').evaluateAll(cards => cards.map(card => {
    const strong = card.querySelector('.ecosystem-live[data-live] strong')?.textContent ?? null;
    if (!strong) return null;
    const m = /\$([\d.]+)([KMB]?)/.exec(strong); if (!m) return null;
    return Number(m[1]) * ({'': 1, K: 1e3, M: 1e6, B: 1e9} as Record<string, number>)[m[2]!]!;
  }));
  const read = figures.filter((f): f is number => f !== null);
  expect(read.length).toBeGreaterThan(0);
  // Every card with a read comes before every card without one, and the reads run largest first.
  expect(figures.slice(0, read.length).every(f => f !== null)).toBe(true);
  expect([...read].sort((a, b) => b - a)).toEqual(read);
});

test('N-BN-05/D-005: on a phone Earn\'s wider sections are folded rows; the index and a #hash open the one they name', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await earnRoutes(page);
  await page.goto('/app/earn');
  const rows = page.locator('.earn-sections .phone-fold-toggle');
  // Session AL fifth pass (C-BN-07 / N-BN-05, deliberate): the new side-by-side table is the first folded row on a phone.
  await expect(rows).toHaveText([/^The ways to earn, compared/, /^Shariah-compliant vaults: Nawa/, /^Invoice finance pools: DeFa/, /^Borrow and lend: Permapod/, /^Zignaly is closing: how to withdraw/, /^Have a say: governance/, /^Link stake you already hold to a goal/, /^Stablecoins on ZIGChain: what exists/]);
  for (const row of await rows.all()) { await expect(row).toHaveAttribute('aria-expanded', 'false'); expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44); }
  await expect(page.locator('#governance')).toBeHidden();
  // The page is shorter than the 24,092 px the replay measured at 375 with every section open.
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(24_092);
  // The index's chip opens the section it names.
  await page.getByRole('navigation', {name: 'On this page'}).getByRole('link', {name: 'Governance', exact: true}).click();
  await expect(page).toHaveURL(/#governance$/);
  await expect(page.locator('#governance')).toBeVisible();
  await expect(page.locator('#governance').getByRole('link', {name: 'Open Governance'})).toBeVisible();
  // A link from elsewhere with a hash opens its row too.
  await page.goto('/app/earn#stablecoins');
  await expect(page.locator('#stablecoins')).toBeVisible();
  await expect(page.getByRole('button', {name: /^Stablecoins on ZIGChain: what exists/})).toHaveAttribute('aria-expanded', 'true');
  // The rows open by hand, every one.
  await page.goto('/app/earn');
  await openEarnFolds(page);
  for (const id of ['nawa', 'defa', 'permapod', 'zignaly', 'governance', 'goal-vaults', 'stablecoins']) await expect(page.locator(`#${id}`), id).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

test('N-BN-05: wider screens keep every section open, no rows', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await earnRoutes(page);
  await page.goto('/app/earn');
  await expect(page.locator('#governance')).toBeVisible();
  await expect(page.locator('.earn-sections .phone-fold-toggle')).toHaveCount(0);
});
