import {expect, test, type Page} from '@playwright/test';
import {TITLE, fixturePath, seedChecklist, settled, stored} from '../../checklist-fixtures';
import {HEALTH_STORAGE_KEY} from '../../../lib/health';
import {addFavourite} from '../../../lib/checklist/store';

/**
 * Session AL second pass (lane L5, Checklist; the path, river, labels, top bar and layout are unchanged — O6).
 * P-LS-19 (LS-016, LS-056, LC-002): with a daily water target Water lights at the target, not after one glass.
 * P-LS-08: Ctrl/⌘+Z runs the toast's Undo here too (the Checklist's own slot and pins unchanged).
 * PR-070 / P-PR-19: an item's handle moves one place per arrow press and says so at the very top.
 * PR-071 / P-PR-20: the orbit Quick add says it makes a habit and where a one-off belongs.
 * Fresh profile, 1280 px.
 */
test.beforeEach(async ({page}) => { await page.setViewportSize({width: 1280, height: 900}); });
async function open(page: Page) {
  const path = addFavourite(fixturePath(), {kind: 'health', input: 'water'}, {id: 'ck_water', at: new Date(), section: 'morning'});
  await seedChecklist(page, {path});
  await page.goto('/app/checklist'); await settled(page);
}

test('P-LS-19: with a 2,000 ml target, Water is not done at 300 ml and is done at 2,000 ml', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: /^Water: not done yet/}).first().click();
  const stepper = page.getByRole('form', {name: 'Log Water'});
  await stepper.getByRole('textbox').fill('300');
  await stepper.getByRole('button', {name: 'Log 300 ml'}).click();
  await expect.poll(async () => (await stored<{daily?: {water: unknown[]}}>(page, HEALTH_STORAGE_KEY))?.daily?.water.length).toBe(1);
  // Set the daily target as Health does, then read the path again.
  await page.evaluate(k => { const h = JSON.parse(localStorage.getItem(k)!); h.daily.preferences.waterTargetMl = 2000; localStorage.setItem(k, JSON.stringify(h)); }, HEALTH_STORAGE_KEY);
  await page.reload(); await settled(page);
  await expect(page.getByRole('button', {name: /^Water: 300 ml today of 2,000 ml: not done yet/})).toBeVisible();
  await page.getByRole('button', {name: /^Water: 300 ml today of 2,000 ml/}).first().click();
  const again = page.getByRole('form', {name: 'Log Water'});
  await again.getByRole('textbox').fill('1700');
  await again.getByRole('button', {name: 'Log 1700 ml'}).click();
  await expect(page.getByRole('button', {name: /^Water: 2,000 ml today of 2,000 ml: done$/})).toBeVisible();
});

test('P-LS-08: Ctrl+Z runs the toast’s Undo on the Checklist', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: `${TITLE.custom}: not done yet`, exact: true}).click();
  await expect(page.getByRole('button', {name: new RegExp(`^${TITLE.custom}.*: done`)})).toBeVisible();
  await expect(page.locator('.aa-toast').getByRole('button', {name: 'Undo'})).toBeVisible();
  await page.keyboard.press('Control+z');
  await expect(page.getByRole('button', {name: `${TITLE.custom}: not done yet`, exact: true})).toBeVisible();
});

test('PR-070: arrow presses move one place each; at the very top the status says so', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: 'Checklist menu'}).click().catch(() => undefined);
  await page.getByRole('button', {name: 'Edit path', exact: true}).click();
  const edit = page.getByRole('region', {name: 'Edit path'});
  const order = () => edit.locator('.checklist-edit-label strong').allTextContents();
  // Session AL (fix-up, spec): allTextContents() does not wait, so wait for the rows before reading their order.
  await expect(edit.locator('.checklist-edit-label strong').first()).toBeVisible();
  const first = (await order())[0]!;
  await edit.getByRole('button', {name: `Move ${first}: drag, or use the arrow keys`}).press('ArrowUp');
  await expect(edit.getByRole('status')).toContainText(`${first} is already first on your path.`);
  const third = (await order())[2]!;
  const handle = edit.getByRole('button', {name: `Move ${third}: drag, or use the arrow keys`});
  await handle.press('ArrowUp');
  await expect(handle).toBeFocused();
  await handle.press('ArrowUp');
  // Two places up (across into the orbit before counts as a place).
  await expect.poll(async () => (await order()).indexOf(third)).toBeLessThan(2);
});

test('PR-071: the orbit Quick add says it makes a habit, and that a one-off belongs in Tasks', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: 'Quick add to your Checklist'}).click();
  const quick = page.locator('.checklist-quick-what');
  await expect(quick).toContainText('This adds a habit to your path');
  await expect(quick.getByRole('link', {name: 'Tasks'})).toHaveAttribute('href', '/app/tasks?add=1');
});
