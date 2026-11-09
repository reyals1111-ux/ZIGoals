import {expect, test, type Page} from '@playwright/test';
import {emptyDevice, open, toast} from '../l3-helpers';
import {loadShowcase} from '../../ah-helpers';
import {goal, project, seedGoals, openModule} from './goal-fixtures';
import {PLATFORM_KEY} from '../../../lib/positions';

// Session AL fifth pass (lane L4): the STILL OPEN and CHANGED rows of GROK53_REPLAY_L4_2.md, through the screens in the
// bots' conditions (Denver 1920 × 1113 Nebula fresh profile; the Showcase at 1280 × 800 Dark), Europe/Brussels, en-GB.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});

async function showcase(page: Page) {
  await page.setViewportSize({width: 1280, height: 800});
  await emptyDevice(page, {theme: 'dark'});
  await loadShowcase(page);
}
async function allActivity(page: Page) {
  await open(page, '/app/activity');
  for (let i = 0; i < 60; i++) {
    const more = page.getByRole('button', {name: /Show more activity/}).first();
    if (!await more.count()) break;
    await more.click();
  }
}

test.describe('Fresh profile', () => {
  test('G-045: a missed average target closes as not reached and stays off the Hall of achievements', async ({page}) => {
    await page.setViewportSize({width: 1920, height: 1113});
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/average/new');
    await page.getByLabel('Name', {exact: true}).fill('Screen time');
    await page.locator('label.field', {hasText: 'Measure'}).locator('select').selectOption('custom');
    await page.locator('label.field', {hasText: 'Keep it'}).locator('select').selectOption('at-most');
    await page.getByLabel('Target', {exact: true}).fill('2');
    await page.getByLabel('Unit', {exact: true}).fill('h a day');
    await page.getByRole('button', {name: 'Save goal', exact: true}).click();
    await page.waitForURL('**/app/goals/average/**');
    await page.getByLabel(/Screen time: value for/).fill('2.3');
    await page.getByRole('button', {name: 'Save the day', exact: true}).click();
    const status = page.getByRole('region', {name: 'Goal status'});
    await expect(status.getByRole('button', {name: 'Mark as finished'})).toHaveCount(0);
    await expect(status).toContainText('it finishes once the target is met');
    await status.getByRole('button', {name: 'Close as not reached', exact: true}).click();
    await expect(toast(page)).toContainText('Closed as not reached');
    await expect(status.getByRole('button', {name: 'Make active again', exact: true})).toBeVisible();
    await open(page, '/app/goals');
    const hall = page.getByRole('region', {name: 'Hall of achievements'});
    if (await hall.count()) await expect(hall).not.toContainText('Screen time');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:average-goals:v1')!).goals[0])).toMatchObject({name: 'Screen time', status: 'closed'});
  });

  test('DV-041b/NB-098/N-167: a completed project\'s timeline counts milestones, in plain words, with no raw record id', async ({page}) => {
    await page.setViewportSize({width: 1920, height: 1113});
    await seedGoals(page, [project('72', ['Plan', 'Build'], 1)], '/app/goals/tracked/72');
    const milestones = await openModule(page, 'milestones');
    // Session AL (CI 1629 and CI 1632, deliberate; the race recorded in CI_INTERMITTENTS.md): the box is controlled and
    // follows the store write a moment after the click (goal-milestones.tsx:84; this last milestone also completes the
    // goal), so `check()` can read it before it turns. The same tick, then the same "checked" expectation, waited for.
    const build = milestones.getByRole('checkbox', {name: 'Build'});
    await build.click();
    await expect(build).toBeChecked();
    const timeline = page.getByRole('region', {name: 'Goal timeline'});
    await expect(timeline).toContainText('Target reached · goal completed');
    await expect(timeline).toContainText('2 milestones');
    await timeline.locator('details summary').first().click();
    await expect(timeline).not.toContainText(/\bUSD\b|LOCAL_EDIT|RETAINED_MILESTONE|Record ID|retained milestone|local edit/);
    await expect(timeline).toContainText('Where it comes from');
  });

  test('DV-034a/DV-104/MO-120/DV-015/DV-007a: a count of books has no wealth module, chart or liquidity line, and says its figures once', async ({page}) => {
    await page.setViewportSize({width: 1920, height: 1113});
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await page.getByRole('radio', {name: 'Reach a number of something', exact: true}).check();
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('DV Count books', {delay: 15});
    await page.getByLabel('Target amount', {exact: true}).fill('20');
    await page.getByLabel('Goal asset').fill('books');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await page.waitForURL('**/app/goals/tracked/**');
    await page.getByRole('button', {name: 'Fund Goal', exact: true}).first().click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('YOUR OWN COUNT');
    await expect(sheet).not.toContainText('YOUR PRIVATE WEALTH');
    await sheet.getByLabel('How many books did you add?').fill('3');
    await sheet.getByRole('button', {name: 'Preview contribution'}).click();
    await sheet.getByRole('button', {name: 'Confirm & fund Goal'}).click();
    await expect(sheet).toHaveCount(0);
    const main = page.locator('main');
    await expect(page.locator('#allocate')).toHaveCount(0);
    await expect(page.locator('#history')).toHaveCount(0);
    await expect(main).not.toContainText(/add money you have|Counted wealth|Wealth & contribution history|liquidity of some allocated wealth|UNKNOWN · MANUAL/);
    await expect(main).toContainText('Your count over time');
    // DV-007a: "3 books of 20 books" once (the hero), not again in "Your plan".
    await expect(page.getByRole('region', {name: 'Your plan overview'})).not.toContainText('of 20 books');
    await expect(page.getByTestId('tracked-progress')).toContainText('20 books');
  });

  test('D-039/N-144/PR-024: a USD savings plan says its scenario in plain words, with no unbonding line; one pace on the page', async ({page}) => {
    await page.setViewportSize({width: 1920, height: 1113});
    const at = '2026-11-04T09:00:00.000Z';
    await seedGoals(page, [goal('81', {name: 'Holiday fund', target: '100000', plan: {amount: '10000', asset: 'USD', decimals: 2, cadence: 'monthly', nextDate: '2026-11-20', active: true}, createdAt: at})], '/app/goals/tracked/81');
    const scenario = await openModule(page, 'funding-scenario');
    await expect(scenario).toContainText('If every planned payment is made');
    await expect(scenario).not.toContainText(/Funding Wealth|ON TRACK|ON_TRACK|Unbonding and provider liquidity/);
    const onTrack = await openModule(page, 'on-track');
    await expect(onTrack).not.toContainText('Recorded here over the last');
  });

  test('X3-15: a USD asset offered to a EUR goal says it is never converted, before saving', async ({page}) => {
    await page.setViewportSize({width: 1920, height: 1113});
    const at = '2026-11-04T09:00:00.000Z';
    const cash = {id: 'usd-cash', providerId: 'DV USD cash', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'USD', quantity: '50000', decimals: 2, assetClass: 'Cash', valuationMode: 'manual', valuation: {value: '50000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: at}, liquidity: 'LIQUID', verification: 'MANUAL', sync: 'MANUAL', observedAt: at, provenance: 'Manual entry', notes: ''};
    await seedGoals(page, [goal('91', {name: 'DV EUR two', asset: 'EUR', denom: 'EUR', target: '80000'})], '/app/goals/tracked/91#allocate', {positions: [cash]} as never);
    const wealth = await openModule(page, 'allocate');
    await wealth.getByRole('button', {name: /DV USD cash/}).first().click();
    await expect(wealth.locator('.allocation-currency-note')).toContainText('Valued in USD; this goal counts EUR. ZIGoals never converts between currencies');
  });

  test('PR-055: a count of USD is pointed to a savings goal, never made a tally beside the USD cash', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await page.getByRole('radio', {name: 'Reach a number of something', exact: true}).check();
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('QA Qty USD', {delay: 15});
    await page.getByLabel('Target amount', {exact: true}).fill('500');
    await page.getByLabel('Goal asset').fill('USD');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await expect(page.getByText('USD is money: choose “Save an amount”')).toBeVisible();
    await expect(page).toHaveURL(/\/app\/goals\/new/);
  });

  test('G-047: the creator offers Keep an average', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await page.getByRole('link', {name: 'Keep an average instead →'}).click();
    await page.waitForURL('**/app/goals/average/new');
  });

  test('N-071: a project idea\'s preview names no "Custom" category', async ({page}) => {
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/goals/new');
    await page.getByRole('radio', {name: 'Finish a project', exact: true}).check();
    await expect(page.getByRole('region', {name: 'Goal preview'})).not.toContainText('Custom');
  });

  test('DV-029d: an average goal\'s card is as tall as the goal cards in its row', async ({page}) => {
    await page.setViewportSize({width: 1920, height: 1113});
    await seedGoals(page, [goal('61', {name: 'Holiday fund'}), project('62', ['Plan', 'Build'])], '/app/goals');
    await page.evaluate(() => localStorage.setItem('zigoals:average-goals:v1', JSON.stringify({version: 1, goals: [{id: 'sleep-1', name: 'Sleep', metric: 'sleep-hours', unit: 'h a night', target: 7, direction: 'at-least', windowDays: 7, createdAt: '2026-11-04T09:00:00.000Z', status: 'active', entries: []}]})));
    await open(page, '/app/goals');
    const heights = async () => page.locator('.goal-grid > *').evaluateAll(els => els.map(e => { const b = e.getBoundingClientRect(); return {top: Math.round(b.top), h: Math.round(b.height)}; }));
    const rows = new Map<number, number[]>();
    for (const c of await heights()) rows.set(c.top, [...rows.get(c.top) ?? [], c.h]);
    const first = [...rows.values()][0]!;
    expect(first.length).toBe(3);
    expect(Math.max(...first) - Math.min(...first)).toBeLessThanOrEqual(2);
  });

  test('G-014: a 93 % average says it is close, on its card', async ({page}) => {
    await page.setViewportSize({width: 1920, height: 1113});
    await seedGoals(page, [], '/app/goals');
    const day = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
    await page.evaluate(d => localStorage.setItem('zigoals:average-goals:v1', JSON.stringify({version: 1, goals: [{id: 'walk-1', name: 'Walk 8000 steps', metric: 'steps', unit: 'steps a day', target: 8000, direction: 'at-least', windowDays: 7, createdAt: '2026-11-01T09:00:00.000Z', status: 'active', entries: [{day: d, value: 7400}]}]})), day);
    await open(page, '/app/goals');
    await expect(page.locator('.average-goal-card').filter({hasText: 'Walk 8000 steps'}).locator('.average-goal-state')).toHaveText(/^Close: within a tenth of your target/);
  });

  test('D-187: Goals → Closed and Ecosystem\'s no-match use the one empty state, each with a next step', async ({page}) => {
    await page.setViewportSize({width: 1920, height: 1113});
    await seedGoals(page, [goal('63', {name: 'Holiday fund'})], '/app/goals');
    await page.getByRole('button', {name: 'Closed', exact: true}).click();
    const closed = page.locator('.empty-state').filter({hasText: 'No closed goals.'});
    await expect(closed.getByRole('button', {name: 'View all goals'})).toBeVisible();
    await open(page, '/app/ecosystem');
    await page.getByLabel('Search projects').fill('zzzz');
    const none = page.locator('.empty-state').filter({hasText: 'No projects match these filters.'});
    await none.getByRole('button', {name: 'Clear search and filters'}).click();
    await expect(page.getByLabel('Search projects')).toHaveValue('');
  });
});

test.describe('Small leftovers', () => {
  test('BN-135: the calculator\'s yearly return keeps a few characters, not 500', async ({page}) => {
    await emptyDevice(page, {theme: 'dark'});
    await open(page, '/app/wealth/calculator');
    const rate = page.locator('#calc-yearly-return');
    await rate.fill('');
    await rate.evaluate((el: HTMLInputElement) => el.focus());
    await page.keyboard.insertText('7'.repeat(500));
    expect((await rate.inputValue()).length).toBeLessThanOrEqual(7);
  });

  test('D-230: Back to top takes the focus to the top of the page', async ({page}) => {
    await emptyDevice(page, {theme: 'dark'});
    await open(page, '/app/settings');
    const top = page.getByRole('link', {name: 'Back to top'});
    await top.focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main');
  });
});

test.describe('Showcase 1280 Dark', () => {
  test('B-092/D-227: no "Portfolio completed" for the active project; seeded rows are named as the example\'s', async ({page}) => {
    await showcase(page);
    await allActivity(page);
    const main = page.locator('main');
    await expect(main).not.toContainText('Portfolio completed');
    const milestone = page.locator('.activity-event').filter({hasText: 'Milestone ticked: “Create the portfolio”'});
    await expect(milestone).toContainText('Showcase example');
    for (const own of ['Counted by you', 'Private · this browser', 'Marked by you']) await expect(main.locator('.activity-event').filter({hasText: own})).toHaveCount(0);
    const reached = page.locator('.activity-event').filter({hasText: 'Target reached'}).filter({hasText: 'My first 0.1 BTC'});
    for (const row of await reached.all()) await expect(row).toContainText('Showcase example');
  });

  test('D-164: the creator\'s "Count what I already hold" lists the Showcase\'s Bitcoin, as Wealth does', async ({page}) => {
    await showcase(page);
    await open(page, '/app/goals/new');
    // The Showcase has the chain chosen, so its kinds read Quantity / Value / Reward / Project, none preselected (DV-120).
    await page.getByRole('radio', {name: 'Quantity', exact: true}).check();
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Test goal', {delay: 15});
    await page.getByLabel('Target amount', {exact: true}).fill('10');
    await page.getByLabel('Goal asset').fill('BTC');
    await page.getByRole('button', {name: /^Continue/}).first().click();
    await page.getByLabel(/Count what I already hold|Use wealth I already have/).check();
    const existing = page.locator('.picker-existing').first();
    await expect(existing).toContainText('Bitcoin');
    await expect(existing).not.toContainText('No assets yet');
  });

  test('N-166 (check): a new Reward goal\'s Wealth chooser lists the ZIG reward reserve', async ({page}) => {
    await showcase(page);
    await open(page, '/app/goals/new');
    await page.getByRole('radio', {name: 'Reward', exact: true}).check();
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Fictional reward goal', {delay: 15});
    await page.getByLabel('Target amount', {exact: true}).fill('100');
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await page.waitForURL('**/app/goals/tracked/**');
    const wealth = await openModule(page, 'allocate');
    await expect(wealth.locator('.picker-existing')).toContainText('ZIG reward reserve');
  });

  test('NB-175: a completed goal\'s ⋯ offers nothing to follow on Today', async ({page}) => {
    await showcase(page);
    await open(page, '/app/goals');
    await page.getByRole('button', {name: 'Completed', exact: true}).click();
    const card = page.locator('[data-goal-key="private:9204"]');
    await card.getByRole('button', {name: /^Options for /}).click();
    await expect(card.getByRole('button', {name: /to Today$/})).toHaveCount(0);
    await expect(card.getByRole('link', {name: 'Delete…'})).toBeVisible();
  });

  test('M-091: Today\'s Quick add opens on its line field', async ({page}) => {
    await showcase(page);
    await open(page, '/app');
    await page.locator('.today-hero .quick-add-trigger').click();
    await expect(page.getByRole('dialog').getByRole('textbox', {name: 'Type a line', exact: true})).toBeFocused();
  });

  test('DV-018: the Showcase project reads "Project", with no Goal Vault', async ({page}) => {
    await showcase(page);
    await page.evaluate(() => { const marker = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1')!); sessionStorage.setItem(`zigoals:showcase:v1:${marker.generation}:zigoals:earn-prefs:v1`, JSON.stringify({version: 1, pageShown: true})); });
    await open(page, '/app/goals/tracked/9205');
    await expect(page.locator('.goal-detail-heading .eyebrow')).toHaveText('Project');
    await expect(page.locator('#goal-vault')).toHaveCount(0);
  });
});

test.describe('Chain chosen (Earn shown)', () => {
  test('DV-120: no kind is preselected; each radio names its card; Create asks for a kind first', async ({page}) => {
    await page.addInitScript(() => { try { localStorage.setItem('zigoals:earn-prefs:v1', JSON.stringify({version: 1, pageShown: true})); } catch { /* none */ } });
    await emptyDevice(page, {theme: 'dark'});
    await open(page, '/app/goals/new');
    const kinds = page.getByRole('group', {name: 'What kind of progress matters?'});
    await expect(kinds.getByRole('radio')).toHaveCount(4);
    for (const radio of await kinds.getByRole('radio').all()) await expect(radio).not.toBeChecked();
    for (const card of ['Count goal', 'Savings goal', 'Rewards goal', 'Project']) await expect(kinds).toContainText(`On its card: ${card}`);
    await page.getByLabel('Goal name', {exact: true}).click();
    await page.keyboard.type('Fictional chain goal', {delay: 15});
    await page.getByRole('button', {name: 'Create goal', exact: true}).first().click();
    await expect(page.getByText('Choose what kind of progress matters.')).toBeVisible();
    await expect(page).toHaveURL(/\/app\/goals\/new/);
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '{"goals":[]}').goals.length, PLATFORM_KEY)).toBe(0);
  });
});
