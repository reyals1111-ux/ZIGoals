import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {emptyPlatform, privateGoalSchema, type Platform} from '../lib/positions';
import {fundGoal} from '../lib/contribution-funding';
import {newOwnUnitPosition} from '../lib/goals/goal-units';
import {GOAL_REPEAT_KEY} from '../lib/goals/repeat';

/**
 * Session AW (X4, Strides; LEDGER #446, #447), at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll
 * at 320. Fictional data; the API offline.
 * - #447: "Read 2 books a month" starts again each month. Seeded in October with its repeat on; opening its page in
 *   November turns the month: the ring counts November only, October stays as a row ("2 of 2 books · reached"); the
 *   choice changes to Each week with Undo. Kept in `zigoals:goal-repeat:v1`.
 * - #446: the Life review's "This year" and "All time" (Showcase): habits done of due and their longest runs, goals start
 *   → end, by life area; never stored as the review's period (a reload shows the week or month again). A fresh device's
 *   year teaches where it fills.
 */
test.use({timezoneId: 'UTC'});
const E = 10n ** 18n;
const NOW = '2026-11-25T09:00:00.000Z';
function readingPlatform(): Platform {
  const goal = privateGoalSchema.parse({id: '71', name: 'Read 2 books a month', type: 'QUANTITY', status: 'active', asset: 'books', denom: 'manual:books', decimals: 18, target: (2n * E).toString(), notes: '', createdAt: '2026-10-01T10:00:00.000Z', milestones: []});
  let p: Platform = {...emptyPlatform(), goals: [goal]};
  const add = (day: string, n: bigint, id: string) => { const pos = p.positions.find(x => x.denom === 'manual:books'); p = fundGoal(p, {id, goalId: '71', ...(pos ? {positionId: pos.id} : {newPosition: newOwnUnitPosition(goal, 'own-books', `${day}T12:00:00.000Z`)}), quantity: (n * E).toString(), occurredAt: `${day}T12:00:00.000Z`}, [], Date.parse(`${day}T12:00:00.000Z`)); };
  add('2026-10-05', 1n, 'c1'); add('2026-10-20', 1n, 'c2'); add('2026-11-10', 1n, 'c3');
  return p;
}
const repeatRecord = {version: 1, goals: {'71': {every: 'month', since: '2026-10-01', period: 'month:2026-10', setAt: '2026-10-01T10:00:00.000Z'}}};
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {goals: Record<string, {every: string; period: string}>} | null, GOAL_REPEAT_KEY);
const counted = (page: Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:platform:v1') ?? '{}') as {allocations?: {goalId: string; quantity: string}[]}).allocations?.find(a => a.goalId === '71')?.quantity ?? '0');
async function noSideways(page: Page) {
  await page.setViewportSize({width: 320, height: 800});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
}

for (const theme of THEMES) test(`${theme}: a goal that starts again each month keeps October as a row`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date(NOW)});
  await offlineApi(page);
  await freshDevice(page);
  await page.evaluate(([platform, repeat, key]) => { localStorage.setItem('zigoals:platform:v1', platform); localStorage.setItem(key, repeat); }, [JSON.stringify(readingPlatform()), JSON.stringify(repeatRecord), GOAL_REPEAT_KEY] as const);
  await page.goto('/app/goals/tracked/71'); await hydrated(page);
  // The turn to November: the count toward the goal is November's one book; October's two stay in the history.
  await expect.poll(() => stored(page).then(r => r?.goals['71']?.period)).toBe('month:2026-11');
  await expect.poll(() => counted(page)).toBe(E.toString());
  const fold = page.locator('#repeat');
  await expect(fold.locator('summary')).toContainText('Each month · earlier periods kept as a row');
  await fold.locator('summary').click();
  await expect(fold.getByText('This month:')).toBeVisible();
  await expect(fold).toContainText('This month: 1 of 2 books');
  const rows = fold.getByRole('list', {name: 'Earlier periods'});
  await expect(rows.getByRole('listitem')).toHaveCount(1);
  await expect(rows.getByRole('listitem').first()).toContainText('2 of 2 books · reached');
  await expect(fold).toContainText('Reached in 1 of 1 earlier month');
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  // Each week instead, with Undo back to each month.
  const choice = fold.getByRole('group', {name: 'How often it starts again'});
  await expect(choice.getByRole('radio', {name: 'Each month'})).toBeChecked();
  await choice.getByRole('radio', {name: 'Each week'}).check();
  await fold.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(() => stored(page).then(r => r?.goals['71']?.every)).toBe('week');
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(() => stored(page).then(r => r?.goals['71']?.every)).toBe('month');
  // Off: the goal keeps counting from here; nothing in the goal itself changes.
  await choice.getByRole('radio', {name: 'Off · keeps counting'}).check();
  await fold.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(() => stored(page).then(r => Object.keys(r?.goals ?? {}))).toEqual([]);
  await expect(fold).toContainText('Off. A goal like');
  await expect.poll(() => counted(page)).toBe(E.toString());
  await noSideways(page);
});

test('a savings goal has no "Starts again"', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/goals/tracked/9201'); await hydrated(page);
  await expect(page.locator('#contribution-plan')).toBeVisible();
  await expect(page.locator('#repeat')).toHaveCount(0);
});

for (const theme of THEMES) test(`${theme}: the Life review's year and all time, by life area`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/review'); await hydrated(page);
  const period = page.getByRole('group', {name: 'Review period'});
  await period.getByRole('button', {name: 'This year'}).click();
  await expect(period.getByRole('button', {name: 'This year'})).toHaveAttribute('aria-pressed', 'true');
  const year = page.getByRole('region', {name: 'Your year'});
  await expect(year).toBeVisible();
  await expect(year.getByRole('definition').first()).toHaveText(/^[\d,]+$/);
  await expect(year).toContainText('never a grade');
  // Each life area is its own section, its habits as "N of M done", its goals start → end.
  const areas = page.locator('section.life-year-area');
  await expect(areas.first()).toBeVisible();
  await expect(page.getByRole('list', {name: /^Habits in /}).first().getByRole('listitem').first()).toContainText(/\d+ of \d+ done|Not due in this period/);
  await expect(page.getByRole('list', {name: /^Goals in /}).first().getByRole('listitem').first()).toContainText(/→ .+ of its target|not recorded/);
  await expect(page.locator('.life-year')).not.toContainText(/\bfailed\b|\bbehind\b|\bgrade [A-F]\b/i);
  const findings = await axe(page, page.locator('.life-year'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);

  await period.getByRole('button', {name: 'All time'}).click();
  await expect(page.getByRole('region', {name: 'All time'})).toBeVisible();
  // The year and all time are never the stored period: a reload shows the week or the month again.
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('group', {name: 'Review period'}).getByRole('button', {name: 'This year'})).toHaveAttribute('aria-pressed', 'false');
  await noSideways(page);
});

test('a fresh device: the year teaches where it fills', async ({page}) => {
  await page.clock.install({time: new Date(NOW)});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/review'); await hydrated(page);
  await page.getByRole('group', {name: 'Review period'}).getByRole('button', {name: 'This year'}).click();
  await expect(page.getByRole('heading', {name: 'Nothing to count yet for 2026.'})).toBeVisible();
  await expect(page.getByRole('link', {name: 'Open Habits'})).toHaveAttribute('href', '/app/habits');
  // Motion Off: the report adds no movement of its own.
  await page.emulateMedia({reducedMotion: 'reduce'});
  expect(await page.locator('.life-year *').evaluateAll(els => els.filter(e => getComputedStyle(e).animationName !== 'none').length)).toBe(0);
});
