import {expect, test, type Page} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';
import {THEMES} from './p6-helpers';

/**
 * Session AV lane 2 (polish): Today, in the Showcase.
 * - P-1: the Life overview's four pillars are the group's own children again (an extra wrapper had stopped every
 *   `.life-rings > .life-ring` rule): on a phone four compact tiles in a 2 × 2 grid, on a computer one row each whose
 *   pillar name, figure and line stand on their own lines — never "GOALS7 active3 completed".
 * - P-6: Daily Habits' auto check-in note has the row's width (it stood one word per line).
 * - P-12: "Show more (N)" says Show once (no second "Show" beside the chevron).
 * - P-11: two small widgets side by side are the same height.
 * - P-37: the pillar names and the part-of-day headings are 14 px.
 */
test.use({timezoneId: 'Europe/Amsterdam'});

const lines = (page: Page) => page.locator('.life-rings > .life-ring').evaluateAll(els => els.map(el => {
  const pillar = el.querySelector('.life-ring-pillar')!.getBoundingClientRect(), figure = el.querySelector(':scope > span > strong')!.getBoundingClientRect();
  return {pillarBottom: pillar.bottom, figureTop: figure.top, top: el.getBoundingClientRect().top, left: el.getBoundingClientRect().left, size: parseFloat(getComputedStyle(el.querySelector('.life-ring-pillar')!).fontSize)};
}));

for (const theme of THEMES) test(`${theme}: the Life overview's pillars stand apart, as tiles on a phone`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app');
  const group = page.getByRole('group', {name: 'Your four pillars today'});
  await expect(group).toHaveClass(/\blife-rings\b/);
  await expect(group.locator(':scope > .life-ring')).toHaveCount(4);
  await group.scrollIntoViewIfNeeded();
  const phone = await lines(page);
  // 2 × 2: the first two tiles share a top and stand side by side; the third starts a new row.
  expect(Math.abs(phone[0]!.top - phone[1]!.top)).toBeLessThanOrEqual(2);
  expect(phone[1]!.left).toBeGreaterThan(phone[0]!.left + 100);
  expect(phone[2]!.top).toBeGreaterThan(phone[0]!.top + 40);
  for (const tile of phone) { expect(tile.figureTop).toBeGreaterThanOrEqual(tile.pillarBottom - 1); expect(tile.size).toBeGreaterThanOrEqual(14); }
  await noSideways(page);

  await page.setViewportSize({width: 1440, height: 900});
  await group.scrollIntoViewIfNeeded();
  const desk = await lines(page);
  for (const row of desk) { expect(row.figureTop).toBeGreaterThanOrEqual(row.pillarBottom - 1); expect(row.size).toBeGreaterThanOrEqual(14); }
  // One row per pillar on a computer: each below the one before.
  for (let i = 1; i < desk.length; i++) expect(desk[i]!.top).toBeGreaterThan(desk[i - 1]!.top + 40);
});

test('Daily Habits: the auto check-in note is one wide line, the part-of-day headings 14 px', async ({page}) => {
  // Early afternoon, so the Afternoon part (the Walk, ticked from the activity log) is on Today.
  await page.clock.install({time: new Date('2026-11-23T13:30:00+01:00')});
  await start(page, {width: 1440});
  await go(page, '/app');
  const habits = page.locator('section.habits-today');
  const badge = habits.locator('.habit-auto-badge').first();
  await expect(badge).toBeVisible({timeout: 15_000});
  await badge.scrollIntoViewIfNeeded();
  const box = (await badge.boundingBox())!;
  expect(box.width, 'the note has the row to itself').toBeGreaterThanOrEqual(300);
  expect(box.height, 'two lines at most').toBeLessThanOrEqual(60);
  for (const size of await habits.locator('.habit-section-label').evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).fontSize)))) expect(size).toBeGreaterThanOrEqual(14);
  await page.setViewportSize({width: 390, height: 844});
  await badge.scrollIntoViewIfNeeded();
  expect((await badge.boundingBox())!.width).toBeGreaterThanOrEqual(240);
});

test('For you and Updates: the fold row says Show once', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app');
  const toggle = page.locator('.for-you-fold .phone-fold-toggle').first();
  await expect(toggle).toBeVisible({timeout: 15_000});
  await expect(toggle).toHaveAccessibleName(/^Show more \(\d+\)$/);
  await expect(toggle.locator('.phone-fold-hint')).toHaveText('');
  await expect(toggle.locator('.phone-fold-hint svg')).toBeVisible();
});

test('Your widgets: small widgets side by side share a height', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app');
  const compact = page.locator('.dashboard-layout-grid > .placed-module[data-kind="widget"][data-size="compact"]');
  await expect(compact.nth(1)).toBeAttached({timeout: 15_000});
  await compact.first().scrollIntoViewIfNeeded();
  const boxes = await compact.evaluateAll(els => els.map(e => { const r = (e.firstElementChild ?? e).getBoundingClientRect(); return {top: Math.round(r.top), height: Math.round(r.height)}; }));
  const rows = new Map<number, number[]>();
  for (const b of boxes) rows.set(b.top, [...(rows.get(b.top) ?? []), b.height]);
  const pairs = [...rows.values()].filter(h => h.length > 1);
  expect(pairs.length, JSON.stringify(boxes)).toBeGreaterThan(0);
  for (const h of pairs) expect(Math.max(...h) - Math.min(...h), JSON.stringify(boxes)).toBeLessThanOrEqual(1);
});
