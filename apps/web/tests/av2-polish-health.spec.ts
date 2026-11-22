import {expect, test} from '@playwright/test';
import {foldMarker, go, noSideways, start} from './av2-polish-helpers';
import {axe, THEMES} from './p6-helpers';

/**
 * Session AV lane 2 (polish), Health:
 * - P-13: "A sip at a time." is said once on the Water card (the eyebrow no longer repeats it).
 * - P-14: a Showcase water entry made today shows no "12:00 AM" (it holds the day, not a moment).
 * - P-15: an empty meal starts its own entry ("Add to Breakfast") and shows no empty "—" chip.
 * - P-19: the view tabs are 44 px and fit one row at 1440.
 * - P-21: the sleep score's figures never split; its formula is folded ("How this is worked out").
 * - P-22: the latest five nights, then "Show all".
 * - P-23: the four ranges share one row.
 * - P-25: Workouts' switches are chips (outlined, the chosen one filled).
 * - P-22, the rest (polish 2): no empty band above a night's Edit and Delete; the last-7-days explanations fold.
 */
test.use({timezoneId: 'Europe/Amsterdam'});

test('the Water card says it once and shows no midnight time', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/health');
  const water = page.getByRole('region', {name: 'Water journal'});
  await expect(water).toBeVisible({timeout: 15_000});
  await expect(water.locator('.eyebrow').first()).not.toHaveText(/sip at a time/i);
  await expect(water.getByText('A sip at a time.')).toHaveCount(1);
  await expect(water).not.toContainText(/12:00\s?AM|00:00/);
});

for (const theme of THEMES) test(`${theme}: an empty meal offers its own first entry`, async ({page}) => {
  await start(page, {theme, width: 390, showcase: false});
  await go(page, '/app/health');
  const breakfast = page.getByRole('region', {name: 'Breakfast diary'});
  await expect(breakfast).toBeVisible({timeout: 15_000});
  await expect(breakfast.locator('.health-section-heading > span > span[aria-hidden="true"]')).toBeHidden();
  await expect(breakfast.getByText('No entry')).toHaveCount(1); // still read aloud
  const add = breakfast.getByRole('button', {name: 'Add to Breakfast'});
  await expect(add).toBeVisible();
  expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await add.click();
  await expect(page.locator('#health-entry-action, [role="dialog"]').filter({visible: true}).first()).toBeVisible();
  await noSideways(page);
});

test('Health views at 1440: 44 px tabs on one row', async ({page}) => {
  await start(page, {width: 1440});
  await go(page, '/app/health');
  const tabs = page.getByRole('tablist', {name: 'Health views'}).getByRole('tab');
  await expect(tabs.first()).toBeVisible({timeout: 15_000});
  const boxes = await tabs.evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return {top: Math.round(r.top), height: r.height}; }));
  for (const b of boxes) expect(b.height).toBeGreaterThanOrEqual(44);
  expect(new Set(boxes.map(b => b.top)).size, JSON.stringify(boxes)).toBe(1);
});

test('Sleep at 390: the score, five nights and one row of ranges', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/health?view=sleep');
  const score = page.getByRole('region', {name: 'Sleep score'});
  await expect(score).toBeVisible({timeout: 15_000});
  for (const b of await score.locator('.sleep-score-parts b').all()) expect((await b.boundingBox())!.height).toBeLessThanOrEqual(26);
  const how = score.locator('details.sleep-score-how');
  await expect(how).not.toHaveAttribute('open', '');
  await expect(score.locator('.sleep-score-formula')).toBeHidden();
  await how.locator('summary').click();
  await expect(score.locator('.sleep-score-formula')).toBeVisible();
  const recent = page.getByRole('region', {name: 'Recent nights and naps'});
  await expect(recent.locator('.sleep-nights > li')).toHaveCount(5);
  const all = recent.getByRole('button', {name: /^Show all \d+$/});
  await all.click();
  expect(await recent.locator('.sleep-nights > li').count()).toBeGreaterThan(5);
  await expect(recent.getByRole('button', {name: 'Show the latest five'})).toHaveAttribute('aria-expanded', 'true');
  const ranges = page.getByRole('group', {name: 'Range'}).getByRole('button');
  await expect(ranges).toHaveCount(4);
  expect(new Set(await ranges.evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)))).size).toBe(1);
  await noSideways(page);
});

/**
 * P-22, the rest (polish 2): no empty band above a night's Edit and Delete (the page's `.fine` margins and the actions' own
 * had added about 40 px), and "Your last 7 days" folds how each figure is worked out behind "What is this?" (the shared
 * fold marker), the figures and the short facts staying on the tiles.
 */
for (const theme of THEMES) test(`P-22 ${theme} 390: a night's buttons follow its lines; the tiles' explanations fold`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/health?view=sleep');
  const recent = page.getByRole('region', {name: 'Recent nights and naps'});
  await expect(recent.locator('.sleep-nights > li').first()).toBeVisible({timeout: 15_000});
  const gaps = await recent.locator('.sleep-nights > li').evaluateAll(items => items.map(li => {
    const words = [...li.querySelector(':scope > div:first-child')!.children].filter(e => e.getBoundingClientRect().height > 0);
    const actions = li.querySelector(':scope > .actions')!.getBoundingClientRect();
    return Math.round(actions.top - words[words.length - 1]!.getBoundingClientRect().bottom);
  }));
  expect(gaps.length).toBe(5);
  for (const gap of gaps) { expect(gap).toBeGreaterThanOrEqual(4); expect(gap).toBeLessThanOrEqual(16); }

  const week = page.getByRole('region', {name: 'Your last 7 days'});
  const folds = week.locator('dd.sleep-stat-how > details');
  // The Showcase has a goal and two weeks of nights: debt, balance and both consistencies explain themselves.
  await expect(folds).toHaveCount(4);
  for (const name of ['Sleep debt', 'Sleep balance', 'Bedtime consistency', 'Wake-time consistency']) {
    const summary = week.getByText(`What is this? (${name})`, {exact: true});
    await expect(summary).toBeVisible();
    expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await foldMarker(summary);
  }
  for (const text of ['minus time asleep', 'Every night is a fresh start', 'How much your bedtimes vary', 'How much your wake times vary']) await expect(week.getByText(text)).toBeHidden();
  // The figures and the short facts stay in view.
  await expect(week.getByText(/^Short nights only: /)).toBeVisible();
  await expect(week.getByText(/^\d+ nights? logged$/)).toBeVisible();
  const debt = week.locator('.sleep-stat-wide').filter({hasText: 'Sleep debt'});
  await debt.locator('summary').click();
  await expect(debt.locator('details')).toHaveAttribute('open', '');
  await foldMarker(debt.locator('summary'), true);
  await expect(debt.getByText(/minus time asleep, added up over the \d+ nights? you logged in the last 7 days/)).toBeVisible();
  const findings = await axe(page, week);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await noSideways(page);
});

test('P-22 at 1440: the tiles\' folds are 44 px rows; no margin band in a night\'s card', async ({page}) => {
  await start(page, {width: 1440});
  await go(page, '/app/health?view=sleep');
  const week = page.getByRole('region', {name: 'Your last 7 days'});
  await expect(week.locator('dd.sleep-stat-how summary').first()).toBeVisible({timeout: 15_000});
  for (const h of await week.locator('dd.sleep-stat-how summary').evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
  // No margin band under a night's last line or around its buttons (the `.fine` line had 12 px above and 20 px below).
  const bands = await page.getByRole('region', {name: 'Recent nights and naps'}).locator('.sleep-nights > li').evaluateAll(items => items.map(li => {
    const box = li.querySelector(':scope > div:first-child')!, lines = [...box.children].filter(e => e.getBoundingClientRect().height > 0), actions = li.querySelector(':scope > .actions')!;
    const cs = getComputedStyle(actions);
    return {under: Math.round(box.getBoundingClientRect().bottom - lines[lines.length - 1]!.getBoundingClientRect().bottom), around: parseFloat(cs.marginTop) + parseFloat(cs.marginBottom)};
  }));
  expect(bands.length).toBe(5);
  for (const band of bands) expect(band, JSON.stringify(band)).toEqual({under: 0, around: 0});
});

test('Workouts: the line switch is chips', async ({page}) => {
  await start(page, {width: 390});
  await go(page, '/app/health?view=workouts');
  const pick = page.locator('.workouts-weeks-pick').first();
  await expect(pick).toBeAttached({timeout: 15_000});
  for (const b of await pick.getByRole('button').evaluateAll(els => els.map(e => ({border: parseFloat(getComputedStyle(e).borderTopWidth), radius: parseFloat(getComputedStyle(e).borderTopLeftRadius)})))) { expect(b.border).toBeGreaterThanOrEqual(1); expect(b.radius).toBeGreaterThanOrEqual(12); }
});
