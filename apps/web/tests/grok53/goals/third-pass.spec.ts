import {expect, test, type Page} from '@playwright/test';
import {AT, goal, seedGoals, stored, openModule} from './goal-fixtures';
import {HABITS_KEY, createHabit, emptyHabitData} from '../../../lib/habits';
import {ACCOUNTS_KEY} from '../../../lib/w-device-keys';
import {DEBT_PLANNER_KEY} from '../../../lib/debt-planner/store';

// Session AL third pass (lane L4): cross-lane asks and competitor rows closed in Goals and Activity, in the bots'
// conditions (fresh profile, desktop 1920 unless the bot used another width; the clock fixed where a day matters).
test.use({viewport: {width: 1920, height: 1080}, timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await page.clock.setFixedTime(new Date('2026-11-05T10:00:00+01:00')); });

const manual = (over: Record<string, unknown>) => ({providerId: 'Fictional asset', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'USD', quantity: '100000', decimals: 2, verification: 'MANUAL', sync: 'MANUAL', liquidity: 'LIQUID', observedAt: AT, provenance: 'User entry', ...over});
/** A habits record with one habit, made by Habits' own createHabit (so it is always a valid record). */
const oneHabit = (id: string, title: string) => JSON.stringify(createHabit(emptyHabitData(), {title, category: 'Mind', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}}, new Date('2026-10-01T08:00:00Z'), id));
async function seedKey(page: Page, key: string, value: string, path: string) {
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [key, value]);
  await page.goto(path);
}

test('TK-176 (P-TK-49): a target of a billion or more asks "check this?" once, in the wizard and in Edit details', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  await page.getByLabel('Goal name').fill('Fictional huge goal');
  await page.getByPlaceholder(/Your amount in/).fill('999999999999');
  await page.getByRole('button', {name: 'Create goal'}).first().click();
  const check = page.locator('.plausible-check');
  await expect(check).toContainText('is more than a billion — unusually large for a goal');
  expect((await stored(page))?.goals ?? []).toHaveLength(0);
  await check.getByRole('button', {name: 'Keep this amount'}).click();
  await page.waitForURL('**/app/goals/tracked/**');
  expect((await stored(page)).goals).toHaveLength(1);
  // Edit details: the same tier, only for a changed target.
  const edit = await openModule(page, 'edit-goal');
  await edit.getByLabel('Edit target').fill('5000000000');
  await edit.getByRole('button', {name: /Save Goal details/i}).click();
  await expect(edit.locator('.plausible-check')).toContainText('more than a billion');
  await edit.getByRole('button', {name: 'Keep this amount'}).click();
  await expect.poll(async () => (await stored(page)).goals[0]!.target).toBe('500000000000');
});

test('N-BN-19, BN-140 (P-BN-24): the date has a year bound; a pasted long name says what was left out', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  await expect(page.getByLabel('Target date (optional)')).toHaveAttribute('max', '2126-12-31');
  const name = page.getByLabel('Goal name');
  await name.focus();
  await page.evaluate(() => { const el = document.activeElement as HTMLInputElement; const data = new DataTransfer(); data.setData('text/plain', `Berlin test ${'x'.repeat(288)}`); el.dispatchEvent(new ClipboardEvent('paste', {clipboardData: data, bubbles: true, cancelable: true})); });
  await expect(page.getByText('Names hold up to 80 characters; the last 220 were left out.')).toBeVisible();
});

test('BN-155, N-BN-20 (P-BN-60): a reload brings back the step and the weekly-review tick', async ({page}) => {
  await seedGoals(page, [], '/app/goals/new');
  await page.getByLabel('Goal name').fill('Fictional trip');
  await page.getByPlaceholder(/Your amount in/).fill('2000');
  await page.getByRole('button', {name: 'Continue →'}).click();
  await page.getByRole('button', {name: 'Continue →'}).click();
  await page.getByLabel('Add a weekly review habit for this Goal (Mondays)').check();
  page.once('dialog', d => void d.accept());
  await page.reload();
  await expect(page.getByText('Step 3 of 4')).toBeVisible();
  // Session AL (BN-155, deliberate): the restored line reads "Draft restored · Discard".
  await expect(page.locator('.wizard-draft-back')).toHaveText('Draft restored · Discard');
  await expect(page.getByLabel('Add a weekly review habit for this Goal (Mondays)')).toBeChecked();
});

test('TK-144, TK-194 (P-TK-51): a count goal offers the units already held, and each source says what is free', async ({page}) => {
  const btc = manual({id: 'btc', providerId: 'Bitcoin', asset: 'BTC', denom: 'manual:BTC', decimals: 18, quantity: '500000000000000000', assetClass: 'Crypto'});
  await seedGoals(page, [], '/app/goals/new', {positions: [btc]} as never);
  await page.getByLabel('Goal name').fill('Fictional BTC stack');
  await page.getByRole('radio', {name: 'Reach a number of something'}).check();
  await page.getByRole('radio', {name: /BTC · Bitcoin/}).check();
  await expect(page.getByRole('radio', {name: /Available 0\.5 BTC/})).toBeVisible();
  await page.getByPlaceholder('Your number').fill('50');
  await page.getByRole('button', {name: 'Count it toward this goal'}).click();
  await expect(page.getByText(/Counting 0\.5 BTC from Bitcoin when you create the goal/)).toBeVisible();
  await page.getByRole('button', {name: 'Create goal'}).first().click();
  await page.waitForURL('**/app/goals/tracked/**');
  expect((await stored(page)).allocations).toEqual([expect.objectContaining({positionId: 'btc', quantity: '500000000000000000'})]);
});

test('MO-145, MO-160 (P-MO-95): a EUR goal counted from a USD asset says why it has no value', async ({page}) => {
  const watch = manual({id: 'watch', providerId: 'B7 Test Watch', asset: 'UNIT', denom: 'manual:UNIT', decimals: 0, quantity: '11', assetClass: 'Custom', valuation: {value: '125000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: AT}});
  await seedGoals(page, [goal('81', {name: 'Fictional emergency fund', asset: 'EUR', denom: 'EUR', target: '500000'})], '/app/goals', {positions: [watch], allocations: [{goalId: '81', positionId: 'watch', quantity: '5'}]} as never);
  await expect(page.locator('.goal-card').first()).toContainText('Funded in USD; this goal is in EUR. ZIGoals does not convert');
  await page.goto('/app/goals/tracked/81');
  await expect(page.locator('.goal-detail-progress')).toContainText('Funded in USD; this goal is in EUR');
});

test('TK-196 (P-TK-60): an archived asset that counted leaves a note and a review flag until marked reviewed', async ({page}) => {
  const two = manual({id: 'two', providerId: 'Savings Two', asset: 'EUR', denom: 'EUR', quantity: '300000', assetClass: 'Cash', archivedAt: '2026-11-04T09:30:00.000Z', valuation: {value: '300000', currency: 'EUR', decimals: 2, source: 'MANUAL', observedAt: AT}});
  const snap = {id: 'v1', goalId: '82', kind: 'valuation', capturedAt: '2026-11-04T09:10:00.000Z', current: '300000', target: '800000', asset: 'EUR', decimals: 2, actualContributed: '0', rewardIncome: '0', planned: '0', requiresReview: false, evidence: [{positionId: 'two', quantity: '300000', counted: '300000'}]};
  await seedGoals(page, [goal('82', {name: 'Fictional value goal', asset: 'EUR', denom: 'EUR', target: '800000'})], '/app/goals/tracked/82', {positions: [two], goalHistory: [snap]} as never);
  const note = page.locator('.goal-released');
  await expect(note).toContainText('Savings Two was archived on');
  await expect(note).toContainText('it had counted €3,000.00 toward this goal');
  await expect(page.locator('.goal-detail-heading .badge')).toHaveText('Needs review');
  await note.getByRole('button', {name: 'Mark as reviewed'}).click();
  await expect(page.locator('.goal-released')).toHaveCount(0);
});

test('MO-126 (P-MO-91): a habit the person already has can be linked from the goal page, with Undo', async ({page}) => {
  await seedGoals(page, [goal('83', {name: 'Fictional calm goal'})], '/app/settings');
  await seedKey(page, HABITS_KEY, oneHabit('11111111-1111-4111-8111-111111111111', 'Meditate'), '/app/goals/tracked/83');
  const panel = await openModule(page, 'supporting-habits');
  await panel.getByLabel('Link a habit you already have').selectOption({label: 'Meditate'});
  await panel.getByRole('button', {name: 'Link habit'}).click();
  await expect(panel.getByRole('heading', {name: 'Meditate'})).toBeVisible();
  const linked = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).habits[0].goalLink, HABITS_KEY);
  expect(linked).toEqual({chainId: 'private', owner: 'local', goalId: '83'});
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).habits[0].goalLink ?? null, HABITS_KEY)).toBeNull();
});

test('P-DVR-88 (N-166, G-009): a rewards goal opens Record contribution on history, and says why Fund is off', async ({page}) => {
  await seedGoals(page, [goal('84', {name: 'Fictional rewards goal', type: 'REWARD', asset: 'ZIG', denom: 'azig', decimals: 18, network: 'zigchain-1', target: '1000000000000000000'})], '/app/goals/tracked/84');
  await page.getByRole('button', {name: 'Record contribution'}).first().click();
  await expect(page.getByRole('button', {name: 'Fund Goal'})).toBeDisabled();
  await expect(page.getByText('A rewards goal counts the unclaimed rewards you allocate to it from Staking')).toBeVisible();
});

test('BUG-064 (P-DVR-35): search and sort appear from four goals, not only past 24', async ({page}) => {
  await seedGoals(page, ['Zeta', 'Alpha', 'Mid', 'Beta'].map((n, i) => goal(String(90 + i), {name: `Fictional ${n}`, target: String((i + 1) * 10000)})), '/app/goals');
  await page.getByLabel('Search Goals', {exact: true}).fill('beta');
  await expect(page.locator('.goal-card')).toHaveCount(1);
  await page.getByLabel('Search Goals', {exact: true}).fill('');
  await page.getByLabel('Sort Goals', {exact: true}).selectOption('name-asc');
  await expect(page.locator('.goal-card').first()).toContainText('Fictional Alpha');
});

test('DV-181, DV-083b (P-DV-39): the weight template and idea open the Health goal form', async ({page}) => {
  await seedGoals(page, [], '/app/goals/templates');
  const use = page.getByRole('link', {name: /Use the template: Lose 5 kg/});
  await expect(use).toHaveAttribute('href', '/app/goals?health-goal=weight#goals-health');
  await use.click();
  await expect(page.getByRole('heading', {name: 'New health goal'})).toBeVisible();
});

test('GAP-115 (P-DV-64): a goal moves under another from the Tree with the keyboard path, with Undo', async ({page}) => {
  await seedGoals(page, [goal('95', {name: 'Fictional year goal'}), goal('96', {name: 'Fictional month goal'})], '/app/goals?view=tree');
  await page.locator('summary[aria-label="Change where Fictional month goal sits"]').click();
  await page.locator('details.goal-tree-edit[open]').getByLabel('Put under').selectOption({label: 'Fictional year goal'});
  await expect(page.getByText('Fictional month goal is now under Fictional year goal.')).toBeVisible();
  await expect(page.locator('.goal-tree-count')).toHaveText('1');
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect(page.locator('.goal-tree-count')).toHaveCount(0);
});

test('GAP-119 (P-DVG-06): a tracked debt with its rate and minimum shows on Goals as a goal to reach zero', async ({page}) => {
  await seedGoals(page, [], '/app/settings');
  const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa0';
  await page.evaluate(([k, v, pk, pv]) => { localStorage.setItem(k!, v!); localStorage.setItem(pk!, pv!); }, [ACCOUNTS_KEY, JSON.stringify({version: 1, items: [{id, kind: 'loan', name: 'Fictional car loan', currency: 'USD', ratePercent: '5.9', payments: [], createdAt: AT, updatedAt: AT, snapshots: [{id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', date: '2026-01-01', value: '980000', decimals: 2}, {id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', date: '2026-11-01', value: '691100', decimals: 2}]}]}), DEBT_PLANNER_KEY, JSON.stringify({version: 1, extra: '100', debts: {[id]: {minimum: '280'}}})]);
  await page.goto('/app/goals');
  const card = page.getByRole('region', {name: 'Paying down debts'});
  await expect(card).toContainText('Fictional car loan');
  await expect(card).toContainText('paid down since');
  await expect(card).toContainText(/Paid off by .* \(projection\)/);
  await expect(card).toContainText('Not advice.');
});

test('GAP-124/122/125, DV-172 (P-DVG-13/11/14, P-DV-73): Activity has a report by period; the footer lists less as excluded', async ({page}) => {
  await seedGoals(page, [goal('97', {name: 'Fictional report goal', createdAt: '2026-11-05T08:00:00.000Z'})], '/app/activity');
  const report = page.getByRole('region', {name: 'Your report'});
  await expect(report).toContainText('This week: 1 goal step');
  await expect(report.getByRole('heading', {name: 'Goal days in a row'})).toBeVisible();
  await expect(report).toContainText('1 day');
  await report.getByRole('button', {name: 'All time'}).click();
  await expect(report).toContainText('All time: 1 goal step');
  await expect(report.getByRole('heading', {name: 'Perfect weeks'})).toBeVisible();
  // Session AL (COPY_AUDIT, deliberate; fourth pass PR-065): the footer also names the money log.
  await expect(page.getByText(/Not listed here: journal entries, notes, and the spending and income you log under Wealth/)).toBeVisible();
  await expect(page.getByText(/sleep nights, journal entries/)).toHaveCount(0);
});
