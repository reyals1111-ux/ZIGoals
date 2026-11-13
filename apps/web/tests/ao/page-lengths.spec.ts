import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../ah-helpers';
import {earnRoutes} from '../earn-fixtures';

/**
 * Session AO (DV-045e, N-BN-05, BUG-051): page lengths with the Showcase, measured as the replays measured them (the
 * document's scrollHeight once the page has settled, nothing opened).
 * - Journey was 7,178 px at 1440 and 11,285 px at 375: its longer sections (My universe, Focus sessions, the badge cabinet,
 *   the path, the freezes, the rewards shelf) are labelled rows now, on every size; the hero, the level and today's quests
 *   stay open. Under 4,000 px at 1440 and 6,000 px at 375, and every row still opens what it names.
 * - Earn was 15,769 px at 375: on a phone the ways to earn below Start here, the validator list and the Academy fold to one
 *   row each too. Under 8,000 px, nothing scrolls sideways.
 * - Portfolio at 768: the holdings table was 1,310 px wide inside a 578 px section that scrolled sideways; up to 900 px each
 *   holding is a card, so nothing in the section scrolls sideways and every holding's value is in view.
 */
test.skip(({isMobile}) => isMobile, 'Widths are set on the desktop project.');

const height = (page: Page) => page.evaluate(() => document.documentElement.scrollHeight);
const sideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
const JOURNEY_ROWS = ['My universe', 'Focus sessions', 'Badge cabinet', 'Milestones', 'Freezes', 'Rewards shelf'];

async function journey(page: Page, width: number, height: number) {
  await page.setViewportSize({width, height});
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/journey'); await hydrated(page);
  await expect(page.locator('.journey-level')).toBeVisible();
  const rows = page.locator('.journey-page .phone-fold-toggle');
  // Every row, folded, at least 44 px tall, named as the section it holds.
  for (const label of JOURNEY_ROWS) {
    const row = rows.filter({hasText: label}).first();
    await expect(row, label).toHaveAttribute('aria-expanded', 'false');
    expect((await row.boundingBox())!.height, label).toBeGreaterThanOrEqual(44);
    expect(await row.evaluate(el => parseFloat(getComputedStyle(el).fontSize)), label).toBeGreaterThanOrEqual(14);
  }
  await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
  return rows;
}

test('DV-045e: the Showcase Journey at 1440 px is under 4,000 px; a row opens its section and an address into one opens it', async ({page}) => {
  const rows = await journey(page, 1440, 900);
  const tall = await height(page);
  test.info().annotations.push({type: 'Journey at 1440', description: String(tall)});
  expect(tall, 'was 7,178 px').toBeLessThan(4_000);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  // The hero and today's quests stay open.
  await expect(page.locator('.journey-hero')).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Quests', exact: true})).toBeVisible();
  // A row opens its section in place; on a computer the open row is remembered on this device.
  const badges = rows.filter({hasText: 'Badge cabinet'}).first();
  await badges.click();
  await expect(badges).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('heading', {name: 'Badge cabinet'})).toBeVisible();
  await page.reload(); await hydrated(page);
  await expect(page.locator('.journey-page .phone-fold-toggle').filter({hasText: 'Badge cabinet'}).first()).toHaveAttribute('aria-expanded', 'true');
  // "On this page" and an address into a folded section open it.
  await page.getByRole('navigation', {name: 'On this page'}).getByRole('link', {name: 'Freezes', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Freezes', exact: true})).toBeInViewport();
  await page.goto('/app/journey#rewards-shelf'); await hydrated(page);
  await expect(page.locator('#rewards-shelf')).toBeVisible();
});

test('DV-045e: the Showcase Journey at 375 px is under 6,000 px, every section one tap away', async ({page}) => {
  const rows = await journey(page, 375, 812);
  const tall = await height(page);
  test.info().annotations.push({type: 'Journey at 375', description: String(tall)});
  expect(tall, 'was 11,285 px').toBeLessThan(6_000);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const universe = rows.filter({hasText: 'My universe'}).first();
  await universe.click();
  await expect(page.getByRole('list', {name: 'Your four planets'}).first()).toBeVisible();
});

test('N-BN-05: the Showcase Earn at 375 px is under 8,000 px; its rows are named as their headings and open by hand or by address', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await earnRoutes(page);
  await loadShowcase(page);
  await page.goto('/app/earn'); await hydrated(page);
  await expect(page.locator('[data-live-figure="native-apr"]')).toHaveAttribute('data-state', 'ok');
  await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
  const tall = await height(page);
  test.info().annotations.push({type: 'Earn at 375', description: String(tall)});
  expect(tall, 'was 15,769 px').toBeLessThan(8_000);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const rows = page.locator('.earn-sections .phone-fold-toggle');
  for (const [label, id] of [['Stake ZIG with a validator', 'native-staking'], ['Stake and keep a token: stZIG', 'valdora'], ['Lend USDC through a vault', 'valdora-vaults'], ['Swap, or earn swap fees in a pool', 'oroswap'], ['Choose a validator from facts', 'validators'], ['Earn Academy: learn it before you earn it', 'academy']] as const) {
    const row = rows.filter({hasText: label}).first();
    await expect(row, label).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator(`#${id}`), id).toBeHidden();
    expect((await row.boundingBox())!.height, label).toBeGreaterThanOrEqual(44);
  }
  // Start here leads, open.
  await expect(page.locator('#start-here')).toBeVisible();
  // By hand, and by an address into the section.
  await rows.filter({hasText: 'Stake ZIG with a validator'}).first().click();
  await expect(page.locator('#native-staking')).toBeVisible();
  await page.goto('/app/earn#validators'); await hydrated(page);
  await expect(page.locator('#validators')).toBeVisible();
  await expect(rows.filter({hasText: 'Choose a validator from facts'}).first()).toHaveAttribute('aria-expanded', 'true');
});

test('BUG-051: Portfolio at 768 px shows each holding as a card: nothing in the section scrolls sideways and every value is in view', async ({page}) => {
  await page.setViewportSize({width: 768, height: 1024});
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/portfolio'); await hydrated(page);
  const section = page.locator('.portfolio-holdings-section').first(), wrap = section.locator('.data-table-wrap');
  const cards = section.locator('tbody > tr:not(.data-detail-row)');
  await expect(cards.first()).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  expect(await wrap.evaluate(el => el.scrollWidth - el.clientWidth), 'the holdings do not scroll sideways').toBeLessThanOrEqual(1);
  expect(await section.evaluate(el => el.scrollWidth - el.clientWidth), 'nor does their section').toBeLessThanOrEqual(1);
  const box = (await section.boundingBox())!;
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i), value = card.locator('td[data-label="Value"]');
    // The same data and the same names: the coin's button, then each figure under its column's name.
    await expect(card.locator('.data-coin-toggle')).toBeVisible();
    await expect(value).toBeVisible();
    await expect(value).not.toHaveText('');
    const at = (await value.boundingBox())!;
    expect(at.x).toBeGreaterThanOrEqual(box.x - 0.5);
    expect(at.x + at.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    expect(await value.evaluate(el => getComputedStyle(el, '::before').content)).toBe('"Value"');
  }
  // Still a table to assistive tech, with its name.
  await expect(section.getByRole('table', {name: /holdings$/})).toBeAttached();
  await expect(section.getByRole('columnheader', {name: 'Value'})).toBeAttached();
  // Above 900 px the table returns.
  await page.setViewportSize({width: 1280, height: 900});
  await expect.poll(() => section.locator('thead').evaluate(el => getComputedStyle(el).position)).not.toBe('absolute');
});
