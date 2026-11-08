import {expect, test} from '@playwright/test';
import {goal, openModule, project, seedGoals, stored} from './goal-fixtures';

// Session AL (lane L4): Denver DV-021a/b, DV-026a/b, DV-041a, DV-100 (P-DV-08, P-DV-09, P-DV-12; P-DVR-08/09; D-035, BUG-010,
// MO-129). The Close/Delete confirm opened ~1,600 px from its button at 1080p, Delete had no Undo and its toast said
// "Private Goal saved". Bot: desktop 1920×1080 (IN), a long project page.
test.use({viewport: {width: 1920, height: 1080}});

test('DV-041a/D-035: Close from Goal status opens its confirm right under the button, with focus', async ({page}) => {
  await seedGoals(page, [project('72', Array.from({length: 12}, (_, i) => `Fictional step ${i + 1}`), 4, {notes: 'x'.repeat(600)})], '/app/goals/tracked/72');
  const status = await openModule(page, 'goal-status');
  const button = status.getByRole('button', {name: 'Close goal and release allocations', exact: true});
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
  // The menu's own Reopen (the Goal status card below keeps "Reopen Goal": two places, two names).
  await expect(page.getByRole('button', {name: 'Reopen this goal', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Close goal', exact: true})).toHaveCount(0);
});

test('DV-026a/b: Delete asks next to the menu, deletes, and the one Undo puts the goal back in the store and on the list', async ({page}) => {
  await seedGoals(page, [goal('41', {name: 'Fictional bike'}), goal('42', {name: 'Fictional sofa'})], '/app/goals/tracked/41');
  await page.getByLabel('Goal actions').click();
  const del = page.getByRole('button', {name: 'Delete goal', exact: true});
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

test('DV-021b, BUG-010, P-DV-09: a goal with history deletes (its history goes with it) and the one Undo restores everything', async ({page}) => {
  // Session AL second pass: lib/positions.ts lets an unlocked goal leave together with all of its own records (TIER 3).
  const lifecycle = [{id: 'l1', kind: 'completed' as const, cycle: 0, at: '2026-11-04T09:00:00.000Z', target: '1', asset: 'USD', decimals: 0}];
  const reached = project('73', ['Plan', 'Build'], 2, {status: 'completed', lifecycle});
  await seedGoals(page, [reached], '/app/goals/tracked/73');
  await page.getByLabel('Goal actions').click();
  const del = page.getByRole('button', {name: 'Delete goal', exact: true});
  await expect(del).toBeEnabled();
  await del.click();
  await page.getByRole('button', {name: 'Confirm delete'}).click();
  await expect(page).toHaveURL(/\/app\/goals$/);
  const toast = page.locator('.aa-toast').filter({hasText: 'Deleted'});
  await expect(toast).toBeVisible();
  await expect.poll(async () => (await stored(page)).goals.length).toBe(0);
  await toast.getByRole('button', {name: /Undo/}).click();
  await expect.poll(async () => (await stored(page)).goals[0]?.lifecycle).toEqual(lifecycle);
});

test('DV-021c, DV-100: a locked goal keeps Delete off and says why inside the menu, beside the button', async ({page}) => {
  await seedGoals(page, [goal('74', {locked: true})], '/app/goals/tracked/74');
  await page.getByLabel('Goal actions').click();
  const del = page.getByRole('button', {name: 'Delete goal', exact: true});
  await expect(del).toBeDisabled();
  await expect(del).toHaveAccessibleDescription('Unlock this goal to delete it.');
  const [b, w] = [await del.boundingBox(), await page.locator('#goal-delete-why').boundingBox()];
  expect(Math.abs(w!.y - (b!.y + b!.height))).toBeLessThan(120);
});

const cash = {id: 'cash', providerId: 'Fictional cash', sourceType: 'MANUAL', network: 'manual', account: 'local', asset: 'USD', denom: 'USD', quantity: '10000', decimals: 2, verification: 'MANUAL', sync: 'MANUAL', liquidity: 'LIQUID', observedAt: '2026-11-04T08:00:00.000Z', provenance: 'User entry', assetClass: 'Cash', valuation: {value: '10000', currency: 'USD', decimals: 2, source: 'MANUAL', observedAt: '2026-11-04T08:00:00.000Z'}};

test('DV-099, P-DV-34: Close frees what the goal counted and its Undo reopens it and counts it again', async ({page}) => {
  await seedGoals(page, [goal('75', {name: 'Fictional fund'})], '/app/goals/tracked/75', {positions: [cash], allocations: [{goalId: '75', positionId: 'cash', quantity: '10000'}]} as never);
  await page.getByLabel('Goal actions').click();
  await page.getByRole('button', {name: 'Close goal', exact: true}).click();
  await page.getByRole('button', {name: 'Confirm close'}).click();
  const toast = page.locator('.aa-toast').filter({hasText: 'Goal closed. What it counted is free for other goals'});
  await expect(toast).toBeVisible();
  await expect.poll(async () => (await stored(page)).allocations).toEqual([]);
  await toast.getByRole('button', {name: /Undo/}).click();
  await expect.poll(async () => (await stored(page)).goals[0]?.status).not.toBe('closed');
  await expect.poll(async () => (await stored(page)).allocations).toEqual([{goalId: '75', positionId: 'cash', quantity: '10000'}]);
});

test('DV-099, P-DV-34: Reopen later says what closing freed (no silent 0 %)', async ({page}) => {
  const closed = goal('76', {name: 'Fictional trip', status: 'closed', lifecycle: [{id: 'c1', kind: 'closed', cycle: 0, at: '2026-11-04T08:30:00.000Z', target: '50000', asset: 'USD', decimals: 2}]});
  const snapshot = {id: 'v1', goalId: '76', kind: 'valuation', capturedAt: '2026-11-04T08:10:00.000Z', current: '10000', target: '50000', asset: 'USD', decimals: 2, actualContributed: '0', rewardIncome: '0', planned: '0', requiresReview: false, evidence: [{positionId: 'cash', quantity: '10000', counted: '10000'}]};
  await seedGoals(page, [closed], '/app/goals/tracked/76', {positions: [cash], goalHistory: [snapshot]} as never);
  await page.getByLabel('Goal actions').click();
  await page.getByRole('button', {name: 'Reopen this goal', exact: true}).click();
  const toast = page.locator('.aa-toast').filter({hasText: 'Before it closed it counted $100.00'});
  await expect(toast).toBeVisible();
  await toast.getByRole('button', {name: 'Count it again'}).click();
  await expect.poll(async () => (await stored(page)).allocations).toEqual([{goalId: '76', positionId: 'cash', quantity: '10000'}]);
});
