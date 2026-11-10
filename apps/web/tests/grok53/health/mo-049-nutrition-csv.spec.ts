import {expect, test} from '@playwright/test';
import {freshHealth, openHealth, storedHealth} from './al-health-helpers';

// Session AL lane L2, third pass (P-MO-61): Moscow MO-049, MO-050, MO-051, MO-138 on Health → Diary → "Import a nutrition
// CSV", with the bot's two fixtures. Desktop, fresh empty profile, Brussels.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const MFP = 'Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g),Sodium (mg)\n2026-11-03,Breakfast,420,12,55,22,200\n2026-11-03,Dinner,700,25,70,40,800\n2026-11-03,Lunch,abc,1,1,1,1\n2026-11-03,Snacks,-100,1,1,1,1\n';
const CRONO = 'Day,Group,Food Name,Amount,Energy (kcal)\n2026-11-02,Breakfast,Oats,50 g,190\n2026-11-03,Dinner,"Chicken, grilled",120 g,198\n2026-11-03,Snacks,"=HYPERLINK(""x"")",1 serving,10\n';

async function open(page: import('@playwright/test').Page) {
  await page.getByText('Import a nutrition CSV', {exact: true}).click();
  await page.getByRole('button', {name: 'Choose a file', exact: true}).click();
  return page.getByRole('region', {name: 'Import meals', exact: true});
}

test('MO-049/MO-138: each refused row says why (negative is not "not a number"); sodium and the meal total show', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page, '?view=diary');
  const panel = await open(page);
  await panel.getByLabel('CSV file').setInputFiles({name: 'mfp-nutrition.csv', mimeType: 'text/csv', buffer: Buffer.from(MFP)});
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-refused')).toContainText('Row 3: Calories “abc” is not a number.');
  await expect(panel.locator('.import-refused')).toContainText('Row 4: Calories “-100” is negative; amounts start at 0.');
  const preview = panel.locator('.import-preview');
  await expect(preview).toContainText('Breakfast (meal total) · 1 serving · 420 kcal');
  await expect(preview).not.toContainText('Breakfast · Breakfast');
  await expect(preview).toContainText('sodium 200 mg');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Import 2 entries', exact: true}).click();
  await expect(panel.getByRole('status')).toContainText('2 entries and 0 foods imported.');
  // MO-051: the next file can be chosen right here.
  await expect(panel.getByLabel('CSV file')).toBeAttached();
  // MO-138: after Undo the line no longer says "imported".
  await panel.getByRole('region', {name: 'Recent imports'}).getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(panel.getByRole('status')).toHaveText('Import undone. Its entries and foods were removed from your journal.');
  await expect.poll(async () => (await storedHealth(page))!.diary.length).toBe(0);
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(page.locator('#import-meals')).toHaveAttribute('open', '');
});

test('MO-050: Cronometer amounts are the serving ("1 serving of 50 g"); a formula-looking name is flagged and kept as text', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page, '?view=diary');
  const panel = await open(page);
  await panel.getByLabel('CSV file').setInputFiles({name: 'cronometer-servings.csv', mimeType: 'text/csv', buffer: Buffer.from(CRONO)});
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(panel.locator('.import-preview')).toContainText('Oats · 1 serving of 50 g · 190 kcal');
  await expect(panel.locator('.import-preview')).toContainText('Chicken, grilled · 1 serving of 120 g · 198 kcal');
  await expect(panel.locator('.import-warnings')).toContainText('starts like a spreadsheet formula');
  await panel.getByRole('button', {name: 'Next', exact: true}).click();
  await panel.getByRole('button', {name: 'Import 3 entries', exact: true}).click();
  await expect.poll(async () => (await storedHealth(page))!.foods.map(f => [f.name, f.servingGrams])).toEqual([['Oats', 50], ['Chicken, grilled', 120]]);
});
