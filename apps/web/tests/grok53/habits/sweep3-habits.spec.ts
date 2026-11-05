import {expect, test} from '@playwright/test';
import {createHabit, emptyDevice, open} from '../l3-helpers';
import {openHabitDetails} from '../../ab-shell';

/**
 * Session AL sweep 3 (lane SW3): DV-169/DV-206 (L4) and D-044 (L3). Desktop 1280 × 800, Nebula, a fresh profile,
 * Europe/Brussels, a fixed clock (Thursday 5 Nov 2026, 15:00). Written, not run here.
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 800}});
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-05T14:00:00Z')}); await emptyDevice(page, {theme: 'nebula'}); });

test('DV-169/DV-206: archiving a habit checked in today leaves a "Habit archived" row today, and the chips count the rows', async ({page}) => {
  const card = await createHabit(page, 'Drink water');
  await card.getByRole('button', {name: 'Complete Drink water', exact: true}).click();
  await openHabitDetails(card);
  await card.getByRole('button', {name: 'Archive habit'}).click();
  await card.getByRole('alertdialog', {name: 'Archive Drink water?'}).getByRole('button', {name: 'Archive habit', exact: true}).click();
  await open(page, '/app/activity');
  const rows = page.locator('.activity-event[data-category="HABIT"]');
  await expect(rows.filter({hasText: 'Habit archived'})).toHaveCount(1);
  await expect(rows.filter({hasText: 'Habit archived'})).toContainText('Drink water · from');
  // One selection for the list and its chip: the Habit chip says as many as the rows shown.
  await page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: /^Habit/}).click();
  const chip = await page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: /^Habit/}).innerText();
  expect(Number(/(\d+)\s*$/.exec(chip)![1])).toBe(await rows.count());
});

test('D-044: a schedule edit that keeps today\'s check-in as it is begins today', async ({page}) => {
  const card = await createHabit(page, 'Fictional walk');
  await card.getByRole('button', {name: 'Complete Fictional walk', exact: true}).click();
  await card.getByRole('button', {name: 'Edit Fictional walk'}).click();
  await page.getByRole('combobox', {name: 'Schedule', exact: true}).selectOption('weekdays');
  // Thursday stays on the schedule; type, unit and target are unchanged.
  await page.getByRole('button', {name: 'Save habit', exact: true}).click();
  await expect(card).not.toContainText('Scheduled change from');
  await expect(card).not.toContainText('Today keeps its current rule');
});
