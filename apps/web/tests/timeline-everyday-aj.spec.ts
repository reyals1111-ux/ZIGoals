import {expect, test, type Page} from '@playwright/test';
import {ID, seedChecklist, stored} from './checklist-fixtures';
import {DAY_TIMELINE_KEY} from '../lib/af-extras-keys';

// Session AJ (item 35): "Every day, on all my devices" keeps a habit's time in the synced habit extras (not this device's
// move), the block says where its time comes from, Undo puts it back, and "Remove its everyday time" clears it.
async function at(page: Page, clock: string) { const day = new Date().toISOString().slice(0, 10); await page.clock.install({time: new Date(`${day}T${clock}:00.000Z`)}); }
test('a habit\'s everyday time on all devices, from the Day Timeline', async ({page}) => {
  await at(page, '10:30');
  await seedChecklist(page);
  await page.goto('/app/timeline');
  await expect(page.locator('.timeline-page')).toHaveAttribute('data-timeline', 'ready');
  const row = page.locator(`[data-block="habit:${ID.stretch}"]`);
  await row.getByRole('button', {name: /^Change the time of /}).click();
  const picker = row.getByRole('form', {name: /^Change the time of /});
  await picker.getByLabel('Time').fill('06:30');
  await picker.getByLabel('Every day, on all my devices').check();
  await picker.getByRole('button', {name: 'Save time'}).click();
  await expect(row.locator('.timeline-time')).toHaveText('6:30 AM');
  await expect(row).toContainText('at its habit time');
  const extras = await stored(page, 'zigoals:habit-extras:v1') as {times?: Record<string, string>};
  expect(extras.times).toEqual({[ID.stretch]: '06:30'});
  expect(await stored(page, DAY_TIMELINE_KEY)).toBeNull(); // no device-only move was written
  await row.getByRole('button', {name: /^Change the time of /}).click();
  await row.getByRole('button', {name: 'Remove its everyday time'}).click();
  await expect(row.locator('.timeline-time')).toHaveText('8:00 AM');
  expect(((await stored(page, 'zigoals:habit-extras:v1')) as {times?: Record<string, string>}).times).toBeUndefined();
});
