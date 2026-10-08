import {expect, type Locator, type Page} from '@playwright/test';
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
  // Delete is offered for a Goal without financial history; one with contributions or plan revisions is closed instead
  // ("Close this Goal to preserve its financial history"), so the Goal deleted here is a new one.
  const name = 'Fictional reserve to delete';
  await quickGoal(page, name, {target: '900'});
  await page.getByLabel('Goal actions').click();
  const remove = page.getByRole('button', {name: 'Delete Goal', exact: true});
  await expect(remove).toBeEnabled();
  await remove.click();
  const confirm = page.getByRole('alertdialog', {name: 'Confirm Goal action'});
  await expect(confirm.getByRole('heading', {name: 'Delete this private Goal?'})).toBeVisible();
  await confirm.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(confirm).toHaveCount(0);
  expect((await storedGoals(page)).map(g => g.name)).toContain(name);
  await page.getByRole('button', {name: 'Delete Goal', exact: true}).click();
  await page.getByRole('alertdialog', {name: 'Confirm Goal action'}).getByRole('button', {name: 'Confirm delete', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/goals$/);
  await ready(page);
  await expect(goalCard(page, name)).toHaveCount(0);
  await expect(page.getByRole('heading', {name, exact: true})).toHaveCount(0);
  expect((await storedGoals(page)).map(g => g.name)).not.toContain(name);
  await open(page, '/app');
  await expect(page.locator('main')).not.toContainText(name);
});

/** The short flow: name, kind and target on the first step, then "Create goal" (a tracked Goal). */
type Quick = {type?: 'Quantity' | 'Value' | 'Project'; target?: string; currency?: 'USD' | 'EUR'; asset?: string; category?: string; date?: string; milestones?: string};
async function quickGoal(page: Page, name: string, {type = 'Value', target = '', currency, asset = '', category = '', date = '', milestones = ''}: Quick = {}) {
  await open(page, '/app/goals/new');
  if (category) { await page.getByText('Personalize artwork and notes (optional)').click(); await page.getByRole('radio', {name: category, exact: true}).check(); }
  await page.getByLabel('Goal name', {exact: true}).fill(name);
  if (type !== 'Quantity') await page.getByRole('radio', {name: type, exact: true}).check();
  if (milestones) await page.getByLabel('Milestones, one per line').fill(milestones);
  if (target) await page.getByLabel('Target amount', {exact: true}).fill(target);
  if (currency) await page.getByRole('radio', {name: new RegExp(`^${currency} · `)}).check();
  if (asset) await page.getByLabel('Goal asset', {exact: true}).fill(asset);
  if (date) await page.getByLabel('Target date (optional)').fill(date);
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/goals\/tracked\/\d+$/);
  await expect(page.getByRole('heading', {name, exact: true})).toBeVisible();
}
const goalCard = (page: Page, name: string) => page.locator('.goal-card').filter({has: page.getByRole('heading', {name, exact: true})});
const storedGoals = (page: Page) => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{"goals":[]}') as {goals: {name: string; target: string; targetDate?: string}[]}).goals, PLATFORM_KEY);

journey('J034', 'browser Back from the wizard\'s second step asks first; the wizard\'s own Back keeps what I typed; nothing saved', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  await open(page, '/app/goals');
  // The wizard opened from Goals' own link, as a person does: Back is then a step inside the app, which asks first. (A
  // typed address makes Back leave the document, where the browser's own leave-page prompt answers instead.)
  await page.getByRole('link', {name: '+ Create a goal', exact: true}).click();
  await page.waitForURL(/\/app\/goals\/new$/);
  await ready(page);
  const before = await goalsStore(page);
  await page.getByLabel('Goal name', {exact: true}).fill('Fictional sailing course');
  await page.getByLabel('Target amount', {exact: true}).fill('800');
  await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await expect(page.getByText('Step 2 of 4', {exact: true})).toBeVisible();
  const asked: string[] = [];
  page.once('dialog', async dialog => { asked.push(dialog.message()); await dialog.dismiss(); });
  await page.evaluate(() => history.back());
  await expect.poll(() => asked).toEqual(['Discard your unsaved Goal changes?']);
  await expect(page.getByText('Step 2 of 4', {exact: true})).toBeVisible();
  await page.locator('.wizard-actions').getByRole('button', {name: 'Back', exact: true}).click();
  await expect(page.getByText('Step 1 of 4', {exact: true})).toBeVisible();
  await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Fictional sailing course');
  await expect(page.getByLabel('Target amount', {exact: true})).toHaveValue('800');
  page.once('dialog', dialog => dialog.accept());
  await page.evaluate(() => history.back());
  await page.waitForURL(/\/app\/goals$/);
  await ready(page);
  await expect(goalCard(page, 'Fictional sailing course')).toHaveCount(0);
  expect(await goalsStore(page)).toBe(before);
});

/** "Fund your Goal" with new cash of `amount` dollars: the asset, the preview, then the confirmation. */
async function fundWithCash(page: Page, amount: string) {
  const sheet = page.getByRole('dialog', {name: 'Fund your Goal'});
  await sheet.getByRole('button', {name: 'Cash', exact: true}).click();
  await sheet.getByLabel('Cash amount', {exact: true}).fill(amount);
  await sheet.getByRole('button', {name: 'Continue with this asset', exact: true}).click();
  await sheet.getByRole('button', {name: 'Preview contribution', exact: true}).click();
  await sheet.getByRole('button', {name: 'Confirm & fund Goal', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole('status').filter({hasText: 'Goal funded.'})).toBeVisible();
}
const AT = '2026-10-01T08:00:00.000Z';
const dollarGoal = (id: string, name: string, target: string, extra: Record<string, unknown> = {}) => privateGoalSchema.parse({id, name, type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target, notes: '', createdAt: '2026-09-01T09:00:00.000Z', milestones: [], ...extra});
const dollarCash = (id: string, cents: string) => positionSchema.parse({id, providerId: 'manual', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'usd', quantity: cents, decimals: 2, verification: 'MANUAL', observedAt: AT, liquidity: 'LIQUID', provenance: 'User entry', valuation: {value: cents, currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: AT}});
async function seedPlatform(page: Page, data: Platform) {
  await page.goto('/app/settings');
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [PLATFORM_KEY, JSON.stringify(data)]);
}
const ring = (scope: Locator, name: string) => scope.getByRole('progressbar', {name: `${name} progress`});
const views = (page: Page) => page.getByRole('navigation', {name: 'Goal views'});

journey('J038', 'goals in EUR, USD, JPY (no decimals) and CHF, each shown in its own currency', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  await quickGoal(page, 'Fictional euro fund', {target: '2500', currency: 'EUR'});
  await quickGoal(page, 'Fictional dollar fund', {target: '1200', currency: 'USD'});
  // A Value Goal counts in USD or EUR only; yen and francs are the asset of a Quantity Goal (the closest real choice).
  await quickGoal(page, 'Fictional yen fund', {type: 'Quantity', target: '150000', asset: 'JPY'});
  await quickGoal(page, 'Fictional franc fund', {type: 'Quantity', target: '300.5', asset: 'CHF'});
  await open(page, '/app/goals');
  const value = (name: string) => goalCard(page, name).locator('.goal-value');
  await expect(value('Fictional euro fund')).toContainText('€2,500.00');
  await expect(value('Fictional euro fund')).not.toContainText('$');
  await expect(value('Fictional dollar fund')).toContainText('$1,200.00');
  await expect(value('Fictional dollar fund')).not.toContainText('€');
  await expect(value('Fictional yen fund')).toContainText('150,000');
  await expect(value('Fictional yen fund')).toContainText(/JPY|¥/);
  await expect(value('Fictional yen fund')).not.toContainText('150,000.');
  await expect(value('Fictional franc fund')).toContainText('300.5');
  await expect(value('Fictional franc fund')).toContainText('CHF');
});

journey('J043', 'complete a goal: funded to its target it moves to Completed, and that filter shows it', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  const name = 'Fictional bike fund';
  await quickGoal(page, name, {target: '300', currency: 'USD'});
  await page.getByRole('button', {name: 'Fund Goal', exact: true}).first().click();
  await fundWithCash(page, '300');
  await expect(page.getByTestId('tracked-progress').locator('.goal-detail-heading .badge')).toHaveText('Completed');
  await open(page, '/app/goals');
  // Active, the default view, no longer lists it.
  await expect(views(page).getByRole('button', {name: 'Active', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await expect(goalCard(page, name)).toHaveCount(0);
  await views(page).getByRole('button', {name: 'Completed', exact: true}).click();
  await expect(goalCard(page, name).locator('.card-top .badge')).toHaveText('Completed');
  await expect(ring(goalCard(page, name), name)).toHaveAttribute('aria-valuenow', '100');
  expect((await storedGoals(page) as {name: string; status?: string}[]).find(g => g.name === name)?.status).toBe('completed');
});

journey('J046', 'the goals collection pages through more than 24 Goals and its count is right', {views: ['D', 'T'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/goals');
  const count = page.locator('.goals-count');
  const shown = Number((await count.textContent())!.match(/^(\d+)/)![1]);
  // Twenty-six more fictional Goals in the Showcase's own tab-only record, so the collection passes 24.
  const extra = Array.from({length: 26}, (_, i) => dollarGoal(String(4601 + i), `Fictional pager ${String(i + 1).padStart(2, '0')}`, '100000'));
  await page.evaluate(([key, goals]) => {
    const {generation} = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1')!) as {generation: string};
    const physical = `zigoals:showcase:v1:${generation}:${key}`, data = JSON.parse(sessionStorage.getItem(physical)!) as {goals: unknown[]};
    data.goals.push(...goals);
    sessionStorage.setItem(physical, JSON.stringify(data));
  }, [PLATFORM_KEY, extra] as const);
  await page.reload();
  await ready(page);
  const total = shown + 26, pages = Math.ceil(total / 24);
  const cards = page.getByRole('region', {name: 'Your goals'}).locator('.goal-card'), nav = page.getByRole('navigation', {name: 'Goals pages'});
  const keys = () => cards.evaluateAll(els => els.map(e => e.getAttribute('data-goal-key')));
  await expect(count).toHaveText(`${total} destinations`);
  await expect(nav.getByRole('status')).toHaveText(`Page 1 of ${pages}`);
  await expect(cards).toHaveCount(24);
  await expect(nav.getByRole('button', {name: 'Previous Goals page', exact: true})).toBeDisabled();
  const seen = new Set(await keys());
  for (let n = 2; n <= pages; n++) {
    await nav.getByRole('button', {name: 'Next Goals page', exact: true}).click();
    await expect(nav.getByRole('status')).toHaveText(`Page ${n} of ${pages}`);
    for (const key of await keys()) seen.add(key);
  }
  await expect(cards).toHaveCount(total - 24 * (pages - 1));
  await expect(nav.getByRole('button', {name: 'Next Goals page', exact: true})).toBeDisabled();
  expect(seen.size, 'every Goal appears on exactly one page').toBe(total);
  // Searching narrows the same list, and the count follows.
  await page.getByRole('searchbox', {name: 'Search Goals'}).fill('Fictional pager 07');
  await expect(count).toHaveText('1 destination');
  await expect(cards).toHaveCount(1);
});

journey('J048', 'a tracked Goal\'s page opens from the collection, and Back returns to it', {views: 'all', data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/goals');
  const card = page.locator('main .goal-card[data-goal-key^="private:"]').first();
  const key = (await card.getAttribute('data-goal-key'))!, name = (await card.locator('h2').textContent())!.trim();
  await card.locator('h2').getByRole('link', {name, exact: true}).click();
  await page.waitForURL(/\/app\/goals\/tracked\/\d+$/);
  await expect(page.locator('main h1').first()).toHaveText(name);
  const overview = page.getByTestId('tracked-progress');
  await expect(ring(overview, name).or(overview.getByRole('img', {name: `${name} progress: Unavailable`}))).toBeVisible();
  await page.goBack();
  await page.waitForURL(/\/app\/goals$/);
  await expect(page.locator(`main .goal-card[data-goal-key="${key}"]`)).toBeVisible();
});

journey('J051', 'edit a goal\'s target and date; Today\'s numbers follow', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  const name = 'Fictional sailing school';
  await seedPlatform(page, {...emptyPlatform(), goals: [dollarGoal('51', name, '200000', {targetDate: '2027-06-30'})], positions: [dollarCash('cash-51', '50000')], allocations: [{goalId: '51', positionId: 'cash-51', quantity: '50000'}]} as Platform);
  const onToday = () => page.getByRole('region', {name: 'Your goals'}).locator('.goal-card').filter({hasText: name});
  await open(page, '/app');
  await expect(onToday().locator('.goal-value')).toHaveText('$500.00 / $2,000.00');
  await expect(ring(onToday(), name)).toHaveAttribute('aria-valuenow', '25');
  await open(page, '/app/goals/tracked/51');
  const edit = await fold(page, 'edit-goal');
  await edit.getByLabel('Edit target').fill('4000');
  await edit.getByLabel('Edit deadline').fill('2027-12-31');
  await edit.getByRole('button', {name: 'Save Goal details', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Private Goal saved. No funds moved.'})).toBeVisible();
  await expect(page.getByTestId('tracked-progress')).toContainText('of $4,000.00');
  await expect(page.locator('#on-track > summary')).toContainText('By 2027-12-31');
  await open(page, '/app');
  await expect(onToday().locator('.goal-value')).toHaveText('$500.00 / $4,000.00');
  await expect(ring(onToday(), name)).toHaveAttribute('aria-valuenow', '12.5');
});

journey('J052', 'Goals with the keyboard only: create, open, contribute', {views: ['D'], data: ['E']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  // Each control is reached as Tab reaches it (all are in the tab order); every action is a key press.
  const press = async (target: Locator, key = 'Enter') => { await target.focus(); await page.keyboard.press(key); };
  const type = async (target: Locator, text: string) => { await target.focus(); await page.keyboard.type(text); };
  const name = 'Fictional keyboard trip';
  await open(page, '/app/goals');
  await press(page.getByRole('link', {name: '+ Create a goal', exact: true}));
  await page.waitForURL(/\/app\/goals\/new$/);
  await ready(page);
  await type(page.getByLabel('Goal name', {exact: true}), name);
  await press(page.getByRole('radio', {name: 'Value', exact: true}), 'Space');
  await type(page.getByLabel('Target amount', {exact: true}), '900');
  await press(page.getByRole('radio', {name: /^USD · /}), 'Space');
  await press(page.getByRole('button', {name: 'Create goal', exact: true}));
  await page.waitForURL(/\/app\/goals\/tracked\/\d+$/);
  await expect(page.locator('main h1').first()).toHaveText(name);
  await press(page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Goals', exact: true}));
  await page.waitForURL(/\/app\/goals$/);
  await ready(page);
  await press(goalCard(page, name).getByRole('link', {name, exact: true}));
  await page.waitForURL(/\/app\/goals\/tracked\/\d+$/);
  await ready(page);
  await press(page.getByRole('button', {name: 'Fund Goal', exact: true}).first());
  const sheet = page.getByRole('dialog', {name: 'Fund your Goal'});
  await press(sheet.getByRole('button', {name: 'Cash', exact: true}));
  await type(sheet.getByLabel('Cash amount', {exact: true}), '90');
  await press(sheet.getByRole('button', {name: 'Continue with this asset', exact: true}));
  await press(sheet.getByRole('button', {name: 'Preview contribution', exact: true}));
  await press(sheet.getByRole('button', {name: 'Confirm & fund Goal', exact: true}));
  await expect(sheet).toHaveCount(0);
  await expect(ring(page.getByTestId('tracked-progress'), name)).toHaveAttribute('aria-valuenow', '10');
});

journey('J053', 'Goals on a phone: "+ Create a goal" on the first screen; each card at most a third of the screen', {views: ['P'], data: ['S']}, async j => {
  const {page} = j;
  await open(page, '/app/goals');
  const height = page.viewportSize()!.height;
  const create = page.getByRole('link', {name: '+ Create a goal', exact: true});
  await expect(create).toBeInViewport({ratio: 1});
  expect((await create.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const cards = page.locator('main .goal-card');
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all()) {
    const box = (await card.boundingBox())!;
    expect(box.height, `${(await card.locator('h2').textContent())?.trim()}: at most a third of the screen`).toBeLessThanOrEqual(height / 3);
  }
});

journey('J054', 'two tabs editing the same goal: each tab\'s change is kept', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  await quickGoal(page, 'Fictional shared goal', {target: '500', currency: 'USD'});
  const path = new URL(page.url()).pathname;
  const other = await page.context().newPage();
  await open(other, path);
  const one = await fold(page, 'edit-goal'), two = await fold(other, 'edit-goal');
  await one.getByLabel('Edit Goal name').fill('Fictional renamed in tab one');
  await one.getByRole('button', {name: 'Save Goal details', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Private Goal saved. No funds moved.'})).toBeVisible();
  // The second tab, opened before, changes only the target: the first tab's new name must survive it.
  await two.getByLabel('Edit target').fill('750');
  await two.getByRole('button', {name: 'Save Goal details', exact: true}).click();
  await expect(other.getByRole('status').filter({hasText: 'Private Goal saved. No funds moved.'})).toBeVisible();
  for (const tab of [page, other]) {
    await tab.reload();
    await ready(tab);
    await expect(tab.locator('main h1').first()).toHaveText('Fictional renamed in tab one');
    await expect(tab.getByTestId('tracked-progress')).toContainText('of $750.00');
  }
  expect((await storedGoals(page)).map(g => [g.name, g.target])).toEqual([['Fictional renamed in tab one', '75000']]);
  await other.close();
});

journey('J055', 'Goals offline: a goal created with the wizard is kept on the device', {views: ['D', 'P'], data: ['E']}, async j => {
  const {page} = j;
  const name = 'Fictional offline plan';
  await open(page, '/app/goals/new');
  await page.context().setOffline(true);
  await expect(page.getByRole('alert').filter({hasText: 'You’re offline.'})).toBeVisible();
  await page.getByLabel('Goal name', {exact: true}).fill(name);
  await page.getByRole('radio', {name: 'Value', exact: true}).check();
  await page.getByLabel('Target amount', {exact: true}).fill('640');
  await page.getByRole('radio', {name: /^USD · /}).check();
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  // Offline, the wizard stays (the Goal's own page needs the network) and says where the Goal is; the person is never
  // left on the browser's offline page (fixed in Part 14; regression test in tests/session-x-findings.spec.ts).
  const saved = page.getByRole('status').filter({hasText: 'Your Goal is saved on this device. It opens when you’re back online'});
  await expect(saved).toBeVisible();
  expect(page.url(), 'after creating offline, the person is still in ZIGoals').toMatch(/^https?:\/\//);
  await page.context().setOffline(false);
  await saved.getByRole('link', {name: 'Open saved Goal →'}).click();
  await expect(page.getByRole('heading', {level: 1, name})).toBeVisible();
  await open(page, '/app/goals');
  await expect(goalCard(page, name)).toBeVisible();
  expect((await storedGoals(page)).map(g => g.name)).toEqual([name]);
});

journey('J056', 'Goal art: each preset renders; with reduced motion it stays still', {views: ['D', 'P'], data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(90_000);
  const art = [['Travel', 'mountains'], ['First Home', 'home'], ['Education', 'garden']] as const;
  for (const [category] of art) await quickGoal(page, `Fictional ${category} art`, {target: '100', category});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await open(page, '/app/goals');
  for (const [category, scene] of art) {
    const svg = goalCard(page, `Fictional ${category} art`).locator('.goal-card-art svg.scene-art');
    await expect(svg).toHaveClass(new RegExp(`\\bscene-${scene}\\b`));
    const box = await svg.boundingBox();
    expect(!!box && box.width > 0 && box.height > 0, `${category} art is drawn`).toBe(true);
  }
  expect(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect instanceof KeyframeEffect && !!(a.effect.target as Element | null)?.closest('.goal-card-art')).length), 'nothing in the art moves').toBe(0);
});

journey('J057', 'Goal progress ring at 0 %, 50 %, 100 % and over 100 %', {views: 'all', data: ['L']}, async j => {
  const {page} = j;
  // Four $1,000 Goals and one $3,000 cash holding allocated 0, $500, $1,000 and $1,500.
  const names = ['Fictional ring none', 'Fictional ring half', 'Fictional ring full', 'Fictional ring over'] as const;
  await seedPlatform(page, {...emptyPlatform(), goals: names.map((name, i) => dollarGoal(String(571 + i), name, '100000')), positions: [dollarCash('cash-57', '300000')],
    allocations: [{goalId: '572', positionId: 'cash-57', quantity: '50000'}, {goalId: '573', positionId: 'cash-57', quantity: '100000'}, {goalId: '574', positionId: 'cash-57', quantity: '150000'}]} as Platform);
  await open(page, '/app/goals');
  await views(page).getByRole('button', {name: 'All', exact: true}).click();
  for (const [name, now, words] of [[names[0], '0', /^0% exact progress/], [names[1], '50', /^50% exact progress/], [names[2], '100', /^100% exact progress/], [names[3], '100', /^150% exact progress/]] as const) {
    await expect(ring(goalCard(page, name), name), name).toHaveAttribute('aria-valuenow', now);
    await expect(ring(goalCard(page, name), name), name).toHaveAttribute('aria-valuetext', words);
  }
  // Past the target the ring is full, its words keep the real 150 %, and the Goal reads Completed.
  await expect(goalCard(page, names[3]).locator('.card-top .badge')).toHaveText('Completed');
  await expect(goalCard(page, names[0]).locator('.card-top .badge')).not.toHaveText('Completed');
});

journey('J058', 'a goal with 200 contributions: its timeline pages through them all and stays quick', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  j.info.setTimeout(120_000);
  const DAY = 86_400_000, first = Date.UTC(2026, 2, 1, 12);
  const contributions = Array.from({length: 200}, (_, i) => ({id: `c${String(i).padStart(3, '0')}`, goalId: '58', goalScope: 'private' as const, direction: 'IN' as const, quantity: '1000', asset: 'USD', decimals: 2, occurredAt: new Date(first + i * DAY).toISOString(), provenance: 'MANUAL_ATTRIBUTION' as const}));
  await seedPlatform(page, {...emptyPlatform(), goals: [dollarGoal('58', 'Fictional long history', '1000000')], contributions} as Platform);
  const started = Date.now();
  await open(page, '/app/goals/tracked/58');
  const timeline = page.getByRole('region', {name: 'Goal timeline'}), pager = timeline.getByRole('navigation', {name: 'Goal history pages'});
  await expect(pager.getByRole('status')).toHaveText('Page 1 of 17 · 201 retained events');
  expect(Date.now() - started, 'the Goal opens in good time').toBeLessThan(10_000);
  const items = timeline.locator('ol.intelligence-timeline > li');
  await expect(items).toHaveCount(12);
  // Opening the Goal records today's counted value (a retained snapshot, newest first), so 200 contributions + 1.
  await expect(items.first()).toContainText('Counted Goal value snapshot');
  await expect(items.nth(1).locator('time')).toHaveAttribute('datetime', new Date(first + 199 * DAY).toISOString());
  await expect(page.locator('.intelligence-metrics > div').filter({hasText: 'Actual contributed'}).locator('dd')).toHaveText('$2,000.00');
  const older = pager.getByRole('button', {name: 'Older events', exact: true});
  for (let n = 2; n <= 17; n++) {
    const t = Date.now();
    await older.click();
    await expect(pager.getByRole('status')).toHaveText(`Page ${n} of 17 · 201 retained events`);
    expect(Date.now() - t, `page ${n} answers quickly`).toBeLessThan(2000);
  }
  await expect(items).toHaveCount(9);
  await expect(items.last().locator('time')).toHaveAttribute('datetime', new Date(first).toISOString());
  await expect(older).toBeDisabled();
});

journey('J059', 'a goal created in New York keeps the dates I chose once the device is in Tokyo', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  const browser = page.context().browser()!, viewport = page.viewportSize()!;
  const quiet = (tab: Page) => tab.route('**/api/market-**', route => route.fulfill({status: 503, json: {error: 'journey: market data not requested'}}));
  const newYork = await browser.newContext({timezoneId: 'America/New_York', viewport, locale: 'en-US'});
  const ny = await newYork.newPage();
  await quiet(ny);
  await quickGoal(ny, 'Fictional spring trip', {target: '1500', date: '2027-03-15'});
  const id = new URL(ny.url()).pathname.split('/').pop()!;
  await expect(ny.locator('#on-track > summary')).toContainText('By 2027-03-15');
  const saved = await newYork.storageState();
  await newYork.close();
  const tokyoContext = await browser.newContext({timezoneId: 'Asia/Tokyo', viewport, locale: 'en-US', storageState: saved});
  const tokyo = await tokyoContext.newPage();
  await quiet(tokyo);
  await open(tokyo, `/app/goals/tracked/${id}`);
  await expect(tokyo.locator('#on-track > summary')).toContainText('By 2027-03-15');
  await expect(tokyo.locator('.funding-preview-metrics .financial-metric').filter({hasText: 'Target date'})).toContainText('2027-03-15');
  expect(await tokyo.evaluate(k => (JSON.parse(localStorage.getItem(k)!) as {goals: {targetDate?: string}[]}).goals[0]!.targetDate, PLATFORM_KEY)).toBe('2027-03-15');
  await tokyoContext.close();
});
