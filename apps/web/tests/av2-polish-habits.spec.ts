import {expect, test, type Page} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';

/**
 * Session AV lane 2 (polish), Habits:
 * - P-28: every area chip is outlined (only the chosen one looked like a button).
 * - P-29: a step with its unit ("+1,000 steps") is set like Done beside it (14 px), not at 22 px.
 * - P-30: Routines' "Share or add" (and "Templates") read as buttons: outlined.
 * - P-31: a fresh device's "Today's rhythm" says "No habits yet", not "0 / 0 scheduled habits complete".
 * - P-27 (polish 2): Edit, ★ and ⋯ share the title's row (not a row of their own above it); on a computer a section's
 *   cards fill its row (a lone card took one of three fixed columns, leaving two empty).
 */
test.use({timezoneId: 'Europe/Amsterdam'});

test('Showcase: outlined chips, one type size in a completion row', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/habits');
  const chips = page.getByRole('group', {name: 'Filter by area'}).getByRole('button');
  await expect(chips.nth(1)).toBeVisible({timeout: 15_000});
  for (const width of await chips.evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).borderTopWidth)))) expect(width).toBeGreaterThanOrEqual(1);
  const amounts = page.locator('.habit-check-actions .habit-step-amount');
  await expect(amounts.first()).toBeAttached();
  for (const size of await amounts.evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).fontSize)))) expect(size).toBe(14);
  const share = page.locator('.habit-routines').getByRole('button', {name: 'Share or add'});
  await expect(share).toBeAttached();
  expect(await share.evaluate(e => parseFloat(getComputedStyle(e).borderTopWidth))).toBeGreaterThanOrEqual(1);
  await noSideways(page);
});

test('a fresh device: Today\'s rhythm says there is no habit yet', async ({page}) => {
  await start(page, {width: 390, showcase: false});
  await go(page, '/app/habits');
  const overview = page.getByRole('region', {name: 'Today’s habit progress'});
  await expect(overview).toBeVisible({timeout: 15_000});
  await expect(overview).toContainText('No habits yet');
  await expect(overview).not.toContainText('scheduled habits complete');
});

/** Per card: the title and Edit on one row (each one's middle inside the other's box), the title left of Edit, ⋯ after Edit, the eyebrow above them. */
async function titleRows(page: Page) {
  return page.locator('.habits-workspace .habit-grid > .habit-card').evaluateAll(cards => cards.map(card => {
    const h = card.querySelector('.habit-card-heading h2')!.getBoundingClientRect(), edit = card.querySelector('.habit-card-heading > button')!.getBoundingClientRect();
    const more = card.querySelector('.habit-card-heading > .pin-to-today')!.getBoundingClientRect(), eyebrow = card.querySelector('.habit-card-heading .eyebrow')!.getBoundingClientRect();
    const mid = (r: DOMRect) => (r.top + r.bottom) / 2;
    return {title: card.querySelector('h2')!.textContent, sameRow: mid(edit) >= h.top - 1 && mid(edit) <= h.bottom + 1 && mid(h) >= edit.top - 1 && mid(h) <= edit.bottom + 1,
      leftOfEdit: h.right <= edit.left + 1, moreAfter: more.left >= edit.right - 1 && Math.abs(mid(more) - mid(edit)) <= 2, eyebrowAbove: eyebrow.bottom <= Math.min(h.top, edit.top) + 1};
  }));
}

for (const width of [390, 1440])
  test(`P-27 at ${width} px: a habit card's actions share its title's row`, async ({page}) => {
    await start(page, {width});
    await go(page, '/app/habits');
    await expect(page.locator('.habits-workspace .habit-grid > .habit-card').first()).toBeVisible({timeout: 15_000});
    const rows = await titleRows(page);
    expect(rows.length).toBeGreaterThan(2);
    for (const row of rows) expect(row, JSON.stringify(row)).toMatchObject({sameRow: true, leftOfEdit: true, moreAfter: true, eyebrowAbove: true});
    await noSideways(page);
  });

for (const theme of ['nebula', 'light', 'dark'] as const)
  test(`P-27 at 1440 px (${theme}): a section's cards fill its row, a lone card takes it whole`, async ({page}) => {
    await start(page, {width: 1440, theme});
    await go(page, '/app/habits');
    await expect(page.locator('.habits-workspace .habit-grid > .habit-card').first()).toBeVisible({timeout: 15_000});
    const grids = await page.locator('.habits-workspace .habit-grid').evaluateAll(gs => gs.map(g => {
      const box = g.getBoundingClientRect(), cards = [...g.querySelectorAll(':scope > .habit-card')].map(c => c.getBoundingClientRect());
      const cadence = [...g.querySelectorAll(':scope > .habit-card > .habit-cadence')].map(c => c.getBoundingClientRect().width);
      return {width: box.width, count: cards.length, filled: cards.length ? Math.max(...cards.map(c => c.right)) - Math.min(...cards.map(c => c.left)) : 0, widest: Math.max(0, ...cadence)};
    }));
    const lone = grids.filter(g => g.count === 1), pairs = grids.filter(g => g.count === 2);
    expect(lone.length).toBeGreaterThan(0); // the Showcase's Afternoon holds one habit (Walk)
    expect(pairs.length).toBeGreaterThan(0);
    for (const g of [...lone, ...pairs]) expect(g.filled, JSON.stringify(g)).toBeGreaterThanOrEqual(g.width - 2);
    for (const g of grids) expect(g.widest, JSON.stringify(g)).toBeLessThanOrEqual(441);
    // The lone card: today's controls and its 28 days stand beside its words (right of its first third), Details under both.
    const m = await page.locator('.habits-workspace .habit-grid > .habit-card:only-child').first().evaluate(card => ({
      left: card.getBoundingClientRect().left, width: card.getBoundingClientRect().width,
      controls: card.querySelector(':scope > .habit-completion, :scope > .habit-status')!.getBoundingClientRect().left,
      cadence: card.querySelector(':scope > .habit-cadence')!.getBoundingClientRect(), more: card.querySelector(':scope > .habit-more')!.getBoundingClientRect().top}));
    expect(m.controls, JSON.stringify(m)).toBeGreaterThan(m.left + m.width / 3);
    expect(m.cadence.left, JSON.stringify(m)).toBeGreaterThan(m.left + m.width / 3);
    expect(m.more, JSON.stringify(m)).toBeGreaterThanOrEqual(m.cadence.bottom - 1);
  });
