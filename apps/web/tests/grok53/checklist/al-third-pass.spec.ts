import {expect, test, type Locator, type Page} from '@playwright/test';
import {fixturePath, seedChecklist, settled, stored} from '../../checklist-fixtures';
import {HEALTH_STORAGE_KEY} from '../../../lib/health';
import {addFavourite} from '../../../lib/checklist/store';

/**
 * Session AL third pass (lanes L10b + L5, Checklist; the path, river, labels, top bar and layout are unchanged — O6).
 * LS-058 / P-LS-08: three quick removals in Edit path give one toast whose Undo puts all three back where they were (one
 * toast at a time: before, only the last could be undone). One removal reads exactly as before.
 * LS-057 / P-LS-20: the value stepper reads what was typed with the shared reader and limits table (PRIMITIVES 3d):
 * "-250" is refused and nothing is logged.
 * Fresh profile, 375 px (the bot's width).
 */
test.beforeEach(async ({page}) => { await page.setViewportSize({width: 375, height: 812}); });
async function open(page: Page) {
  const path = addFavourite(fixturePath(), {kind: 'health', input: 'water'}, {id: 'ck_water', at: new Date(), section: 'morning'});
  await seedChecklist(page, {path});
  await page.goto('/app/checklist'); await settled(page);
}
async function editPath(page: Page) {
  await page.getByRole('button', {name: 'Checklist menu'}).click().catch(() => undefined);
  await page.getByRole('button', {name: 'Edit path', exact: true}).click();
  const edit = page.getByRole('region', {name: 'Edit path'});
  // Session AL (fix-up, spec): allTextContents() does not wait, so wait for the rows before reading their order.
  await expect(edit.locator('.checklist-edit-label strong').first()).toBeVisible();
  return edit;
}
/** A row's Remove sits in its "Change …" controls (components/checklist/edit-path.tsx), so open them first. */
async function takeOff(edit: Locator, name: string) {
  await edit.getByRole('button', {name: `Change ${name}: orbit, colour, place`, exact: true}).click();
  await edit.getByRole('button', {name: `Take ${name} off your path`, exact: true}).click();
}

test('LS-058 / P-LS-08: three quick removals, one Undo puts all three back in their places', async ({page}) => {
  await open(page);
  const edit = await editPath(page);
  const order = () => edit.locator('.checklist-edit-label strong').allTextContents();
  const before = await order();
  expect(before.length).toBeGreaterThanOrEqual(3);
  const [a, , c] = before;
  const last = before.at(-1)!;
  for (const name of [a!, c!, last]) await takeOff(edit, name);
  await expect.poll(order).toEqual(before.filter(n => ![a, c, last].includes(n)));
  const toast = page.locator('.aa-toast');
  await expect(toast).toHaveCount(1);
  await expect(toast).toContainText('3 items are off your path. Their records stay on their pages.');
  await toast.getByRole('button', {name: 'Undo: put all 3 back'}).click();
  await expect(toast).toContainText('All 3 are back on your path.');
  await expect.poll(order).toEqual(before);
});

test('P-LS-08: one removal keeps its own words and Undo', async ({page}) => {
  await open(page);
  const edit = await editPath(page);
  const order = () => edit.locator('.checklist-edit-label strong').allTextContents();
  const before = await order(), name = before[1]!;
  await takeOff(edit, name);
  const toast = page.locator('.aa-toast');
  await expect(toast).toContainText(`${name} is off your path. Its records stay on its page.`);
  await toast.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(order).toEqual(before);
});

test('LS-057 / P-LS-20: "-250" in the water stepper is refused with the shared sentence; nothing is logged', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: /^Water: not done yet/}).first().click();
  const stepper = page.getByRole('form', {name: 'Log Water'});
  await stepper.getByRole('textbox').fill('-250');
  await expect(stepper.getByRole('button', {name: 'Log', exact: true})).toBeVisible();
  await expect(stepper).toContainText('Enter a number that is not negative.');
  await stepper.getByRole('button', {name: 'Log', exact: true}).click();
  await expect(stepper.getByRole('alert')).toHaveText('Enter a number that is not negative.');
  expect((await stored<{daily?: {water: unknown[]}}>(page, HEALTH_STORAGE_KEY))?.daily?.water.length ?? 0).toBe(0);
  // A decimal comma still reads: "0,25" is 0.25 ml, under the dot's 1 ml floor, so the stepper's own range sentence shows.
  await stepper.getByRole('textbox').fill('0,25');
  await expect(stepper).toContainText('Choose 1 to 5,000 ml.');
  await stepper.getByRole('textbox').fill('250');
  await stepper.getByRole('button', {name: 'Log 250 ml'}).click();
  await expect.poll(async () => (await stored<{daily?: {water: unknown[]}}>(page, HEALTH_STORAGE_KEY))?.daily?.water.length).toBe(1);
});
