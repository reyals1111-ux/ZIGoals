import {expect, test} from '@playwright/test';
import {TODAY, seeded, stored} from './ap-fixtures';

/**
 * Session AP (owner-approved feature list): "Days until", the person's own countdowns (`zigoals:countdowns:v1`, at most
 * 50), a Today card kept on this device and on the Agenda's day of the event. A passed one says "N days ago" under
 * Passed, never a negative "days left". Draft for the integrator to run.
 */
test.use({timezoneId: 'Europe/Brussels'});
const KEY = 'zigoals:countdowns:v1';
const at = '2026-11-01T09:00:00.000Z';
const COUNTDOWNS = {version: 1, items: [
  {id: 'ap-trip', title: 'Fictional trip', date: '2026-12-25', note: 'Pack light', createdAt: at},
  {id: 'ap-party', title: 'Fictional party', date: TODAY, createdAt: at},
  {id: 'ap-race', title: 'Fictional race', date: '2026-11-10', createdAt: at},
]};
const records = {[KEY]: COUNTDOWNS, 'zigoals:today-cards:v1': {version: 1, cards: ['countdowns']}};

test('the Today card: coming ones soonest first, passed ones "N days ago"; add one; remove with Undo', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'Today folds its device cards on a phone; the card itself is the same');
  await seeded(page, records, '/app');
  const card = page.locator('.today-device-card[data-card="countdowns"]');
  await expect(card.getByRole('heading', {name: 'Days until'})).toBeVisible();
  const coming = card.getByRole('list', {name: 'Coming up'}).locator('li');
  await expect(coming).toHaveCount(2);
  await expect(coming.nth(0)).toContainText('Today'); await expect(coming.nth(0)).toContainText('Fictional party');
  await expect(coming.nth(1)).toContainText('In 41 days'); await expect(coming.nth(1)).toContainText('Pack light');
  await card.getByText('Passed (1)').click();
  await expect(card.getByRole('list', {name: 'Passed'})).toContainText('4 days ago');
  await expect(card).not.toContainText(/-\d+ days|days left/);
  // Add one for tomorrow.
  await card.getByText('Add a countdown').click();
  const form = card.getByRole('form', {name: 'Add a countdown'});
  await form.getByLabel('Name').fill('Fictional dentist');
  await form.getByLabel('Date').fill('2026-11-15');
  await form.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(coming.filter({hasText: 'Fictional dentist'})).toContainText('Tomorrow');
  expect((await stored<typeof COUNTDOWNS>(page, KEY))!.items).toHaveLength(4);
  // Remove, then Undo.
  await card.getByRole('button', {name: 'Remove the countdown “Fictional trip”'}).click();
  await expect(coming.filter({hasText: 'Fictional trip'})).toHaveCount(0);
  await page.locator('.aa-toast').last().getByRole('button', {name: 'Undo'}).click();
  await expect(coming.filter({hasText: 'Fictional trip'})).toHaveCount(1);
});

test('on the Agenda: on the day of the event only', async ({page}) => {
  await seeded(page, {[KEY]: COUNTDOWNS}, '/app/agenda?view=day');
  await expect(page.locator('.agenda-page[data-agenda="ready"]')).toBeVisible();
  const today = page.getByRole('list', {name: 'Days until'});
  await expect(today).toContainText('Fictional party'); await expect(today).toContainText('Countdown · today');
  await expect(today).not.toContainText('Fictional trip');
  await page.getByRole('button', {name: 'Next day'}).click();
  await expect(page.getByRole('list', {name: 'Days until'})).toHaveCount(0);
  // The hour grid shows it too.
  await page.getByRole('button', {name: 'Today', exact: true}).click();
  await page.getByRole('button', {name: 'By the hour', exact: true}).click();
  await expect(page.locator('.agenda-hours').getByRole('list', {name: 'Days until'})).toContainText('Fictional party');
});
