import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (lane L6, second pass): Berlin BN-097. The Ecosystem ⋯ menu offered "Add … to Today" again after adding;
// now it reads Today's widgets: "On Today · Remove from Today", with Undo. Desktop 1280, fresh profile.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });
const widgets = (page: import('@playwright/test').Page) => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:settings:v1') ?? '{"widgets":[]}').widgets as {entity?: string}[]).filter(w => w.entity === 'valdora').length);

test('BN-097: Add, then the menu says On Today and removes it; Undo puts it back', async ({page}) => {
  await page.goto('/app/ecosystem'); await hydrated(page);
  const card = page.locator('#project-valdora');
  await card.getByRole('button', {name: 'Options for Valdora'}).click();
  // Session AO (DV-040g, deliberate): items are menuitems now
  await card.getByRole('menuitem', {name: 'Add Valdora research shortcut to Today'}).click();
  await expect(card.getByRole('status')).toContainText('added to Today');
  expect(await widgets(page)).toBe(1);
  await card.getByRole('button', {name: 'Options for Valdora'}).click();
  // Session AO (DV-040g, deliberate): items are menuitems now
  await expect(card.getByRole('menuitem', {name: /Add Valdora research shortcut/})).toHaveCount(0);
  // Session AO (DV-040g, deliberate): items are menuitems now
  await card.getByRole('menuitem', {name: 'On Today. Remove Valdora research shortcut from Today'}).click();
  await expect(card.getByRole('status')).toContainText('removed from Today');
  expect(await widgets(page)).toBe(0);
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
  await expect.poll(() => widgets(page)).toBe(1);
  await page.reload(); await hydrated(page);
  await card.getByRole('button', {name: 'Options for Valdora'}).click();
  // Session AO (DV-040g, deliberate): items are menuitems now
  await expect(card.getByRole('menuitem', {name: /On Today/})).toBeVisible();
});
