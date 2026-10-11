import {expect, test, type Page} from '@playwright/test';

// Session I, Part 8: in-app reminders. Times are kept on this device only (zigoals:reminders:v1), follow the device's
// own clock, and show a card on Today until the habit is done or the card is dismissed for today.
test.use({locale: 'en-US', timezoneId: 'Europe/Brussels'});
const KEY = 'zigoals:reminders:v1';
const at = (time: string) => new Date(`2026-10-01T${time}:00+02:00`); // Thursday, local time in Brussels

async function start(page: Page, time: string) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.clock.install({time: at(time)});
}
const stored = (page: Page) => page.evaluate(key => { const raw = localStorage.getItem(key); return raw === null ? null : JSON.parse(raw); }, KEY);
async function habitWithReminder(page: Page, reminder: string) {
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional walk');
  await page.getByLabel('Reminder time — on this device').fill(reminder);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: 'Fictional walk', exact: true});
  await expect(card).toBeVisible();
  return (await card.getAttribute('id'))!.replace(/^habit-/, '');
}

test('a habit reminder appears on Today once the device clock passes its time, and stays dismissed for today', async ({page}) => {
  await start(page, '08:58');
  const id = await habitWithReminder(page, '09:00');
  expect(await stored(page)).toEqual({version: 1, habits: {[id]: {time: '09:00'}}, dismissed: {}});
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const reminder = page.getByRole('article', {name: 'Reminder: Fictional walk'});
  await expect(reminder).toHaveCount(0);
  await page.clock.runFor(150_000);
  await expect(reminder).toBeVisible();
  await expect(reminder).toContainText('Reminder · 09:00 · on this device');
  await expect(reminder).toContainText('Not done yet today.');
  await expect(reminder.getByRole('link', {name: 'Open habit'})).toHaveAttribute('href', `/app/habits#habit-${id}`);
  await reminder.getByRole('button', {name: 'Dismiss for today'}).click();
  await expect(reminder).toHaveCount(0);
  expect((await stored(page)).dismissed).toEqual({[id]: '2026-10-01'});
  await page.reload();
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.clock.runFor(31_000);
  await expect(reminder).toHaveCount(0);
});

test('a done habit has no reminder card; the editor shows and clears the saved time', async ({page}) => {
  await start(page, '09:05');
  const id = await habitWithReminder(page, '09:00');
  await page.goto('/app');
  const reminder = page.getByRole('article', {name: 'Reminder: Fictional walk'});
  await expect(reminder).toBeVisible();
  await reminder.getByRole('link', {name: 'Open habit'}).click();
  await expect(page).toHaveURL(new RegExp(`/app/habits#habit-${id}$`));
  const card = page.getByRole('article', {name: 'Fictional walk', exact: true});
  await card.getByRole('button', {name: 'Complete Fictional walk', exact: true}).click();
  await expect(card.getByRole('button', {name: 'Undo completion for Fictional walk', exact: true})).toBeVisible();
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.clock.runFor(31_000);
  await expect(reminder).toHaveCount(0);
  // Editing shows this device's time; clearing it removes the reminder and writes nothing else.
  await page.goto('/app/habits');
  await page.getByRole('button', {name: 'Edit Fictional walk', exact: true}).click();
  const field = page.getByLabel('Reminder time — on this device');
  await expect(field).toHaveValue('09:00');
  await field.fill('');
  await page.getByRole('button', {name: 'Save habit', exact: true}).click();
  await expect(page.getByRole('status').filter({hasText: 'Habit saved.'})).toBeVisible();
  expect(await stored(page)).toEqual({version: 1, habits: {}, dismissed: {}});
});

test('water: a reminder set in the Water journal shows until water is logged', async ({page}) => {
  await start(page, '19:58');
  await page.goto('/app/health');
  const form = page.getByRole('form', {name: 'Water reminder'});
  await form.getByLabel('Reminder time — on this device').fill('20:00');
  await form.getByRole('button', {name: 'Save reminder time'}).click();
  await expect(form.getByRole('status')).toHaveText('Water reminder set for 20:00 on this device.');
  expect(await stored(page)).toEqual({version: 1, habits: {}, water: {time: '20:00'}, dismissed: {}});
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  const reminder = page.getByRole('article', {name: 'Reminder: Water'});
  await expect(reminder).toHaveCount(0);
  await page.clock.runFor(150_000);
  await expect(reminder).toBeVisible();
  await expect(reminder.getByRole('heading')).toHaveText('Time for some water');
  await reminder.getByRole('link', {name: 'Open water journal'}).click();
  await expect(page).toHaveURL(/\/app\/health#water$/);
  const water = page.getByRole('form', {name: 'Water entry'});
  await water.getByLabel('Water amount', {exact: true}).fill('250');
  await water.getByRole('button', {name: 'Log water'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Water recorded.'})).toBeVisible();
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.clock.runFor(31_000);
  await expect(reminder).toHaveCount(0);
});

test('viewing pages writes no reminder data, and reminder times never reach a backup', async ({page}) => {
  await start(page, '10:00');
  for (const path of ['/app', '/app/habits', '/app/health', '/app/settings']) {
    await page.goto(path);
    await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  }
  await page.clock.runFor(31_000);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.includes('reminder')))).toEqual([]);
  await habitWithReminder(page, '07:45');
  await page.goto('/app/settings');
  const section = page.getByRole('region', {name: 'Habits backup', exact: true});
  const download = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export Habits', exact: true}).click();
  const file = await (await download).path();
  const text = (await import('node:fs')).readFileSync(file, 'utf8');
  expect(text).toContain('Fictional walk');
  expect(text).not.toMatch(/07:45|reminder/i);
});
