import {expect, test} from '@playwright/test';
import {freshHealth, openHealth, storedHealth} from './al-health-helpers';

// Session AL lane L2 (P-NB-27, the Health side): Nairobi NB-081/NB-089. Undo on "Water logged: 250 mL" left the entry.
// Health's one-tap water now offers the app's one Undo, which removes exactly that entry from the store; the store record
// and the card both say so. (Today's water tile is the same call, owned by its lane.) Desktop, Dark, a fresh profile.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}, colorScheme: 'dark'});

test('P-MO-97/MO-111: a double click on "Add 250 mL" logs one entry', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page);
  const water = page.getByRole('region', {name: 'Water journal'});
  await water.getByRole('button', {name: 'Add 250 mL', exact: true}).dblclick();
  await expect(water).toContainText('250 mL recorded');
  await page.clock.fastForward(2_000);
  await expect.poll(async () => (await storedHealth(page))?.daily?.water.length ?? 0).toBe(1);
});

test('NB-081/NB-089: water toast Undo removes the entry it logged, and keeps one logged since', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T01:13:00.000Z')});
  await freshHealth(page);
  await openHealth(page);
  const water = page.getByRole('region', {name: 'Water journal'});
  await water.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water).toContainText('250 mL recorded');
  const toast = page.locator('.aa-toast');
  await expect(toast).toContainText('Water logged: 250 mL.');
  await toast.getByRole('button', {name: /^Undo/}).click();
  await expect(toast).toContainText('Water entry removed.');
  await expect(water).toContainText('No water entries yet');
  await expect.poll(async () => (await storedHealth(page))?.daily?.water.length ?? 0).toBe(0);
  // Two taps, Undo on the second: the first stays, in the store and on the card. (A second tap within 350 ms is a double
  // click and is ignored, P-MO-97, so the taps are apart; the event's own time is real time.)
  await page.waitForTimeout(400);
  await water.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water).toContainText('250 mL recorded');
  await page.waitForTimeout(400);
  await water.getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water).toContainText('500 mL recorded');
  await toast.getByRole('button', {name: /^Undo/}).click();
  await expect(water).toContainText('250 mL recorded');
  await expect.poll(async () => (await storedHealth(page))?.daily?.water.length ?? 0).toBe(1);
});
