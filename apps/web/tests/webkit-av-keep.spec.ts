import {expect, test} from '@playwright/test';
import {card, device, notes, openCard, reminder} from './av-keep-helpers';

/**
 * Session AV Part 3 (ADR-045 D-KEEP; owner amendment 5), on an iPhone (the phone project, and CI's WebKit set): Safari can
 * clear a website's records after seven days without a visit, and ZIGoals on the Home Screen has its own storage. In a
 * Safari tab Today says how to move (export here first, add to the Home Screen, restore there); the Home Screen app's first
 * run offers "Restore a backup from Safari", so nobody opens it and thinks their records are gone. Below the hero; 44 px.
 */
test.skip(({isMobile}) => !isMobile, 'an iPhone');

test('a Safari tab with records: export first, then Add to Home Screen, then restore; Remind me later, then Got it', async ({page}) => {
  await device(page, {'zigoals:notes:v1': notes(4)});
  await page.goto('/app');
  const move = card(page);
  await expect(move.getByRole('heading', {name: 'Keep your records on this iPhone'})).toBeVisible();
  // One row on a phone (Today stays short); it opens.
  expect((await move.boundingBox())!.height).toBeLessThan(120);
  await openCard(page);
  await expect(move).toContainText('Safari can clear a website’s records after seven days without a visit');
  await expect(move).toContainText('export a backup here, then open ZIGoals from your Home Screen and restore it');
  await move.getByText('How to move, in 3 steps', {exact: true}).click();
  const steps = move.locator('ol li');
  await expect(steps).toHaveCount(3);
  await expect(steps.nth(0)).toContainText('Export a backup here');
  await expect(steps.nth(1)).toContainText('Add to Home Screen');
  await expect(steps.nth(2)).toContainText('restore the backup');
  for (const name of ['Export a backup', 'Got it', 'Remind me later']) expect((await move.getByRole('button', {name, exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await move.getByRole('button', {name: 'Remind me later', exact: true}).click();
  await expect(card(page)).toHaveCount(0);
  expect((await reminder(page))?.iosNoteLaterOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  // Seven days later it is back; Got it ends it.
  await page.evaluate(() => { const r = JSON.parse(localStorage.getItem('zigoals:backup-reminder:v1')!); r.iosNoteLaterOn = '2026-01-01'; localStorage.setItem('zigoals:backup-reminder:v1', JSON.stringify(r)); });
  await page.reload();
  await openCard(page);
  await card(page).getByRole('button', {name: 'Got it', exact: true}).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload(); await expect(page.locator('main h1').first()).toBeVisible();
  await expect(card(page)).toHaveCount(0);
});

test('a fresh Safari tab (no records yet): start on the Home Screen', async ({page}) => {
  await device(page, {'zigoals:tasks:v1': JSON.stringify({version: 1, tasks: []})});
  await page.goto('/app');
  await expect(card(page).getByRole('heading', {name: 'Use ZIGoals from your Home Screen'})).toBeVisible();
  await openCard(page);
  await expect(card(page)).toContainText('Add to Home Screen');
  await expect(card(page).getByRole('button', {name: 'Export a backup'})).toHaveCount(0);
});

test('the Home Screen app, empty on its first run: "Restore a backup from Safari" opens the restore', async ({page}) => {
  await device(page, {}, {homeScreen: true});
  await page.goto('/app');
  const offer = card(page);
  await expect(offer.getByRole('heading', {name: 'Coming from Safari?'})).toBeVisible();
  await expect(offer).toContainText('It is still in Safari.');
  await offer.getByRole('link', {name: 'Restore a backup from Safari', exact: true}).click();
  await page.waitForURL('**/app/settings/data#restore');
  await expect(page.getByRole('heading', {name: 'Restore from a backup'})).toBeVisible();
  expect((await reminder(page))?.restoreOfferDoneOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
