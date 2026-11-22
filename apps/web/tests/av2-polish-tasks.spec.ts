import {expect, test} from '@playwright/test';
import {go, noSideways, start} from './av2-polish-helpers';
import {THEMES} from './p6-helpers';

/**
 * Session AV lane 2 (polish), Tasks in the Showcase:
 * - P-4: on a phone the views (Inbox … Insights, Projects) stand above the list as wrapping chips, not 900 px below it;
 *   on a computer they keep the side column.
 * - P-7: This week's ← dates → stay on one row at 390 and 320.
 * - P-8: the Table says at its edge that it scrolls sideways.
 * - P-9: a view's inner heading adds what is new (the count, the dates); the view's name is said once on screen.
 * - P-10: the matrix's button reads as a move ("Move to …").
 * - P-37: the priority chips are 14 px.
 */
test.use({timezoneId: 'Europe/Amsterdam'});

for (const theme of THEMES) test(`${theme}: the views above the list on a phone, beside it on a computer`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/tasks');
  const nav = page.getByRole('navigation', {name: 'Task views'}), main = page.locator('.tasks-main');
  await expect(main).toBeVisible();
  const n = (await nav.boundingBox())!, m = (await main.boundingBox())!;
  expect(n.y + n.height, 'the views end above the list').toBeLessThanOrEqual(m.y + 1);
  expect(n.height, 'chips, not 20 full-width rows').toBeLessThanOrEqual(520);
  // Chips wrap: two views share a row.
  const tops = await nav.locator('.tasks-nav-item').evaluateAll(els => els.slice(0, 4).map(e => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBeLessThan(tops.length);
  for (const size of await page.locator('.task-chip').evaluateAll(els => els.map(e => parseFloat(getComputedStyle(e).fontSize)))) expect(size).toBeGreaterThanOrEqual(14);
  await noSideways(page);
  await page.setViewportSize({width: 1440, height: 900});
  const nd = (await nav.boundingBox())!, md = (await main.boundingBox())!;
  expect(nd.x + nd.width).toBeLessThanOrEqual(md.x + 1);
  expect(Math.abs(nd.y - md.y)).toBeLessThanOrEqual(40);
});

test('This week: ← and → on one row with the dates; the name said once', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/tasks?view=week');
  const head = page.locator('.tasks-week-nav');
  await expect(head).toBeVisible({timeout: 15_000});
  for (const width of [390, 320]) {
    await page.setViewportSize({width, height: 800});
    const before = (await head.getByRole('button', {name: 'The week before'}).boundingBox())!, after = (await head.getByRole('button', {name: 'The week after'}).boundingBox())!;
    expect(Math.abs(before.y - after.y), `${width}`).toBeLessThanOrEqual(2);
  }
  // "This week" is the list's own heading; here it is for screen readers only, and the dates are what is seen.
  await expect(head.locator('h3')).toHaveAccessibleName(/^This week · .+ – .+$/);
  await expect(head.locator('h3 > .sr-only')).toHaveText(/^\s*This week ·\s*$/);
  expect((await head.locator('h3 > .sr-only').boundingBox())!.width).toBeLessThanOrEqual(1);
});

test('Table: an edge cue while it scrolls sideways; its inner heading is the count', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/tasks?view=table');
  const frame = page.locator('.tasks-table-frame').first();
  await expect(frame).toBeVisible({timeout: 15_000});
  await expect(frame).toHaveAttribute('data-more-right', '');
  await frame.evaluate(el => { el.scrollLeft = el.scrollWidth; });
  await expect(frame).toHaveAttribute('data-more-left', '');
  const inner = page.locator('.tasks-plan-view h3').first();
  await expect(inner).toHaveAccessibleName(/^Table · \d+ open$/); // read aloud
  await expect(inner.locator(':scope > .sr-only')).toHaveText(/^\s*Table ·\s*$/); // seen: the count alone
  expect((await inner.locator(':scope > .sr-only').boundingBox())!.width).toBeLessThanOrEqual(1);
  await expect(inner.locator(':scope > small')).toHaveText(/^\d+ open$/);
});

test('Priority matrix: each button reads as a move', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/tasks?view=matrix');
  const moves = page.locator('.tasks-matrix-move');
  await expect(moves.first()).toBeVisible({timeout: 15_000});
  // Session AV lane 2 (fixb3c, deliberate): the button is a flex row, so innerText puts a line break between its words and
  // the arrow (a flex item) although both sit on one line. The same words are read from the text, and the arrow is
  // measured on the words' line and after them.
  for (const text of await moves.allTextContents()) expect(text.replace(/\s+/g, ' ').trim()).toMatch(/^Move to .+ →$/);
  for (const move of await moves.all()) {
    const m = await move.evaluate(el => {
      const arrowEl = el.querySelector(':scope > [aria-hidden="true"]')!, arrow = arrowEl.getBoundingClientRect(), range = document.createRange();
      range.setStart(el, 0); range.setEndBefore(arrowEl); // the words: every text before the arrow
      const rects = [...range.getClientRects()].filter(r => r.width), words = rects[rects.length - 1]!;
      return {arrowMid: arrow.top + arrow.height / 2, wordsTop: words.top, wordsBottom: words.bottom, arrowLeft: arrow.left, wordsRight: words.right};
    });
    expect(m.arrowMid, JSON.stringify(m)).toBeGreaterThanOrEqual(m.wordsTop);
    expect(m.arrowMid, JSON.stringify(m)).toBeLessThanOrEqual(m.wordsBottom);
    expect(m.arrowLeft, JSON.stringify(m)).toBeGreaterThanOrEqual(m.wordsRight);
  }
});
