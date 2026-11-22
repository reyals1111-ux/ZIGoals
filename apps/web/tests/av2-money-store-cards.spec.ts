import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {STORE_CARDS_KEY, type StoreCards} from '../lib/store-cards/schema';

/**
 * Session AV lane 2, round 2 (money; Wallet's loyalty and club cards): Wealth → Spending → Store and club cards — a card
 * typed in (its EAN-13 check digit added and the format guessed), "Show" opening the barcode full screen in black on
 * white (a modal dialog, Escape and Done close it and focus returns to Show), a Code 128 card, and Remove with Undo — at
 * 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional numbers; the API offline.
 */
for (const theme of THEMES) test(`${theme}: a store card shown at the till`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-10', '12.00')])});
  await page.goto('/app/wealth'); await hydrated(page);
  const cards = spending(page).locator('.store-cards');
  await expect(cards).toContainText('Keep your loyalty and club cards here');
  await cards.getByRole('button', {name: '+ Add a card'}).click();
  const form = cards.getByRole('form', {name: 'Add a store card'});
  await form.getByLabel('Name').fill('Bonus card');
  await form.getByLabel('Card number').fill('400638133393');
  await form.getByLabel('Shown as').selectOption('ean13');
  await form.getByRole('button', {name: 'Keep the card'}).click();
  await expect.poll(async () => (await readRecord<StoreCards>(page, STORE_CARDS_KEY))?.cards[0]).toMatchObject({name: 'Bonus card', number: '4006381333931', format: 'ean13'});
  // Show: full screen, black on white, named for screen readers; Escape closes it and focus returns to Show.
  const showButton = cards.getByRole('button', {name: 'Show Bonus card at the till'});
  await showButton.click();
  const dialog = page.getByRole('dialog', {name: 'Bonus card'});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('img', {name: 'Bonus card: EAN-13 (13 digits) of 4006381333931'})).toBeVisible();
  await expect(dialog).toContainText('4006381333931');
  expect(await dialog.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
  const findings = await axe(page, dialog);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(showButton).toBeFocused();
  // A Code 128 card (letters and digits), then Remove with Undo.
  await cards.getByRole('button', {name: '+ Add a card'}).click();
  await form.getByLabel('Name').fill('Library');
  await form.getByLabel('Card number').fill('LIB-00042');
  await expect(form.getByLabel('Shown as')).toHaveValue('code128');
  await form.getByRole('button', {name: 'Keep the card'}).click();
  await cards.getByRole('button', {name: 'Show Library at the till'}).click();
  await expect(page.getByRole('dialog', {name: 'Library'}).getByRole('img', {name: /Code 128/})).toBeVisible();
  await page.getByRole('dialog', {name: 'Library'}).getByRole('button', {name: 'Done'}).click();
  await cards.getByRole('button', {name: 'Remove Library'}).click();
  await expect.poll(async () => (await readRecord<StoreCards>(page, STORE_CARDS_KEY)).cards.length).toBe(1);
  await page.getByRole('button', {name: /^Undo/}).click();
  await expect(cards.getByRole('button', {name: 'Show Library at the till'})).toBeVisible();
  const list = await axe(page, cards);
  expect(list.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(list)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
