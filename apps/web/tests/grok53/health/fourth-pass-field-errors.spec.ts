import {expect, test, type Locator, type Page} from '@playwright/test';
import {freshHealth, healthView, openHealth, storedHealth} from './al-health-helpers';

// Session AL lane L2, fourth pass (AL-FIELD-ERROR-003): the replay of c521574f (GROK53_REPLAY_L2_1.md, steps 1–6) in
// Moscow's conditions: desktop 1280, Dark, a fresh profile, en-GB, Brussels, the clock on 4 Nov 2026 at 04:00. Each
// refused field says its range and unit right under itself, is aria-invalid and named by that sentence, takes the
// focus, and nothing is saved; the browser's "Please fill out this field." bubble is never the only answer; a stale
// "saved" line never sits beside a refusal; the success line shows at the end of the form that was saved.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 800}});
const NIGHT = new Date('2026-11-04T03:00:00.000Z');

async function dark(page: Page) {
  await page.evaluate(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'dark'})));
}
async function start(page: Page, query: string) {
  await page.clock.install({time: NIGHT});
  await freshHealth(page);
  await dark(page);
  await openHealth(page, query);
}
/** The field is refused with exactly this sentence, which sits right after it and names it. */
async function refusedWith(page: Page, field: Locator, sentence: string | RegExp) {
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  const id = (await field.getAttribute('aria-describedby'))!.split(/\s+/)[0]!;
  const message = page.locator(`[id="${id}"]`);
  await expect(message).toHaveText(sentence);
  await expect(message).toBeVisible();
  await expect(field).toBeFocused();
  // under the field: the message starts below the field's top and within 80 px of its bottom
  const f = (await field.boundingBox())!, m = (await message.boundingBox())!;
  expect(m.y).toBeGreaterThan(f.y);
  expect(m.y - (f.y + f.height)).toBeLessThan(80);
  await expect(page.getByText(/available browser storage/)).toHaveCount(0);
}

test('MO-001, BUG-020, D-077, N-116, T-137: Targets refuse 99,999 kcal, 5,000 g and 1,000,000 steps at the field; "Targets saved." shows at the form', async ({page}) => {
  await start(page, '?view=targets');
  const form = page.getByRole('form', {name: 'Personal targets'}), kcal = form.getByLabel('Calorie target (kcal)'), save = form.getByRole('button', {name: 'Save targets'});
  await kcal.fill('99999'); await save.click();
  await refusedWith(page, kcal, 'Enter a calorie target from 1 to 10,000 kcal a day.');
  await kcal.fill('-5'); await save.click();
  await refusedWith(page, kcal, /^Check the highlighted fields: Calorie target \(kcal\) needs a number: a calorie target from 1 to 10,000 kcal a day\.$/);
  await kcal.fill('2000');
  await expect(kcal).not.toHaveAttribute('aria-invalid', 'true');
  const protein = form.getByLabel('Protein target (g)'), steps = form.getByLabel('Daily step target');
  await protein.fill('5000'); await steps.fill('1000000'); await save.click();
  await refusedWith(page, protein, 'Enter a daily target from 1 to 1,000 g.');
  await expect(steps).toHaveAttribute('aria-invalid', 'true');
  expect((await storedHealth(page))?.targets?.kcal ?? null).toBeNull();
  await protein.fill('120'); await steps.fill('8000'); await save.click();
  await expect(page.getByRole('form', {name: 'Personal targets'}).getByRole('status')).toHaveText('Targets saved.');
  await expect.poll(async () => (await storedHealth(page))?.targets.kcal).toBe(2000);
});

test('MO-020, D-142: an empty, 0 or 1000 kg weight gets the app sentence at the field, never only the browser bubble', async ({page}) => {
  await start(page, '?view=weight');
  const form = page.getByRole('form', {name: 'Weight entry'}), field = form.getByLabel('Weight (kg)'), save = form.getByRole('button', {name: 'Save weight'});
  for (const typed of ['', '0', '1000']) {
    await field.fill(typed); await save.click();
    await refusedWith(page, field, 'Enter a weight from 20 to 400 kg.');
  }
  expect((await storedHealth(page))?.weights ?? []).toHaveLength(0);
});

test('MO-036, D-024, PR-063, BUG-084, BUG-009, DV-136, D-143, MO-111: water says its range at the field for -100, 1e6, 0 and blank; "0,5" asks once with no stale range beside it', async ({page}) => {
  await start(page, '');
  const form = page.getByRole('form', {name: 'Water entry'}), amount = form.getByLabel('Water amount', {exact: true}), log = form.getByRole('button', {name: 'Log water'});
  for (const typed of ['-100', '1e6', '0', '']) {
    await amount.fill(typed); await log.click();
    await refusedWith(page, amount, /more than 0 and at most 5,000 mL\.$/);
  }
  await expect(page.getByText(/0\.001/)).toHaveCount(0);
  await amount.fill('0,5'); await log.click();
  await expect(form.getByText('0.5 mL is less than a sip. If it is right, press Log water again to keep it.')).toBeVisible();
  await expect(form.getByText(/at most 5,000 mL/)).toHaveCount(0);
  await expect(amount).not.toHaveAttribute('aria-invalid', 'true');
});

test('MO-030, MO-141: a refused waist reading is marked at its field and the earlier "saved" line is gone', async ({page}) => {
  await start(page, '?view=measurements');
  await page.getByLabel('Measurement history type').selectOption('waist');
  const form = page.getByRole('form', {name: 'Body measurement entry'}), value = form.getByLabel('Measurement value'), save = form.getByRole('button', {name: 'Save measurement'});
  await value.fill('91.5'); await save.click();
  await expect(page.getByText('Measurement saved with its original units and history.')).toBeVisible();
  for (const typed of ['-5', 'abc', '5000']) {
    await value.fill(typed); await save.click();
    await refusedWith(page, value, /from 10 to 250 cm\.$/);
    await expect(page.getByText('Measurement saved with its original units and history.')).toHaveCount(0);
  }
});

test('D-074, L-035, N-130, MO-040: Activity names its empty name and negative steps at the field; "Activity saved." shows at the form; a blank part is not shown as 0', async ({page}) => {
  await start(page, '?view=activity');
  const form = page.getByRole('form', {name: 'Manual activity'}), name = form.getByLabel('Activity name'), steps = form.getByLabel('Steps'), save = form.getByRole('button', {name: 'Save activity'});
  await steps.fill('4000'); await save.click();
  await refusedWith(page, name, 'Enter a name.');
  await name.fill('Walk'); await steps.fill('-100'); await save.click();
  await refusedWith(page, steps, /whole number from 0 to 100,000\.$/);
  await steps.fill('4000'); await save.click();
  await expect(page.getByRole('form', {name: 'Manual activity'}).getByRole('status')).toHaveText('Activity saved.');
  const row = page.locator('.health-library-row').filter({hasText: 'Walk'});
  await expect(row).toContainText('4,000 steps');
  await expect(row).not.toContainText('0 minutes');
});

test('D-089: a 250-character food name is said at the field and never cut', async ({page}) => {
  await start(page, '?view=foods');
  await page.getByRole('button', {name: 'New food', exact: true}).click();
  const form = page.getByRole('form', {name: 'Food details'}), name = form.getByLabel('Food name');
  await name.fill('B'.repeat(250));
  await form.getByLabel('Serving weight (g)').fill('100');
  await form.getByRole('button', {name: 'Save food'}).click();
  await refusedWith(page, name, 'A name can be at most 120 characters (this one has 250).');
  await expect(name).toHaveValue('B'.repeat(250));
  expect((await storedHealth(page))?.foods ?? []).toHaveLength(0);
});

test('MO-109: the soft check names the form\'s own button', async ({page}) => {
  await start(page, '?view=foods');
  await page.getByRole('button', {name: 'New food', exact: true}).click();
  const food = page.getByRole('form', {name: 'Food details'});
  await food.getByLabel('Food name').fill('Oats'); await food.getByLabel('Serving weight (g)').fill('40'); await food.getByLabel('Calories (kcal)').fill('150');
  await food.getByRole('button', {name: 'Save food'}).click();
  await healthView(page, 'Diary').click();
  const meal = page.getByRole('form', {name: 'Log a meal'});
  await meal.getByLabel('Food or recipe').selectOption({label: 'Oats · food'});
  await meal.getByLabel('Servings', {exact: true}).fill('1000');
  await meal.getByRole('button', {name: 'Log to diary'}).click();
  await expect(meal.getByText('1,000 servings in one entry is a lot. If it is right, press Log to diary again to keep it.')).toBeVisible();
});
