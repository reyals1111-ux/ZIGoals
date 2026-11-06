import {test, type Locator, type Page} from '@playwright/test';
import {at, desktopOnly, expect, hydrated, offlineApis, stored, unnamedControls, ZONE} from './journey-helpers';
import {typeGoalName} from '../goal-name';

/**
 * Session AK F2, journey 11: journeys 1–3 again with the keyboard only (Tab, Shift+Tab, Enter, Space and typing — no
 * pointer), and a screen-reader-name pass on every page they visit: each visible control in the page's main region has an
 * accessible name. Reaching a control means pressing Tab until it holds the focus, as a keyboard user would; a control
 * Tab never reaches fails the journey. Fictional records; the clock is simulated.
 */
test.use({actionTimeout: 20_000, timezoneId: ZONE, storageState: {cookies: [], origins: []}});
desktopOnly();
const HABIT = 'Fictional keyboard walk';
/** Tab (forward) until `target` holds the focus; fails when it is never reached. */
async function tabTo(page: Page, target: Locator, max = 120) {
  await expect(target).toBeVisible();
  for (let i = 0; i < max; i++) {
    if (await target.evaluate(el => el === document.activeElement || el.contains(document.activeElement)).catch(() => false)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${target}`);
}
/** A radio, as the keyboard reaches it: Tab into its group (the checked one, or the first), then arrows until it is chosen. */
async function chooseRadio(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  const group = await target.evaluate(el => (el as HTMLInputElement).name);
  for (let i = 0; i < 120 && !(await page.evaluate(n => (document.activeElement as HTMLInputElement | null)?.type === 'radio' && (document.activeElement as HTMLInputElement).name === n, group)); i++) await page.keyboard.press('Tab');
  for (let i = 0; i < 20 && !(await target.isChecked()); i++) await page.keyboard.press('ArrowRight');
  await expect(target).toBeChecked();
}
const press = async (page: Page, target: Locator, key: 'Enter' | 'Space' = 'Enter') => { await tabTo(page, target); await page.keyboard.press(key); };
/** The page's main region names every control it shows. */
async function named(page: Page, path: string) { expect(await unnamedControls(page), `${path}: controls without an accessible name`).toEqual([]); }

test('@journey 11 keyboard only, with names: setup, a habit, the Checklist, Health and money by Tab, Enter and Space', async ({page}) => {
  test.setTimeout(240_000);
  await page.clock.install({time: at('2026-11-02', '09:00')});
  await offlineApis(page);

  // Journey 1 by keyboard: the welcome, the setup with a first goal.
  await page.goto('/app'); await hydrated(page);
  await named(page, '/app');
  await press(page, page.getByRole('link', {name: 'Start setup', exact: true}));
  await page.waitForURL('**/app/welcome');
  const flow = page.locator('main');
  await named(page, '/app/welcome');
  await press(page, flow.getByRole('button', {name: 'Let’s begin', exact: true}));
  await expect(flow.getByRole('heading', {level: 1, name: 'What do you want to improve?'})).toBeFocused();
  await press(page, flow.getByRole('checkbox', {name: /^Habits/}), 'Space');
  await press(page, flow.getByRole('checkbox', {name: /^Goals & money/}), 'Space');
  await expect(flow.getByRole('checkbox', {name: /^Goals & money/})).toBeChecked();
  await press(page, flow.getByRole('button', {name: 'Continue', exact: true}));
  // Session AL (COPY_AUDIT, deliberate; N-NB-01): a step with nothing picked says "Skip this step", as the tour says "Skip the tour" (was "Continue without choosing").
  await press(page, flow.getByRole('button', {name: 'Skip this step', exact: true}));
  await expect(flow.getByRole('heading', {level: 1, name: 'A few things to start with.'})).toBeFocused();
  await named(page, '/app/welcome (starters)');
  await chooseRadio(page, flow.getByRole('radio', {name: 'A trip', exact: true}));
  await tabTo(page, flow.getByLabel('Goal name', {exact: true}));
  await typeGoalName(flow, 'Fictional keyboard trip'); // typed into the focused field
  await tabTo(page, flow.getByLabel('Target amount'));
  await page.keyboard.type('800');
  await chooseRadio(page, flow.getByRole('radio', {name: 'EUR', exact: true}));
  await press(page, flow.getByRole('button', {name: 'Continue', exact: true}));
  await press(page, flow.getByRole('button', {name: 'Skip the tour', exact: true}));
  for (const heading of ['Keep ZIGoals on your Home Screen.', 'Meet ZIGi.']) {
    await expect(flow.getByRole('heading', {level: 1, name: heading})).toBeFocused();
    await press(page, flow.getByRole('button', {name: 'Continue', exact: true}));
  }
  await expect(flow.getByRole('heading', {level: 1, name: 'Your data, your control.'})).toBeFocused();
  await named(page, '/app/welcome (data)');
  await press(page, flow.getByRole('button', {name: 'Finish setup', exact: true}));
  await page.waitForURL(/\/app$/);

  // A first habit, made, starred and ticked by keyboard.
  await page.goto('/app/habits'); await hydrated(page);
  await named(page, '/app/habits (empty)');
  await press(page, page.getByRole('button', {name: /^(\+ New habit|Create a habit)$/}).first());
  await tabTo(page, page.getByLabel('Habit title', {exact: true}));
  await page.keyboard.type(HABIT);
  await press(page, page.getByRole('button', {name: 'Create habit', exact: true}));
  const card = page.getByRole('article', {name: HABIT, exact: true});
  await expect(card).toBeVisible();
  await named(page, '/app/habits');
  await press(page, card.getByRole('button', {name: `Star ${HABIT} for your Checklist path`, exact: true}));
  await expect(card.getByRole('button', {name: `${HABIT} is on your Checklist path. Take it off`, exact: true})).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/app/checklist'); await hydrated(page);
  await named(page, '/app/checklist');
  await press(page, page.getByRole('button', {name: `${HABIT}: not done yet`, exact: true}), 'Space');
  await expect(page.locator('.checklist-progress-line')).toContainText('1 of 1 planet today');
  const party = page.locator('dialog.checklist-celebration');
  if (await party.isVisible().catch(() => false)) { await page.keyboard.press('Escape'); await expect(party).toHaveCount(0); }

  // The goal and its contribution, by keyboard.
  await page.goto('/app/goals'); await hydrated(page);
  await named(page, '/app/goals');
  await press(page, page.getByRole('link', {name: 'Fictional keyboard trip'}).first());
  await page.waitForURL(/\/app\/goals\/tracked\//); await hydrated(page);
  await named(page, '/app/goals/tracked');
  await press(page, page.getByRole('button', {name: 'Record contribution', exact: true}));
  const fund = page.getByRole('dialog'); // named after its mode: "Fund your Goal", then "Record history only"
  await named(page, '[role=dialog]');
  await press(page, fund.getByRole('button', {name: 'Record history only', exact: true}));
  await tabTo(page, fund.getByLabel(/^Actual amount in /));
  await page.keyboard.type('40');
  await press(page, fund.getByRole('button', {name: 'Save history only', exact: true}));
  await expect(page.getByRole('region', {name: 'Goal timeline'})).toContainText('Contribution recorded');

  // Journey 2 by keyboard: water, and the barcode fold opened with Enter.
  await page.goto('/app/health'); await hydrated(page);
  await named(page, '/app/health');
  await press(page, page.getByRole('button', {name: 'Add 250 mL', exact: true}));
  await expect.poll(async () => (await stored<{daily?: {water: unknown[]}}>(page, 'zigoals:health:v1'))?.daily?.water.length ?? 0).toBe(1);
  await press(page, page.locator('summary', {hasText: 'Scan or look up a food barcode'}));
  const lookup = page.getByRole('region', {name: 'Barcode food lookup'});
  await expect(lookup).toBeVisible();
  await named(page, '/app/health (barcode open)');
  await page.goto('/app/review'); await hydrated(page);
  await named(page, '/app/review');

  // Journey 3 by keyboard: a spending entry logged with Tab, typing, Space and Enter.
  await page.goto('/app/wealth'); await hydrated(page);
  await named(page, '/app/wealth');
  // Session AK RB (RELEASE_REVIEW_2 R2-8, deliberate): the entry form opens from its "Log spending" button, by keyboard too.
  await press(page, page.locator('#spending').getByRole('button', {name: 'Log spending', exact: true}));
  const spend = page.getByRole('form', {name: 'Log spending or income'});
  await tabTo(page, spend.getByLabel('Amount'));
  await page.keyboard.type('6.40');
  await chooseRadio(page, spend.getByRole('radio', {name: 'Groceries', exact: true}));
  await tabTo(page, spend.getByLabel('Note — optional'));
  await page.keyboard.type('Fictional keyboard bread');
  await press(page, spend.getByRole('button', {name: 'Save', exact: true}));
  await expect.poll(async () => (await stored<{entries: {note?: string; category: string}[]}>(page, 'zigoals:money-log:v1'))?.entries.map(e => [e.note, e.category]) ?? []).toEqual([['Fictional keyboard bread', 'Groceries']]);
  await press(page, page.getByRole('group', {name: 'Money tools'}).getByRole('button', {name: 'Split an entry', exact: true}));
  await named(page, '/app/wealth (money tools)');
});
