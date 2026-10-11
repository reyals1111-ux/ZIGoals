import {expect, test, type Page} from '@playwright/test';

// Session I, Part 5: storage refusals say what happened and what to do, with a short code (QA-03, QA-18, QA-22).
const HABITS = 'zigoals:habits:v1';
async function oneHabit(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Start from template').selectOption('read');
  await page.getByLabel('Habit title', {exact: true}).fill('Fictional walk');
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: 'Fictional walk', exact: true})).toBeVisible();
}

test('QA-03: a check-in over the module limit says so, points to transactional storage, and is not shown as done', async ({page}) => {
  await oneHabit(page);
  // The next size check reports more than 2 MB: the module limit, exactly as a full module would.
  await page.evaluate(() => { const encode = TextEncoder.prototype.encode; let armed = true; TextEncoder.prototype.encode = function (text?: string) { const bytes = encode.call(this, text); if (armed && text?.includes('"zigoals-habits"')) { armed = false; return new Uint8Array(2_000_001); } return bytes; }; });
  const card = page.getByRole('article', {name: 'Fictional walk', exact: true});
  await card.getByRole('button', {name: 'Complete Fictional walk', exact: true}).click();
  const alert = card.getByRole('alert');
  await expect(alert).toContainText('The check-in was not saved and is shown as before.');
  await expect(alert).toContainText('2 MB');await expect(alert).toContainText('transactional storage');
  await expect(alert).toContainText('(MODULE_LIMIT)');
  await expect(card.getByRole('button', {name: 'Complete Fictional walk', exact: true})).toBeVisible();
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), HABITS))!).habits[0].entries).toEqual([]);
});

test('QA-03: a full browser storage says so with its own code', async ({page}) => {
  await oneHabit(page);
  await page.evaluate(key => { const write = Storage.prototype.setItem; Storage.prototype.setItem = function (k: string, v: string) { if (k === key) throw new DOMException('Fixture quota', 'QuotaExceededError'); return write.call(this, k, v); }; }, HABITS);
  const card = page.getByRole('article', {name: 'Fictional walk', exact: true});
  await card.getByRole('button', {name: 'Complete Fictional walk', exact: true}).click();
  await expect(card.getByRole('alert')).toContainText('Your browser storage is full');
  await expect(card.getByRole('alert')).toContainText('(STORAGE_FULL)');
});

test('QA-18: storage the browser denies reads as blocked, never as damaged data', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => {
    const denied = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', {configurable: true, get: denied});
  });
  await page.goto('/app/habits');
  const alert = page.getByRole('alert').filter({hasText: 'not letting ZIGoals read data'}).first();
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('(STORAGE_BLOCKED)');
  await expect(page.getByText('Private data could not be read', {exact: false})).toHaveCount(0);
});

test('QA-22: each refused backup file says why, and nothing changes', async ({page}) => {
  await oneHabit(page);
  await page.goto('/app/settings');
  const section = page.getByRole('region', {name: 'Habits backup', exact: true});
  await section.getByText('Restore Habits from a file', {exact: true}).click();
  const before = await page.evaluate(key => localStorage.getItem(key), HABITS);
  const files: [string, string, RegExp][] = [
    ['not-json.json', '{"kind":', /not a ZIGoals module backup.*\(NOT_A_BACKUP\)$/],
    ['health.json', JSON.stringify({schemaVersion: 1, kind: 'zigoals-health'}), /This is a Health backup\. Restore it under Health\..*\(WRONG_MODULE\)$/],
    ['newer.json', JSON.stringify({schemaVersion: 4, kind: 'zigoals-habits', habits: []}), /made by a newer version of ZIGoals.*\(NEWER_BACKUP\)$/], // habits v3 is read since Session P; 4 is the next unknown version
    // This browser's own Habits, with the one habit twice: a repeated ID.
    ['damaged.json', (() => { const data = JSON.parse(before!); data.habits.push(data.habits[0]); return JSON.stringify(data); })(), /incomplete or damaged.*\(DAMAGED\)$/],
    ['large.json', `{"kind":"zigoals-habits","pad":"${'x'.repeat(2_000_100)}"}`, /larger than the 2 MB this module can restore.*\(TOO_LARGE\)$/],
  ];
  for (const [name, text, message] of files) {
    await section.getByLabel('Choose Habits backup').setInputFiles({name, mimeType: 'application/json', buffer: Buffer.from(text)});
    await expect(section.getByRole('alert'), name).toHaveText(message);
    await expect(section.getByRole('alert')).toContainText('Existing data was not changed.');
  }
  expect(await page.evaluate(key => localStorage.getItem(key), HABITS)).toBe(before);
});
