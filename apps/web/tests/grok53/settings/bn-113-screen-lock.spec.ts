import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';
import {openSettings} from '../../settings-open';

// Session AL (lane L6, Part 2): the screen lock (Berlin BN-113 / BN-185, Nairobi NB-145). Berlin typed invalid PINs
// and the lock ended up on with a PIN nobody chose: the fields silently dropped letters and cut a 9th digit. Fictional
// PINs only. Berlin's width (desktop 1280) and a fresh empty profile.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });
const stored = (page: Page) => page.evaluate(() => localStorage.getItem('zigoals:device-lock:v1'));

test('BN-113/NB-145: invalid PINs are refused at the field and never turn the lock on', async ({page}) => {
  await openSettings(page); await hydrated(page);
  const card = page.locator('#device-lock'), pin = card.getByLabel('PIN (4 to 8 digits)'), again = card.getByLabel('The same PIN again');
  const turnOn = card.getByRole('button', {name: 'Turn the lock on'});
  for (const [a, b, why] of [['12', '12', /this one has 2/], ['12ab34', '12ab34', /digits only/], ['123456789', '123456789', /this one has 9/]] as const) {
    await pin.fill(a); await again.fill(b); await turnOn.click();
    await expect(card.locator('.field-error').first()).toContainText(why);
    await expect(pin).toHaveAttribute('aria-invalid', 'true');
    expect(await stored(page)).toBeNull();
  }
  // Two different PINs: refused, and the confirmation is cleared so it can never confirm a later PIN.
  await pin.fill('1234'); await again.fill('1235'); await turnOn.click();
  await expect(card.locator('.field-error')).toContainText('The two PINs differ');
  await expect(again).toHaveValue('');
  await pin.fill('1235'); await turnOn.click();
  await expect(card.locator('.field-error')).toContainText('Type the same PIN again');
  expect(await stored(page)).toBeNull();
  await expect(turnOn).toBeVisible();
  // Two equal valid entries: on, with the every-tab warning in the card.
  await pin.fill('2468'); await again.fill('2468'); await turnOn.click();
  await expect(card.getByRole('status')).toContainText('The lock is on.');
  await expect(card).toContainText('every tab and window of this browser profile locks');
  expect(await stored(page)).not.toBeNull();
});

test('BN-113: turning the lock off asks for the PIN; a wrong PIN keeps it on', async ({page}) => {
  await openSettings(page); await hydrated(page);
  const card = page.locator('#device-lock');
  await card.getByLabel('PIN (4 to 8 digits)').fill('2468'); await card.getByLabel('The same PIN again').fill('2468');
  await card.getByRole('button', {name: 'Turn the lock on'}).click();
  const offField = card.getByLabel('Your PIN, to turn the lock off');
  await card.getByRole('button', {name: 'Turn the lock off'}).click();
  await expect(card.locator('.field-error')).toContainText('Type your PIN');
  await offField.fill('1111'); await card.getByRole('button', {name: 'Turn the lock off'}).click();
  await expect(card.locator('.field-error')).toContainText('That PIN is not right');
  expect(await stored(page)).not.toBeNull();
  await offField.fill('2468'); await card.getByRole('button', {name: 'Turn the lock off'}).click();
  await expect(card.getByRole('status')).toHaveText('The lock is off.');
  expect(await stored(page)).toBeNull();
});

test('BN-185/NB-145: "Forgot the PIN?" offers erasing this device\'s data, after a typed confirmation', async ({page, context}) => {
  await openSettings(page); await hydrated(page);
  const card = page.locator('#device-lock');
  await card.getByLabel('PIN (4 to 8 digits)').fill('2468'); await card.getByLabel('The same PIN again').fill('2468');
  await card.getByRole('button', {name: 'Turn the lock on'}).click();
  await page.evaluate(() => localStorage.setItem('zigoals:al-probe', 'kept until erased'));
  const tab = await context.newPage(); await offlineApi(tab);
  await tab.goto('/app'); await hydrated(tab);
  const lock = tab.getByRole('dialog', {name: 'ZIGoals is locked on this device'});
  await lock.getByRole('button', {name: 'Forgot the PIN?'}).click();
  await lock.getByRole('button', {name: /Erase this device.s data/}).click();
  const erase = lock.getByRole('button', {name: 'Erase everything on this device'});
  await expect(erase).toBeDisabled();
  await lock.getByLabel('Type ERASE to confirm').fill('ERASE');
  await erase.click();
  await expect(lock).toHaveCount(0, {timeout: 20_000});
  await hydrated(tab);
  expect(await tab.evaluate(() => [localStorage.getItem('zigoals:device-lock:v1'), localStorage.getItem('zigoals:al-probe')])).toEqual([null, null]);
});
