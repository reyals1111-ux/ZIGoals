import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (food, LEDGER #101, #108; Cronometer's diary timestamps, MacroFactor's nutrient timing): a Diary
 * entry shows the time it was logged; its time button changes it (07:15), and Health → Insights → "When you eat" puts
 * it in the morning — at 390 and 1440 in Nebula, Light and Dark, axe-clean, by keyboard, no sideways scroll at 320.
 * Fictional data; every /api call answers 503.
 */
for (const theme of THEMES) test(`${theme}: an entry's eaten-at time, changed, and the morning in "When you eat"`, async ({page, isMobile}) => {
  await offlineApi(page); await freshDevice(page);
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/health'); await hydrated(page);
  // The empty state teaches before anything is logged.
  await page.goto('/app/health?view=insights'); await hydrated(page);
  const card = page.getByRole('region', {name: 'When you eat'});
  await expect(card).toContainText('Nothing is logged in these days yet.');
  await page.goto('/app/health?view=diary'); await hydrated(page);
  const trigger = page.getByRole('button', {name: 'Log a meal', exact: true});
  if (await trigger.isVisible()) await trigger.click();
  await page.getByText('Just the calories', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Log just the calories'});
  await form.getByLabel('Calories (kcal)').fill('350');
  await form.getByLabel('Meal').selectOption('Breakfast');
  await form.getByLabel('What was it? (optional)').fill('Fictional porridge');
  await form.getByRole('group', {name: 'Protein, carbs and fat (optional)'}).getByLabel('Protein (g)').fill('18');
  await form.getByRole('button', {name: 'Log calories'}).click();
  const breakfast = page.getByRole('region', {name: 'Breakfast diary'});
  await expect(breakfast).toContainText('Fictional porridge');
  if (await page.getByRole('dialog').isVisible().catch(() => false)) await page.keyboard.press('Escape');
  const time = breakfast.getByRole('button', {name: /^Fictional porridge: eaten at \d\d:\d\d \(when it was logged\)\. Change the time$/});
  await expect(time).toHaveText(/^\d\d:\d\d$/);
  await time.focus(); await page.keyboard.press('Enter');
  const editor = page.getByRole('group', {name: 'Time Fictional porridge was eaten'});
  const field = editor.getByLabel('Eaten at');
  await expect(field).toBeFocused();
  expect(await axe(page, editor).then(f => f.filter(v => v.impact === 'serious' || v.impact === 'critical'))).toEqual([]);
  await field.fill('07:15');
  await editor.getByRole('button', {name: 'Save time'}).click();
  const changed = breakfast.getByRole('button', {name: 'Fictional porridge: eaten at 07:15. Change the time'});
  await expect(changed).toHaveText('07:15');
  await expect(changed).toBeFocused();
  const record = await page.evaluate(() => Object.keys(localStorage).filter(k => k.endsWith('zigoals:food-plus:v1')).map(k => JSON.parse(localStorage.getItem(k)!)));
  expect(record.length).toBe(1);
  expect(Object.values(record[0].times)).toEqual(['07:15']);
  // Escape closes the editor without a change.
  await changed.click();
  await page.keyboard.press('Escape');
  await expect(changed).toHaveText('07:15');

  await page.goto('/app/health?view=insights'); await hydrated(page);
  await expect(card).toBeVisible();
  await card.getByLabel('Today').check();
  await expect(card.getByRole('list', {name: 'Protein by part of the day'})).toContainText('Morning');
  const table = card.getByRole('region', {name: 'Protein by part of the day, table'});
  await expect(table.getByRole('row', {name: /Morning \(5:00–11:00\) 1 18 g 100 %/})).toBeVisible();
  await card.getByLabel('Nutrient').selectOption('kcal');
  await expect(table.getByRole('row', {name: /Morning \(5:00–11:00\) 1 350 kcal 100 %/})).toBeVisible();
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
