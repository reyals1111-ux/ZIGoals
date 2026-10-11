import {expect, test, type Page} from '@playwright/test';

// Session M, Part A1 (QA2-02): Health and the reminders say a storage refusal the same coded way as Habits, Staking
// and Portfolio (lib/storage-error-copy.ts): what happened, what to do, and a short code. Before this, Health replaced a
// long coded message with a generic line, and the reminders always said "Check that this browser allows site data".
test.use({locale: 'en-US', timezoneId: 'Europe/Brussels'});
const HEALTH = 'zigoals:health:v1', REMINDERS = 'zigoals:reminders:v1';
const at = (time: string) => new Date(`2026-10-01T${time}:00+02:00`);

async function start(page: Page, time = '10:00') {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.clock.install({time: at(time)});
}
/** From now on, writing `key` fails as a full browser storage (QuotaExceededError) or as blocked site data (SecurityError). */
const refuse = (page: Page, key: string, name: 'QuotaExceededError' | 'SecurityError') => page.evaluate(([key, name]) => {
  const write = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k: string, v: string) { if (k === key) throw new DOMException('Fixture refusal', name); return write.call(this, k, v); };
}, [key, name] as const);

test('QA2-02: a quick counter tap refused by a full storage gives the coded reason, not a generic line', async ({page}) => {
  await start(page);
  await page.goto('/app/health');
  const counters = page.getByRole('region', {name: 'Every repetition counts.'});
  await expect(counters.getByRole('article', {name: 'Push-ups', exact: true})).toBeVisible();
  await refuse(page, HEALTH, 'QuotaExceededError');
  await counters.getByRole('button', {name: 'Increase Push-ups'}).click();
  const alert = counters.getByRole('alert');
  await expect(alert).toContainText('Your browser storage is full');
  await expect(alert).toContainText('(STORAGE_FULL)');
  expect(await page.evaluate(key => localStorage.getItem(key), HEALTH)).toBeNull();
});

test('QA2-02: a quick counter tap refused because site data is blocked says so, with its code', async ({page}) => {
  await start(page);
  await page.goto('/app/health');
  const counters = page.getByRole('region', {name: 'Every repetition counts.'});
  await expect(counters.getByRole('article', {name: 'Squats', exact: true})).toBeVisible();
  await refuse(page, HEALTH, 'SecurityError');
  await counters.getByRole('button', {name: 'Increase Squats'}).click();
  const alert = counters.getByRole('alert');
  await expect(alert).toContainText('This browser is not letting ZIGoals keep data on this device');
  await expect(alert).toContainText('(STORAGE_BLOCKED)');
});

test('QA2-02: a Health save refused by a full storage gives the coded reason, not the generic line', async ({page}) => {
  await start(page);
  await page.goto('/app/health#water');
  const water = page.getByRole('form', {name: 'Water entry'});
  await water.getByLabel('Water amount', {exact: true}).fill('250');
  await refuse(page, HEALTH, 'QuotaExceededError');
  await water.getByRole('button', {name: 'Log water'}).click();
  // Matches the old generic line too ("…available browser storage…"), so a failure shows what was said instead.
  const alert = page.getByRole('alert').filter({hasText: /storage/i});
  await expect(alert).toContainText('Your browser storage is full');
  await expect(alert).toContainText('(STORAGE_FULL)');
  await expect(alert).not.toContainText('Could not save this change.');
  expect(await page.evaluate(key => localStorage.getItem(key), HEALTH)).toBeNull();
});

test('QA2-02: a reminder card that cannot be dismissed gives the coded reason, full or blocked', async ({page}) => {
  await start(page, '20:05');
  await page.addInitScript(key => { try { if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({version: 1, habits: {}, water: {time: '20:00'}, dismissed: {}})); } catch { /* storage denied */ } }, REMINDERS);
  await page.goto('/app');
  const reminder = page.getByRole('article', {name: 'Reminder: Water'});
  await expect(reminder).toBeVisible();
  const cards = page.getByRole('region', {name: 'Reminders on this device'});
  await refuse(page, REMINDERS, 'QuotaExceededError');
  await reminder.getByRole('button', {name: 'Dismiss for today'}).click();
  await expect(cards.getByRole('alert')).toContainText('This reminder was not dismissed on this device.');
  await expect(cards.getByRole('alert')).toContainText('Your browser storage is full');
  await expect(cards.getByRole('alert')).toContainText('(STORAGE_FULL)');
  await expect(cards.getByRole('alert')).not.toContainText('transactional storage');
  await expect(reminder).toBeVisible();
  await page.reload();
  await expect(reminder).toBeVisible();
  await refuse(page, REMINDERS, 'SecurityError');
  await reminder.getByRole('button', {name: 'Dismiss for today'}).click();
  await expect(cards.getByRole('alert')).toContainText('(STORAGE_BLOCKED)');
});

test('QA2-02: a water reminder time that cannot be kept gives the coded reason', async ({page}) => {
  await start(page, '19:58');
  await page.goto('/app/health');
  const form = page.getByRole('form', {name: 'Water reminder'});
  await form.getByLabel('Reminder time — on this device').fill('20:00');
  await refuse(page, REMINDERS, 'QuotaExceededError');
  await form.getByRole('button', {name: 'Save reminder time'}).click();
  await expect(form.getByRole('alert')).toContainText('The reminder time was not saved on this device.');
  await expect(form.getByRole('alert')).toContainText('(STORAGE_FULL)');
  expect(await page.evaluate(key => localStorage.getItem(key), REMINDERS)).toBeNull();
});

test('QA2-02: a habit saved without its reminder time says why the time was not kept', async ({page}) => {
  await start(page, '08:58');
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional walk');
  await page.getByLabel('Reminder time — on this device').fill('09:00');
  await refuse(page, REMINDERS, 'SecurityError');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional walk', exact: true})).toBeVisible();
  const status = page.getByRole('status').filter({hasText: 'The reminder time was not saved on this device.'});
  await expect(status).toContainText('(STORAGE_BLOCKED)');
  expect(await page.evaluate(key => localStorage.getItem(key), REMINDERS)).toBeNull();
});
