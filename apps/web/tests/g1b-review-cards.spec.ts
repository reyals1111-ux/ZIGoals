import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';
import {MONEY_REVIEW_KEY} from '../lib/money-review/review';
import {MONEY_LOG_KEY, entry, freshDevice, moneyLog, moneyTools, openWealth, readRecord} from './g1b-fixtures';

/** Session AK, BUILD list 2 #9: the review inbox "One at a time": Accept, Skip, Make a rule, Undo; keys A, S, R, Z. */
test.use({timezoneId: 'UTC'});
const ids = async (page: import('@playwright/test').Page) => (await readRecord<{ids: string[]}>(page, MONEY_REVIEW_KEY))?.ids ?? [];

test('a fresh start: nothing to review, no card mode', async ({page}) => {
  await freshDevice(page);
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: 'To review (0)'}).click();
  await expect(page.locator('.money-panel')).toContainText('Nothing to review.');
  await expect(page.getByRole('button', {name: 'One at a time'})).toHaveCount(0);
});
test('one card at a time, by keyboard and by buttons, with Undo; the order is newest first', async ({page}) => {
  await freshDevice(page, {
    [MONEY_LOG_KEY]: moneyLog([entry('gym', -3, '29.99', 'Other', 'expense', 'Fictional Gym'), entry('bakery', -1, '3.50', 'Other', 'expense', 'Fictional Bakery'), entry('cafe', -2, '4.10', 'Food & drink', 'expense', 'Fictional Cafe')]),
    [MONEY_REVIEW_KEY]: {version: 1, ids: ['gym', 'bakery', 'cafe']},
  });
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: 'To review (3)'}).click();
  const mode = page.getByRole('button', {name: 'One at a time'});
  await mode.click();
  await expect(mode).toHaveAttribute('aria-pressed', 'true');
  const card = page.locator('.review-card');
  await expect(card.locator('.review-card-payee')).toHaveText('Fictional Bakery');
  await expect(page.locator('.review-cards-progress')).toHaveText('3 to go');
  // A big chip changes the category in place.
  await card.getByRole('button', {name: 'Food & drink'}).click();
  await expect(card.getByRole('button', {name: 'Food & drink'})).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await readRecord<{entries: {id: string; category: string}[]}>(page, MONEY_LOG_KEY))?.entries.find(e => e.id === 'bakery')?.category).toBe('Food & drink');
  // A accepts; Z undoes; S skips.
  await card.focus();
  await page.keyboard.press('a');
  await expect(card.locator('.review-card-payee')).toHaveText('Fictional Cafe');
  await expect.poll(() => ids(page)).toEqual(['gym', 'cafe']);
  await page.keyboard.press('z');
  await expect(card.locator('.review-card-payee')).toHaveText('Fictional Bakery');
  await expect.poll(async () => (await ids(page)).sort()).toEqual(['bakery', 'cafe', 'gym']);
  await page.keyboard.press('s');
  await expect(card.locator('.review-card-payee')).toHaveText('Fictional Cafe');
  await card.getByRole('button', {name: 'Accept', exact: true}).click();
  await card.getByRole('button', {name: 'Accept', exact: true}).click();
  await expect(page.locator('.review-cards-progress')).toHaveText('You skipped 1; it stays in To review.');
  await expect.poll(() => ids(page)).toEqual(['bakery']);
  await expect(moneyTools(page).getByRole('button', {name: 'To review (1)'})).toBeVisible();
  // R makes a rule from the skipped one.
  await page.getByRole('button', {name: 'Go through the skipped ones'}).click();
  await card.focus();
  await page.keyboard.press('r');
  await expect(page.getByRole('form', {name: 'Add a rule'})).toBeVisible();
});
test('the Showcase: labelled example cards (once the lead wires showcaseMoneyReview)', async ({page}) => {
  await loadShowcase(page);
  await openWealth(page);
  await moneyTools(page).getByRole('button', {name: /^To review \(\d+\)$/}).click();
  const mode = page.getByRole('button', {name: 'One at a time'});
  await mode.click();
  await expect(page.locator('.review-card .review-card-payee')).toContainText('SHOWCASE DATA');
});
