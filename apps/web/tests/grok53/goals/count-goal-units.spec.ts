import {expect, test} from '@playwright/test';
import {books, seedGoals, stored} from './goal-fixtures';

// Session AL (lane L4): Denver DV-014 / DV-034b / DV-035 / DV-103 / DV-123 (P-DV-27). A count goal of your own unit read
// "20 ZIG"/"BOOKS" and could not be funded ("Choose the same asset as this quantity Goal."). Desktop ~1280, fresh profile.
test.use({viewport: {width: 1280, height: 800}});

test('DV-035/DV-103: "Read 20 books" is funded in books, and every view says books', async ({page}) => {
  await seedGoals(page, [books()], '/app/goals/tracked/71');
  const hero = page.getByTestId('tracked-progress');
  await expect(hero).toContainText('0 books');
  await expect(hero).toContainText('of 20 books');
  // The artefacts were the upper-case symbol ("20 BOOKS", "20 ZIG") and "CURRENT WEALTH" (any case); "books" itself is right.
  await expect(hero).not.toContainText(/BOOKS|\bZIG\b/);
  await expect(hero).not.toContainText(/current wealth/i);
  await page.getByRole('button', {name: 'Fund Goal', exact: true}).click();
  const sheet = page.getByRole('dialog');
  // No asset picker and no money value: the goal's own unit is chosen.
  await expect(sheet).not.toContainText('Choose the same asset');
  await sheet.getByLabel('How many books did you add?').fill('3');
  await sheet.getByRole('button', {name: 'Preview contribution'}).click();
  await expect(sheet).toContainText('3 books');
  await sheet.getByRole('button', {name: 'Confirm & fund Goal'}).click();
  await expect(hero).toContainText('3 books');
  await expect(hero).toContainText('of 20 books');
  expect((await stored(page)).contributions.map(c => [c.asset, c.quantity, c.fundingMode])).toEqual([['BOOKS', (3n * 10n ** 18n).toString(), 'FUND_GOAL']]);
  await page.goto('/app/goals');
  await expect(page.locator('[data-goal-key="private:71"]')).toContainText('17 books remaining');
  await expect(page.locator('[data-goal-key="private:71"]')).toContainText('Count goal');
  await page.goto('/app/activity');
  await expect(page.locator('.unified-activity')).toContainText('3 books');
});

test('DV-037: history-only books are named as such next to "Actual contributed"; progress stays as it was', async ({page}) => {
  await seedGoals(page, [books()], '/app/goals/tracked/71');
  await page.getByRole('button', {name: 'Record contribution', exact: true}).click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', {name: 'Record history only'}).click();
  await sheet.getByLabel('How many books (history only)').fill('3');
  await sheet.getByRole('button', {name: 'Save history only'}).click();
  await expect(page.getByTestId('tracked-progress')).toContainText('0 books');
  // Session AL (COPY_AUDIT, deliberate): DV-007a, "Funding Wealth" reads "Your saving plan" until the chain is chosen.
  // Session AL (COPY_AUDIT, deliberate; fourth pass DV-034a/DV-104): a count goal's panel is "Your plan" (books are not savings).
  await expect(page.getByRole('region', {name: 'Your plan overview'})).toContainText('Includes 3 books recorded as history only, which never changes progress');
});
