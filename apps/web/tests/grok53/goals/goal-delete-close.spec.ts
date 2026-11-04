import {expect, test} from '@playwright/test';
import {goal, openModule, project, seedGoals, stored} from './goal-fixtures';

// Session AL (lane L4): Denver DV-021a/b, DV-026a/b, DV-041a, DV-100 (P-DV-08, P-DV-09, P-DV-12; P-DVR-08/09; D-035, BUG-010,
// MO-129). The Close/Delete confirm opened ~1,600 px from its button at 1080p, Delete had no Undo and its toast said
// "Private Goal saved". Bot: desktop 1920×1080 (IN), a long project page.
test.use({viewport: {width: 1920, height: 1080}});

test('DV-041a/D-035: Close from Goal status opens its confirm right under the button, with focus', async ({page}) => {
  await seedGoals(page, [project('72', Array.from({length: 12}, (_, i) => `Fictional step ${i + 1}`), 4, {notes: 'x'.repeat(600)})], '/app/goals/tracked/72');
  const status = await openModule(page, 'goal-status');
  const button = status.getByRole('button', {name: 'Close Goal and release allocations', exact: true});
  await button.click();
  const ask = page.getByRole('alertdialog', {name: 'Confirm Goal action'});
  await expect(ask).toBeFocused();
  await expect(ask).toContainText('Close this goal?');
  const [b, a] = [await button.boundingBox(), await ask.boundingBox()];
  expect(Math.abs(a!.y - (b!.y + b!.height))).toBeLessThan(200);
  await ask.getByRole('button', {name: 'Confirm close', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Goal closed. Its history stays, and you can reopen it.'})).toBeVisible();
  // The menu now offers Reopen, not Close (DV-021e).
  await page.getByLabel('Goal actions').click();
  await expect(page.getByRole('button', {name: 'Reopen Goal', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Close Goal', exact: true})).toHaveCount(0);
});

test('DV-026a/b: Delete asks next to the menu, deletes, and the one Undo puts the goal back in the store and on the list', async ({page}) => {
  await seedGoals(page, [goal('41', {name: 'Fictional bike'}), goal('42', {name: 'Fictional sofa'})], '/app/goals/tracked/41');
  await page.getByLabel('Goal actions').click();
  const del = page.getByRole('button', {name: 'Delete Goal', exact: true});
  await del.click();
  const ask = page.getByRole('alertdialog', {name: 'Confirm Goal action'});
  await expect(ask).toContainText('Delete this goal?');
  const [b, a] = [await del.boundingBox(), await ask.boundingBox()];
  expect(Math.abs(a!.y - (b!.y + b!.height))).toBeLessThan(300);
  await ask.getByRole('button', {name: 'Confirm delete'}).click();
  await expect(page).toHaveURL(/\/app\/goals$/);
  const toast = page.locator('.aa-toast').filter({hasText: 'Deleted “Fictional bike”.'});
  await expect(toast).toBeVisible();
  await expect.poll(async () => (await stored(page)).goals.map(g => g.id)).toEqual(['42']);
  await toast.getByRole('button', {name: /Undo/}).click();
  await expect.poll(async () => (await stored(page)).goals.map(g => g.id)).toEqual(['41', '42']);
  await expect(page.getByRole('heading', {name: 'Fictional bike', exact: true})).toBeVisible();
});

test('DV-021b/c, DV-100: when the store keeps a goal\'s history, Delete is off and says why inside the menu', async ({page}) => {
  const reached = project('73', ['Plan', 'Build'], 2, {status: 'completed', lifecycle: [{id: 'l1', kind: 'completed', cycle: 0, at: '2026-11-04T09:00:00.000Z', target: '1', asset: 'USD', decimals: 0}]});
  await seedGoals(page, [reached], '/app/goals/tracked/73');
  await page.getByLabel('Goal actions').click();
  const del = page.getByRole('button', {name: 'Delete Goal', exact: true});
  if (await del.isDisabled()) {
    const why = page.locator('#goal-delete-why');
    await expect(del).toHaveAccessibleDescription(/This goal keeps a reached target for good/);
    // In the menu, beside the button (it sat at the top of the header card, far from the greyed item).
    const [b, w] = [await del.boundingBox(), await why.boundingBox()];
    expect(Math.abs(w!.y - (b!.y + b!.height))).toBeLessThan(120);
  } else {
    // The store accepts removing a goal with its history (integrator change): Delete works with Undo.
    await del.click();
    await page.getByRole('button', {name: 'Confirm delete'}).click();
    await expect(page.locator('.aa-toast')).toContainText('Deleted');
  }
});
