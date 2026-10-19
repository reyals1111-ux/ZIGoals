import {expect, test} from '@playwright/test';
import {ZIGI_PLANS_KEY} from '../lib/af-zigi-keys';
import {REMINDERS_KEY} from '../lib/reminders/schema';
import {block, checklistRecords, openChat, panel, say, seed, server, stored} from './zigi-af';

/**
 * Session AF (L4, P8.4): Plans (agent mode) through the real panel on a production build, with MOCK replies. One plan
 * arrives as one bundle of ordinary cards under a head; each step is added, edited or dismissed on its own ("Add all"
 * takes the writing steps, never a form), "Skip the rest" dismisses what is left; ZIGi's plans keep each step's outcome
 * on this device (`zigoals:zigi-plans:v1`), never on view, and Settings lists them with Forget.
 */
const TEN_K = {kind: 'plan-bundle', title: 'Your 10k plan', goal: {name: 'Run 10 km', type: 'PROJECT', milestones: ['5 km', '8 km', '10 km'], targetDate: '2027-03-01'},
  habits: [{title: 'Run', measurement: 'minutes', target: 30, schedule: {timesPerWeek: 3}, timeOfDay: 'morning', reminder: '07:00'}], checklist: ['Buy race socks'], remember: [{text: 'Trains in the morning', category: 'schedule'}], earn: {step: 'learn'}};
const BIG = {kind: 'plan-bundle', title: 'Plan my week', habits: [1, 2, 3, 4].map(i => ({title: `Week habit ${i}`, reminder: '07:00'})), checklist: ['Laundry', 'Groceries', 'Call mum'], remember: [{text: 'Prefers short plans', category: 'preferences'}]};
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('one plan, one bundle: the head, the steps in order, per-step Add, Add all for the writing steps, Skip the rest; outcomes kept, never on view', async ({page}) => {
  await server(page, () => `Here is a plan you can add step by step.\n\n${block(TEN_K)}`);
  await seed(page, {extra: checklistRecords()});
  await page.goto('/app');
  await openChat(page);
  await say(page, 'Set me up for a 10k');
  const head = panel(page).locator('.ai-bundle-head');
  await expect(head).toHaveAttribute('aria-label', 'Plan: Your 10k plan');
  await expect(head).toContainText('Your 10k plan · 6 steps');
  await expect(head).toContainText('Add the steps you want; nothing is written until you add one.');
  const cards = panel(page).locator('.ai-proposals .ai-card');
  await expect(cards).toHaveCount(6);
  await expect(cards.locator('h4')).toHaveText(['Create the goal "Run 10 km"', 'Create the habit "Run"', 'Remind me: Run', 'Add to your Checklist: Buy race socks', 'Remember this?', 'Open Earn']);
  expect(await stored(page, ZIGI_PLANS_KEY)).toBeNull();
  // One step added on its own: the plan is kept with that outcome.
  await cards.filter({hasText: 'Buy race socks'}).getByRole('button', {name: 'Apply'}).click();
  await expect.poll(async () => (await stored(page, ZIGI_PLANS_KEY))?.plans?.[0]?.items?.map((i: {outcome: string}) => i.outcome)).toEqual(['proposed', 'proposed', 'proposed', 'opened', 'proposed', 'proposed']);
  expect((await stored(page, ZIGI_PLANS_KEY))!.plans[0]).toMatchObject({title: 'Your 10k plan', done: false});
  // Skip the rest: every step not decided is dismissed, nothing written for them.
  await head.getByRole('button', {name: /^Skip the rest/}).click();
  await expect.poll(async () => (await stored(page, ZIGI_PLANS_KEY))!.plans[0].done).toBe(true);
  expect((await stored(page, ZIGI_PLANS_KEY))!.plans[0].items.filter((i: {outcome: string}) => i.outcome === 'dismissed')).toHaveLength(5);
  // Settings → ZIGi's plans lists it; Forget removes it (what was added stays).
  await page.goto('/app/help');
  await page.goto('/app/settings#zigi-plans');
  const plans = page.locator('details#zigi-plans');
  await expect(plans).toHaveAttribute('open', '');
  await expect(plans.getByRole('list', {name: "ZIGi's plans"})).toContainText('Your 10k plan');
  await expect(plans).toContainText('Add to your Checklist: Buy race socks — opened');
  await plans.getByRole('button', {name: 'Forget the plan "Your 10k plan"'}).click();
  await expect(plans.getByRole('status')).toContainText('Forgot the plan');
  expect((await stored(page, ZIGI_PLANS_KEY))!.plans).toEqual([]);
});

test('a plan larger than ten steps is cut, and the cut is said; Add all adds the writing steps only', async ({page}) => {
  await server(page, () => block(BIG));
  await seed(page, {extra: checklistRecords()});
  await page.goto('/app');
  await openChat(page);
  await say(page, 'Plan my week');
  const head = panel(page).locator('.ai-bundle-head');
  await expect(head).toHaveAttribute('aria-label', 'Plan: Plan my week');
  await expect(head).toContainText('Plan my week · 10 steps');
  await expect(head).toContainText('2 more steps wait for the next reply.');
  await panel(page).getByText(/I couldn.t turn that into an entry/).click();
  await expect(panel(page).locator('.ai-proposals-rejected')).toContainText('Only the first 10 steps of this plan are shown; ask for the rest once these are done.');
  const reminders = async () => Object.keys((await stored(page, REMINDERS_KEY))?.habits ?? {}).length;
  const remindersBefore = await reminders();
  await panel(page).getByRole('button', {name: 'Add all 8'}).click();
  // Each new habit, then its reminder, in one go: the reminder sees the habit the step before it added.
  await expect(panel(page).getByRole('button', {name: /^Undo these 8 · /})).toBeVisible();
  await expect(panel(page).getByRole('status').filter({hasText: 'Added 8 of 8.'})).toHaveCount(1);
  expect(await reminders()).toBe(remindersBefore + 4);
  // The Checklist items and the Remember card are not in Add all (forms and device records wait for their own tap).
  await expect(panel(page).locator('.ai-card').filter({hasText: 'Laundry'}).getByRole('button', {name: 'Apply'})).toBeVisible();
});
