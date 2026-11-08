import {expect, test, type Page} from '@playwright/test';
import {fixturePath, seedChecklist, settled, stored} from '../../checklist-fixtures';
import {HEALTH_STORAGE_KEY} from '../../../lib/health';
import {addFavourite} from '../../../lib/checklist/store';

// Session AL lane L2, fifth pass (GROK53_REPLAY_L2_2.md, STILL OPEN): the Checklist's water and timers, in Lisbon's and the
// Professor's conditions (fresh profile at 01:30, 1280 Dark; the stepper at 375 × 844). The List and heat-map views are
// unchanged; these are the water adapter (lib/checklist) and the corner timers.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
const NIGHT = new Date('2026-11-04T00:30:00.000Z'); // 01:30 in Brussels
type Daily = {daily?: {water: {amountMilli: number}[]; preferences: {waterTargetMl: number | null}}};
async function open(page: Page) {
  await page.clock.install({time: NIGHT});
  const path = addFavourite(fixturePath(), {kind: 'health', input: 'water'}, {id: 'ck_water', at: NIGHT, section: 'morning'});
  await seedChecklist(page, {path});
  await page.goto('/app/checklist'); await settled(page);
}

test('LS-016, X3-26, LC-002: with no water target one glass leaves Water unlit; the stepper offers 2,000 ml; at it Water lights', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await open(page);
  await page.getByRole('button', {name: /^Water: not done yet/}).first().click();
  await page.getByRole('form', {name: 'Log Water'}).getByRole('button', {name: 'Log 250 ml'}).click();
  await expect(page.getByRole('button', {name: /^Water: 250 ml today, no daily target yet: not done yet/})).toBeVisible();
  await expect(page.locator('.checklist-progress-line')).toContainText('0 of 4 planets today');
  await page.getByRole('button', {name: /^Water: 250 ml today, no daily target yet/}).first().click();
  const ask = page.getByRole('group', {name: 'Daily water target'});
  await expect(ask).toContainText('No daily water target yet. Water lights up when the day reaches your target.');
  await ask.getByRole('button', {name: 'Use 2,000 ml a day'}).click();
  await expect(ask.getByRole('status')).toHaveText('Daily water target set: 2,000 ml. Change it in Health → Journal settings.');
  await expect.poll(async () => (await stored<Daily>(page, HEALTH_STORAGE_KEY))?.daily?.preferences.waterTargetMl).toBe(2000);
  await expect(page.getByRole('button', {name: /^Water: 250 ml today of 2,000 ml: not done yet/})).toBeVisible();
  const stepper = page.getByRole('form', {name: 'Log Water'});
  await stepper.getByRole('textbox').fill('1750');
  await stepper.getByRole('button', {name: 'Log 1750 ml'}).click();
  await expect(page.getByRole('button', {name: /^Water: 2,000 ml today of 2,000 ml: done$/})).toBeVisible();
});

test('LS-056: at 375 px "2.5" ml is refused under the field, in whole mL, and nothing is logged', async ({page}) => {
  await page.setViewportSize({width: 375, height: 844});
  await open(page);
  await page.getByRole('button', {name: /^Water: not done yet/}).first().click();
  const stepper = page.getByRole('form', {name: 'Log Water'}), field = stepper.getByRole('textbox');
  await field.fill('2.5');
  await expect(stepper.getByRole('button', {name: 'Log', exact: true})).toBeVisible();
  await stepper.getByRole('button', {name: 'Log', exact: true}).click();
  await expect(stepper.getByRole('alert')).toHaveText('Enter an amount of water in whole mL, more than 0 and at most 5,000 mL.');
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  expect((await stored<Daily>(page, HEALTH_STORAGE_KEY))?.daily?.water ?? []).toEqual([]);
});

test('PR-018: the Sleep tile asks before it starts, as Fast and Focus do; one minute is the minimum for every timer', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await open(page);
  const timers = page.getByRole('group', {name: 'Quick timers'}), sleep = timers.getByRole('button', {name: /^Sleep:/}), meditate = timers.getByRole('button', {name: /^Meditate:/});
  await sleep.click();
  await expect(sleep).toHaveAttribute('aria-pressed', 'false');
  const ask = page.getByRole('alertdialog', {name: 'Start sleep?'});
  await expect(ask).toContainText('Start sleep now? Tap Sleep again when you wake.');
  await ask.getByRole('button', {name: 'Cancel'}).click();
  await expect(sleep).toHaveAttribute('aria-pressed', 'false');
  // Meditate stopped after 21 seconds keeps nothing (it read "Meditation saved on Health: 21 seconds").
  await meditate.click();
  await expect(meditate).toHaveAttribute('aria-pressed', 'true');
  await page.clock.fastForward(21_000);
  await meditate.click();
  await expect(page.locator('.aa-toast')).toContainText('Stopped after less than a minute, so nothing was saved.');
  await expect(meditate).toHaveAttribute('aria-pressed', 'false');
});
