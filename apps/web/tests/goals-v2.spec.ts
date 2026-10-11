import {expect, test, type Page} from '@playwright/test';
import {emptyPlatform, PLATFORM_KEY, positionSchema, privateGoalSchema, type Platform} from '../lib/positions';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {CELEBRATIONS_KEY, MILESTONE_DATES_KEY} from '../lib/w-device-keys';

// Session W Part 11: a Goal's milestones with values and dates, their calm one-time note, "On track?" with zero
// return and the person's own "what if", and ideas in the Goal creator. Fictional Goal in euros; the clock is fixed.
test.use({timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-01', AT = '2026-09-30T08:00:00.000Z';
function platform(): Platform {
  const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', targetDate: '2026-12-30', notes: '', createdAt: '2026-06-01T09:00:00.000Z',
    milestones: [{id: '11111111-1111-4111-8111-111111111111', title: 'First thousand', done: false, target: '100000'}, {id: '22222222-2222-4222-8222-222222222222', title: 'Booked the trip', done: false}]});
  const position = positionSchema.parse({id: 'p1', providerId: 'manual', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'EUR', denom: 'eur', quantity: '150000', decimals: 2, verification: 'MANUAL', observedAt: AT, liquidity: 'LIQUID', provenance: 'User entry', valuation: {value: '150000', currency: 'EUR', decimals: 2, source: 'MANUAL', observedAt: AT}});
  const event = (id: string, day: string, cents: string, direction: 'IN' | 'OUT' = 'IN') => ({id, goalId: '7', goalScope: 'private' as const, direction, quantity: cents, asset: 'EUR', decimals: 2, occurredAt: `${day}T12:00:00.000Z`, provenance: 'MANUAL_ATTRIBUTION' as const, fundingMode: 'HISTORY_ONLY' as const});
  return {...emptyPlatform(), goals: [goal], positions: [position], allocations: [{goalId: '7', positionId: 'p1', quantity: '150000'}], contributions: [event('e1', '2026-07-10', '30000'), event('e2', '2026-08-10', '30000'), event('e3', '2026-09-10', '30000'), event('w1', '2026-09-15', '10000', 'OUT')]};
}
async function seed(page: Page) {
  await page.clock.install({time: new Date(`${TODAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {[PLATFORM_KEY]: JSON.stringify(platform()), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true})});
}
const stored = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
async function open(page: Page, id: string) { const section = page.locator(`#${id}`); await section.locator('summary').first().click(); return section; }

test('milestones: a value reached by the recorded progress gets one calm note; add one with a value and a date; edit and remove', async ({page}) => {
  await seed(page);
  await page.goto('/app/goals/tracked/7');
  const section = await open(page, 'milestones');
  const note = section.getByRole('group', {name: 'Milestone reached: First thousand'});
  await expect(note).toContainText('Your recorded progress passed “First thousand”.');
  await note.getByRole('button', {name: 'Thanks', exact: true}).click();
  await expect(note).toHaveCount(0);
  expect(Object.keys((await stored(page, CELEBRATIONS_KEY)).seen)).toEqual(['milestone:7:11111111-1111-4111-8111-111111111111']);
  await expect(section).toContainText('reached by your recorded progress');
  const add = section.getByRole('form', {name: 'Add a milestone'});
  await add.getByLabel('New milestone').fill('Half way');
  await add.getByLabel(/Value \(EUR/).fill('3000');
  await add.getByLabel(/Target date/).fill('2027-01-31');
  await add.getByRole('button', {name: 'Add milestone', exact: true}).click();
  await expect(section.getByText('Half way')).toBeVisible();
  await expect(section).toContainText('by 2027-01-31');
  const saved = (await stored(page, PLATFORM_KEY)) as Platform;
  const halfWay = saved.goals[0]!.milestones.find(m => m.title === 'Half way')!;
  expect(halfWay.target).toBe('300000');
  expect((await stored(page, MILESTONE_DATES_KEY)).dates).toEqual({'7': {[halfWay.id]: '2027-01-31'}});
  await section.getByRole('button', {name: 'Edit milestone Half way', exact: true}).click();
  const edit = section.getByRole('form', {name: 'Edit milestone Half way'});
  await edit.getByLabel('Milestone', {exact: true}).fill('Halfway there');
  await edit.getByRole('button', {name: 'Save milestone', exact: true}).click();
  await expect(section.getByText('Halfway there')).toBeVisible();
  await section.getByRole('button', {name: 'Edit milestone Halfway there', exact: true}).click();
  await section.getByRole('button', {name: 'Remove milestone', exact: true}).click();
  await expect(section.getByText('Halfway there')).toHaveCount(0);
  expect((await stored(page, MILESTONE_DATES_KEY)).dates).toEqual({});
});

test('"On track?": what is left, what the date would take with no growth, the recorded pace, and the person\'s own "what if"', async ({page}) => {
  await seed(page);
  await page.goto('/app/goals/tracked/7');
  const section = await open(page, 'on-track');
  await expect(section).toContainText('Still to go: €4,500.00, from what is counted now.');
  await expect(section).toContainText('To reach it by 2026-12-30 with no growth: about €350.00 a week, or €1,500.00 every 30 days.');
  await expect(section).toContainText('Recorded here over the last 90 days: €266.66 in every 30 days, net of withdrawals.');
  await expect(section).toContainText('At that pace, with no growth, about 2028-02-20.');
  await section.locator('summary', {hasText: 'What if it grew?'}).click();
  await section.getByLabel('Growth you assume, % a year').fill('0');
  await section.getByLabel(/Added every month/).fill('500');
  await expect(section.getByRole('status')).toContainText('With 0 % a year (your assumption) and 500 EUR a month: about 9 months');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => /what-if|assum/i.test(k)))).toEqual([]);
});

test('goal ideas fill the creator with a name, the kind of progress and steps; a weight goal points to Health goals', async ({page}) => {
  await seed(page);
  await page.goto('/app/goals/new');
  await page.getByRole('button', {name: 'Start from the idea: Run a 10K', exact: true}).click();
  await expect(page.getByLabel('Goal name')).toHaveValue('Run a 10K');
  await expect(page.getByRole('radio', {name: 'Project', exact: true})).toBeChecked();
  await expect(page.getByLabel('Milestones, one per line')).toHaveValue('Run 3 km without stopping\nRun 5 km\nRun 8 km\nRun 10 km');
  await expect(page.getByRole('link', {name: /A weight goal/})).toHaveAttribute('href', '/app/goals#goals-health');
});
