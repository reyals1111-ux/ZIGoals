import {expect, test} from '@playwright/test';
import {createEmptyHealth, saveFood} from '../../../lib/health';
import {freshHealth, openHealth, storedHealth} from './al-health-helpers';

// Session AL lane L2, third pass, competitor rows built: GAP-045 (C-MO-03) your own meal names and times, GAP-079
// (C-MO-09) a drink's type and caffeine, GAP-048 (C-MO-08) cups and spoons for a food measured in millilitres. Desktop
// and 375 px, fresh profile.
test.use({timezoneId: 'Europe/Brussels'});
const AT = '2026-11-04T08:00:00.000Z';
const milk = {id: 'health_00000000-0000-4000-8000-000000000101', name: 'Milk', brand: '', servingGrams: null, servingMl: 250, nutrients: {kcal: 160, proteinMg: 8000, carbsMg: 12000, fatMg: 9000}, createdAt: AT, updatedAt: AT};
for (const width of [1280, 375]) test.describe(`${width}px`, () => {
  test.use({viewport: {width, height: 900}});

  test('GAP-045: Breakfast renamed "Pre-workout · 06:45" in the Diary and the meal menu; Undo puts it back', async ({page}) => {
    await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
    await freshHealth(page, saveFood(createEmptyHealth(), milk));
    await openHealth(page, '?view=diary');
    await page.locator('summary', {hasText: 'Name your meals and set their times'}).click();
    const row = page.getByRole('form', {name: 'Breakfast: name and time'});
    await row.getByLabel('Breakfast shows as').fill('Pre-workout');
    await row.getByLabel('Usual time (optional)').fill('06:45');
    await row.getByRole('button', {name: 'Save breakfast name'}).click();
    await expect(page.getByRole('region', {name: 'Pre-workout diary'}).getByRole('heading', {level: 2})).toHaveText('Pre-workout · 06:45');
    await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).click();
    await expect(page.getByRole('region', {name: 'Breakfast diary'})).toBeVisible();
  });

  test('GAP-079: a coffee with 95 mg caffeine counts as water and its caffeine is said; GAP-048: 1 US cup of milk logs 236.6 mL', async ({page}) => {
    await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
    await freshHealth(page, saveFood(createEmptyHealth(), milk));
    await openHealth(page, '?view=diary');
    const water = page.getByRole('form', {name: 'Water entry'});
    await water.getByLabel('Water amount').fill('250');
    await water.getByLabel('Drink').selectOption('coffee');
    await water.getByLabel('Caffeine (mg, optional)').fill('95');
    await water.getByRole('button', {name: 'Log water'}).click();
    const card = page.getByRole('region', {name: 'Water journal'});
    await expect(card.locator('.health-drink-day')).toContainText('Coffee 250 mL · caffeine 95 mg from 1 drink');
    await expect(card).toContainText('250 mL recorded');
    if (width === 375) await page.getByRole('button', {name: 'Log a meal', exact: true}).click();
    await page.getByRole('combobox', {name: 'Food or recipe', exact: true}).selectOption({label: 'Milk · food'});
    await page.getByLabel('Quantity unit', {exact: true}).selectOption('cups');
    await page.getByLabel('Food volume (US cups)').fill('1');
    await expect(page.locator('.health-conversion-note')).toHaveText('1 US cups = 236.6 mL');
    await page.getByRole('button', {name: 'Log to diary', exact: true}).click();
    await expect.poll(async () => (await storedHealth(page))!.diary.map(e => e.quantityMilli)).toEqual([946]);
  });
});
