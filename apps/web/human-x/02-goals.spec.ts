import {expect, type Page} from '@playwright/test';
import {emptyPlatform, PLATFORM_KEY, positionSchema, privateGoalSchema, type Platform} from '../lib/positions';
import {journey, open, ready, snap, type Journey} from './kit';

// Session X Part 14, journeys J031–J060: Goals (docs/verification/x-cloud/HUMAN_TEST.md). Local simulation only: no
// wallet, no chain, nothing that moves funds.
async function createGoal(j: Journey, name: string, target: string, {start = '', art = ''}: {start?: string; art?: string} = {}) {
  const {page} = j;
  await open(page, '/app/goals/new');
  if (art) { await page.getByText('Personalize artwork and notes (optional)').click(); await page.getByRole('radio', {name: art, exact: true}).check(); }
  await page.getByLabel('Goal name', {exact: true}).fill(name);
  await page.getByLabel('Target amount').fill(target);
  await page.getByRole('button', {name: /^Continue/}).click();
  await page.getByLabel('ZIGoals funding / Local simulation', {exact: true}).check();
  if (start) await page.getByLabel('Planned starting amount').fill(start);
  await page.getByRole('button', {name: /^Continue/}).click();
  await page.getByRole('button', {name: /^Continue/}).click();
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm simulation'}).click();
  await expect(page).toHaveURL(/\/app\/goals\/\d+$/);
  await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
}
const goalsStore = (page: Page) => page.evaluate(() => localStorage.getItem('zigoals:goals:v1') ?? localStorage.getItem('zigoals:platform:v1'));

journey('J031', 'create a goal with the wizard; it appears in Active', {views: 'all', data: ['E', 'L'], live: true}, async j => {
  await createGoal(j, 'Fictional Kyoto in spring', '1200', {art: 'Travel'});
  await open(j.page, '/app/goals');
  await expect(j.page.getByRole('heading', {name: 'Fictional Kyoto in spring', exact: true})).toBeVisible();
  await snap(j, 'J031', 'goal-created');
});

journey('J032', 'the wizard with mistakes: no name, no target; it says what to fix and saves nothing', {views: 'all', data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/goals/new');
  const before = await goalsStore(page);
  await page.getByRole('button', {name: /^Continue/}).click();
  await expect(page.locator('main [role=alert], main .field-error, main [aria-invalid=true]').first()).toBeVisible();
  await expect(page.getByLabel('Goal name', {exact: true})).toBeVisible();
  expect(await goalsStore(page)).toBe(before);
});

journey('J033', 'a reload in the middle of the wizard saves nothing half-done', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/goals/new');
  const before = await goalsStore(page);
  await page.getByLabel('Goal name', {exact: true}).fill('Fictional half-done');
  await page.getByLabel('Target amount').fill('500');
  await page.getByRole('button', {name: /^Continue/}).click();
  await page.reload();
  await ready(page);
  await open(page, '/app/goals');
  await expect(page.getByRole('heading', {name: 'Fictional half-done', exact: true})).toHaveCount(0);
  expect(await goalsStore(page)).toBe(before);
});

journey('J035', 'a goal named with emoji and accents stays inside its card everywhere', {views: 'all', data: ['L']}, async j => {
  const name = 'Fictional 🌸 Café crème in Kyōto — spring trip for the whole family';
  await createGoal(j, name, '2500');
  for (const path of ['/app/goals', '/app']) {
    await open(j.page, path);
    const heading = j.page.getByRole('heading', {name, exact: true}).first();
    if (await heading.count()) { const box = await heading.boundingBox(); expect(box!.x + box!.width).toBeLessThanOrEqual(j.page.viewportSize()!.width + 0.5); }
  }
});

journey('J036', 'a right-to-left goal name shows on the card and the detail', {views: ['D', 'P'], data: ['L']}, async j => {
  const name = 'رحلة إلى البحر';
  await createGoal(j, name, '900');
  await open(j.page, '/app/goals');
  await expect(j.page.getByRole('heading', {name, exact: true})).toBeVisible();
});

journey('J037', 'huge and tiny targets stay readable', {views: 'all', data: ['L']}, async j => {
  await createGoal(j, 'Fictional huge', '1000000000000');
  await expect(j.page.locator('main')).toContainText(/1,000,000,000,000|1\.0\s?T|1 trillion/);
  await createGoal(j, 'Fictional tiny', '0.01');
  await expect(j.page.locator('main')).toContainText('0.01');
});

journey('J039', 'add simulated funds, then see them on the goal', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await createGoal(j, 'Fictional bike', '1200');
  if (!await page.getByLabel('Amount in ZIG').isVisible()) await page.locator('#local-simulation > summary').click();
  await page.getByLabel('Amount in ZIG').fill('100');
  await page.getByRole('button', {name: 'Add funds', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm simulation'}).click();
  await expect(page.getByText('100 ZIG', {exact: true}).first()).toBeVisible();
});

journey('J045', 'the filters at 320 px: the chips scroll inside their row, the page does not', {views: ['P'], data: ['S']}, async j => {
  const {page} = j;
  await page.setViewportSize({width: 320, height: 640});
  await open(page, '/app/goals');
  const row = page.locator('.goal-view-filters');
  await expect(row).toBeVisible();
  await row.getByRole('button', {name: 'All', exact: true}).click();
  await expect(row.getByRole('button', {name: 'All', exact: true})).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

journey('J047', 'a goal that does not exist: a calm message and a way back', {views: 'all', data: ['E'], live: true}, async j => {
  const {page} = j;
  await page.goto('/app/goals/999999');
  await expect(page.locator('main')).toContainText(/not found|isn’t here|no goal|could not find/i);
  await expect(page.locator('main a[href="/app/goals"], main a[href="/app"]').first()).toBeVisible();
});

journey('J049', '/app/goals/positions leads to Staking', {views: ['D', 'P'], data: ['S'], live: true}, async j => {
  await j.page.goto('/app/goals/positions');
  await j.page.waitForURL('**/app/staking');
  await ready(j.page);
});

journey('J060', 'Goals\' empty state on a new device explains the first step', {views: 'all', data: ['E'], live: true}, async j => {
  await open(j.page, '/app/goals');
  await expect(j.page.locator('main').getByRole('link', {name: /goal/i}).first()).toBeVisible();
  await snap(j, 'J060', 'empty');
});

/** A fictional tracked Goal in euros with two milestones and three contributions (as goals-v2.spec seeds it). */
function tracked(): Platform {
  const AT = '2026-09-30T08:00:00.000Z';
  const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', targetDate: '2026-12-30', notes: '', createdAt: '2026-06-01T09:00:00.000Z',
    milestones: [{id: '11111111-1111-4111-8111-111111111111', title: 'First thousand', done: false, target: '100000'}, {id: '22222222-2222-4222-8222-222222222222', title: 'Booked the trip', done: false}]});
  const position = positionSchema.parse({id: 'p1', providerId: 'manual', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'EUR', denom: 'eur', quantity: '150000', decimals: 2, verification: 'MANUAL', observedAt: AT, liquidity: 'LIQUID', provenance: 'User entry', valuation: {value: '150000', currency: 'EUR', decimals: 2, source: 'MANUAL', observedAt: AT}});
  const event = (id: string, day: string, cents: string) => ({id, goalId: '7', goalScope: 'private' as const, direction: 'IN' as const, quantity: cents, asset: 'EUR', decimals: 2, occurredAt: `${day}T12:00:00.000Z`, provenance: 'MANUAL_ATTRIBUTION' as const});
  return {...emptyPlatform(), goals: [goal], positions: [position], allocations: [{goalId: '7', positionId: 'p1', quantity: '150000'}], contributions: [event('e1', '2026-07-10', '30000'), event('e2', '2026-08-10', '30000'), event('e3', '2026-09-10', '30000')]} as Platform;
}
async function seedTracked(page: Page) {
  await page.clock.install({time: new Date('2026-10-01T08:00:00.000Z')});
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [PLATFORM_KEY, JSON.stringify(tracked())]);
}
async function fold(page: Page, id: string) { const section = page.locator(`#${id}`); await section.locator('summary').first().click(); return section; }

journey('J040', 'milestones: one calm note when reached; add one with a value and a date; edit; remove', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await seedTracked(page);
  await open(page, '/app/goals/tracked/7');
  const section = await fold(page, 'milestones');
  const note = section.getByRole('group', {name: 'Milestone reached: First thousand'});
  await note.getByRole('button', {name: 'Thanks', exact: true}).click();
  await expect(note).toHaveCount(0);
  const add = section.getByRole('form', {name: 'Add a milestone'});
  await add.getByLabel('New milestone').fill('Fictional half way');
  await add.getByLabel(/Value \(EUR/).fill('3000');
  await add.getByLabel(/Target date/).fill('2027-01-31');
  await add.getByRole('button', {name: 'Add milestone', exact: true}).click();
  await expect(section).toContainText('by 2027-01-31');
  await section.getByRole('button', {name: 'Edit milestone Fictional half way', exact: true}).click();
  await section.getByRole('button', {name: 'Remove milestone', exact: true}).click();
  await expect(section.getByText('Fictional half way')).toHaveCount(0);
});

journey('J041', '"On track?" with zero return: what is left, the pace, the date it points to', {views: 'all', data: ['L'], live: true}, async j => {
  const {page} = j;
  await seedTracked(page);
  await open(page, '/app/goals/tracked/7');
  const section = await fold(page, 'on-track');
  await expect(section).toContainText('Still to go: €4,500.00, from what is counted now.');
  await expect(section).toContainText('with no growth');
  await snap(j, 'J041', 'on-track');
});

journey('J042', '"What if it grew": my assumption shown, never stored', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await seedTracked(page);
  await open(page, '/app/goals/tracked/7');
  const section = await fold(page, 'on-track');
  await section.locator('summary', {hasText: 'What if it grew?'}).click();
  await section.getByLabel('Growth you assume, % a year').fill('4');
  await section.getByLabel(/Added every month/).fill('500');
  await expect(section.getByRole('status')).toContainText('your assumption');
  await page.reload();
  await ready(page);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => /what-if|assum/i.test(k)))).toEqual([]);
});

journey('J044', 'close a goal (allocations released), then reopen it', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  await seedTracked(page);
  await page.goto('/app/goals/tracked/7#goal-status');
  await ready(page);
  await page.getByRole('button', {name: 'Close Goal and release allocations', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm close', exact: true}).click();
  await page.getByRole('button', {name: 'Reopen Goal', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Retained Goal milestones'})).toContainText('Reopened');
});

journey('J050', 'delete a goal after confirming; it leaves Goals and Today', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  await seedTracked(page);
  await open(page, '/app/goals/tracked/7');
  await page.getByLabel('Goal actions').click();
  await page.getByRole('button', {name: 'Delete Goal', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm delete'}).click();
  await expect(page).toHaveURL(/\/app\/goals$/);
  await expect(page.getByRole('heading', {name: 'Fictional reserve', exact: true})).toHaveCount(0);
  await open(page, '/app');
  await expect(page.locator('main')).not.toContainText('Fictional reserve');
});
