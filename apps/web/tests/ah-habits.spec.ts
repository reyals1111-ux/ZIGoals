import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {HABITS_KEY} from '../lib/habits';

// Session AH Part 7 (HA3, F6, HA18): Habits on a new device. Fictional data only.
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), HABITS_KEY) as Promise<{habits: {title: string; category: string; startDate: string}[]} | null>;
async function newHabit(page: Page, title: string) {
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}
async function details(page: Page, title: string) {
  const card = page.getByRole('article', {name: title, exact: true});
  if (!await card.locator('.habit-more').evaluate(el => (el as HTMLDetailsElement).open)) await card.locator('summary[aria-label^="Details for"]').click();
  return card;
}

test('HA3: a habit made by mistake is archived at once (after a confirm) and deleted for good the same day', async ({page}) => {
  await page.goto('/app/habits'); await hydrated(page);
  await newHabit(page, 'Fictional typo habit');
  const card = await details(page, 'Fictional typo habit');
  await expect(card).toContainText('Pause, resume and archive changes begin today.');
  await card.getByRole('button', {name: 'Archive habit', exact: true}).click();
  const ask = card.getByRole('alertdialog', {name: 'Archive Fictional typo habit?'});
  await expect(ask).toContainText('It leaves your lists today.');
  await ask.getByRole('button', {name: 'Archive habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional typo habit', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Archived', exact: true}).click();
  const archived = await details(page, 'Fictional typo habit');
  await archived.getByRole('button', {name: 'Delete for good…'}).click();
  await archived.getByLabel('Type the habit’s name to confirm').fill('Fictional typo habit');
  await archived.getByRole('button', {name: 'Delete for good', exact: true}).click();
  await expect.poll(async () => (await stored(page))!.habits.map(h => h.category)).toEqual(['Deleted']);
});

test('F6: the list sorts by name, and keeps your own order by default', async ({page}) => {
  await page.goto('/app/habits'); await hydrated(page);
  for (const title of ['Fictional walk', 'Fictional answer letters', 'Fictional read']) await newHabit(page, title);
  await page.getByRole('button', {name: 'All', exact: true}).click();
  const titles = () => page.locator('main .habit-card h2').allTextContents();
  await expect.poll(titles).toEqual(['Fictional walk', 'Fictional answer letters', 'Fictional read']);
  await page.getByRole('combobox', {name: 'Sort habits', exact: true}).selectOption('name');
  await expect.poll(titles).toEqual(['Fictional answer letters', 'Fictional read', 'Fictional walk']);
});

test('HA18: days before a habit started can be logged once its start moves back', async ({page}) => {
  await page.goto('/app/habits'); await hydrated(page);
  await newHabit(page, 'Fictional stretch');
  const card = await details(page, 'Fictional stretch');
  await card.getByText('History & reflection', {exact: true}).click();
  const start = (await stored(page))!.habits[0]!.startDate;
  await card.getByRole('button', {name: /^Log days before /}).click();
  const form = card.getByRole('form', {name: 'Start Fictional stretch earlier'});
  await form.getByRole('button', {name: 'Move the start back', exact: true}).click();
  await expect.poll(async () => (await stored(page))!.habits[0]!.startDate < start).toBe(true);
  await expect(card.getByLabel('Day to review')).toHaveAttribute('min', (await stored(page))!.habits[0]!.startDate);
});
