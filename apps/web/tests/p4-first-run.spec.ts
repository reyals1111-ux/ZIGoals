import {expect, test, type Page} from '@playwright/test';
import {alphaNotice} from './ab-shell';
import {typeGoalName} from './goal-name';

/**
 * Session AK P4 (docs/review/session-ak/FIRST_RUN_REVIEW.md, "## Fixes"): the first ten minutes of a brand-new person who
 * never chose the chain, at 390 (mobile project) and 1440 (desktop project). Every /api request answers 503 and every
 * local-model port refuses, so nothing leaves the browser; fictional data only.
 */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route(/127\.0\.0\.1:(11434|1234|9931|8642)|localhost:(11434|1234|9931|8642)/, route => route.abort('connectionrefused'));
});
const CRYPTO = /Crypto|Stablecoins|CoinGecko|unstaking|delegation|Private allocation|PRIVATE ALLOCATION|Value Goal|VALUE GOAL/;
async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  await expect(page.locator('main h1').first()).toBeVisible();
}
const shown = (page: Page) => page.locator('main').evaluate(el => (el as HTMLElement).innerText);

test('FR-1: saving for a holiday on a fresh device stays in plain money words, from the wizard to the goal page', async ({page}) => {
  await ready(page, '/app/goals/new');
  // Session AL (COPY_AUDIT, deliberate): DV-176/DV-183, the idea is the library's "Holiday fund" and names the goal the same.
  await page.getByRole('button', {name: 'Start from the idea: Holiday fund'}).click();
  await page.getByLabel('Target amount', {exact: true}).fill('1500');
  await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'What counts toward this Goal?'})).toBeVisible();
  await expect(page.getByRole('radio', {name: 'Save toward it from now on'})).toBeChecked();
  expect(await shown(page)).not.toMatch(CRYPTO);
  await page.getByRole('radio', {name: 'Count money I already have'}).check();
  const tabs = page.getByRole('group', {name: 'Asset categories'});
  await expect(tabs.getByRole('button', {name: 'Crypto', exact: true})).toHaveCount(0);
  await expect(tabs.getByRole('button', {name: 'Stablecoins', exact: true})).toHaveCount(0);
  expect(await shown(page)).not.toMatch(CRYPTO);
  await page.getByRole('radio', {name: 'Save toward it from now on'}).check();
  await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await expect(page.getByText('A plan, not a transfer: nothing moves.')).toBeVisible();
  expect(await shown(page)).not.toMatch(CRYPTO);
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await page.waitForURL(/\/app\/goals\/tracked\//);
  await expect(page.locator('.goal-detail-heading .eyebrow')).toHaveText('Savings goal · Your own plan');
  await expect(page.getByRole('navigation', {name: 'Goal workspace'}).getByRole('link', {name: 'Positions'})).toHaveCount(0);
  await expect(page.getByText('No saving plan yet')).toBeVisible();
  expect(await shown(page)).not.toMatch(CRYPTO);
});

test('FR-2: NOVA with no model offers the goal form for a saving wish and says what it can do', async ({page}) => {
  await ready(page, '/app');
  await page.goto('/app/nova');
  const ask = async (q: string) => { const f = page.getByPlaceholder(/What’s on your mind|Message NOVA/).last(); await f.fill(q); await f.press('Enter'); };
  await ask('Help me save for a holiday');
  await expect(page.getByText('Let\'s make it a goal: “Holiday”.', {exact: false}).last()).toBeVisible();
  await expect(page.getByText(/Open Goals → New goal “Holiday”/).last()).toBeVisible();
  await ask('What can you do?');
  await expect(page.getByText(/Right now I answer from your own records, on this device/).last()).toBeVisible();
  await expect(page.getByText(/without any AI/)).toHaveCount(0);
});

test('FR-3: the first habit ticked from Today stays in view, done, with its first-step line', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-02T08:30:00')});
  await ready(page, '/app/habits');
  await page.locator('main button', {hasText: '+ Walk'}).first().click();
  await expect(page.getByRole('article', {name: 'Walk', exact: true})).toBeVisible();
  await ready(page, '/app');
  const complete = page.getByRole('button', {name: 'Complete Walk'}).first();
  await complete.scrollIntoViewIfNeeded();
  await complete.click();
  await page.waitForTimeout(800);
  await expect(page.getByRole('button', {name: 'Undo completion for Walk'}).first()).toBeVisible();
  await expect(page.getByText('Your first step is logged. Day 1 of your streak.')).toBeVisible();
});

test('FR-4, FR-7, FR-8, FR-15, FR-23: the welcome stalls loudly, names its habit, and lands on "You’re set"', async ({page}) => {
  await ready(page, '/app/welcome');
  const flow = page.locator('main');
  await expect(flow.getByText('Nothing to connect, nothing to buy.')).toBeVisible();
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await flow.getByRole('checkbox', {name: /^Goals & money/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('checkbox', {name: /^Save for something/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await expect(flow.getByRole('checkbox', {name: /^Put money aside/})).toBeChecked();
  await expect(flow.getByText('From your focus · weekly')).toBeVisible();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  const target = flow.getByLabel('Target amount');
  await expect(target).toBeFocused();
  const error = flow.locator('.field-error');
  await expect(error).toHaveText('Add a target amount, or choose No goal for now.');
  expect(await error.evaluate(el => getComputedStyle(el).fontWeight)).toBe('600');
  await target.fill('1500');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Skip the tour', exact: true}).click();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await flow.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await page.waitForURL(/\/app$/);
  const set = page.getByRole('heading', {name: 'You’re set.'});
  await expect(set).toBeFocused();
  // Session AO (RR-17, owner decision 13 Nov, deliberate): the goal is named once on Today (Today's focus), not in "You're set".
  await expect(page.locator('.setup-landing')).toContainText('Your goal is set');
  await expect(page.locator('.setup-landing')).not.toContainText('Emergency fund');
  await expect(page.getByRole('article', {name: 'Focus: next goal step'}).locator('strong')).toHaveText('Emergency fund');
  await expect(page.getByText('Your coach', {exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Close “You’re set”'}).click();
  await expect(set).toHaveCount(0);
});

test('FR-5: on a phone the guide suggests Guarded and the local model says it needs a computer', async ({page, isMobile}) => {
  test.skip(!isMobile, 'the phone path');
  await ready(page, '/app/nova/setup');
  await page.getByRole('button', {name: /^Privacy mode:/}).first().click();
  await expect(page.getByRole('radio', {name: /^Guarded/})).toBeChecked();
  await expect(page.getByText('Strict needs a model on a computer. On a phone, Guarded sends a redacted copy to the provider you choose.')).toBeVisible();
  await page.getByRole('button', {name: /^Your brain, local first:/}).first().click();
  await expect(page.getByRole('button', {name: 'A model on this computer (needs a computer)'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'A model on this computer (recommended)'})).toHaveCount(0);
});

test('FR-6: the desktop notice on a fresh device carries no staking, wallet or keys words', async ({page, isMobile}) => {
  test.skip(isMobile, 'the desktop notice (the phone folds it behind More)');
  await ready(page, '/app');
  const line = await alphaNotice(page).locator('p').first().innerText();
  expect(line).not.toMatch(/Staking|wallet|keys/);
});

test('FR-12, FR-13: NOVA without a brain is never "online", and names what it sees', async ({page, isMobile}) => {
  await ready(page, '/app');
  await page.goto('/app/nova');
  await expect(page.locator('.nova-greeting')).toContainText('is here for simple questions.', {timeout: 15_000});
  await expect(page.locator('.nova-greeting')).not.toContainText('online');
  if (!isMobile) await expect(page.locator('.nova-chips')).not.toContainText('of 5 pillars');
});

test('FR-16, FR-19: a brand-new phone offers the setup above the tab bar; ZIGi’s button stays off the welcome', async ({page, isMobile}) => {
  test.skip(!isMobile, 'phones only');
  await ready(page, '/app');
  await expect(page.getByRole('link', {name: /Set up in a minute · Start/})).toBeVisible();
  await page.getByRole('link', {name: /Set up in a minute · Start/}).click();
  await page.waitForURL(/\/app\/welcome$/);
  await expect(page.locator('.ai-launcher')).toBeHidden();
});

test('FR-17: a new habit offers no ZIG template until the chain is chosen; title, time of day and schedule come first', async ({page}) => {
  await ready(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  const templates = page.getByLabel('Start from template');
  await expect(templates.locator('option', {hasText: 'My ZIG plan'})).toHaveCount(0);
  const order = await page.locator('.habit-editor form').evaluate(form => [...form.querySelectorAll('label.field')].map(l => (l.firstChild?.textContent ?? '').trim()).slice(0, 4));
  expect(order).toEqual(['Start from template', 'Habit title', 'Time of day', 'Schedule']);
});

test('FR-1 (typed name): a goal named by hand keeps the plain path too', async ({page}) => {
  await ready(page, '/app/goals/new');
  await typeGoalName(page, 'Fictional trip');
  await page.getByLabel('Target amount', {exact: true}).fill('900');
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await page.waitForURL(/\/app\/goals\/tracked\//);
  await expect(page.locator('.goal-detail-heading .eyebrow')).toHaveText('Savings goal · Your own plan');
});
