import {expect, test} from '@playwright/test';
import {seeded} from './ap-fixtures';

/**
 * Session AP (owner-approved feature list): the Journal's own numbers — each entry's words, the writing streak and the
 * words this year — worked out from the entries; nothing new is stored. Draft for the integrator to run.
 */
test.use({timezoneId: 'Europe/Brussels'});
const entry = (id: string, date: string, text: string) => ({id, date, text, createdAt: `${date}T19:00:00.000Z`});
const JOURNAL = {version: 1, shareWithAi: false, followUps: false, entries: [
  entry('ap-old', '2025-12-30', 'Last year counts elsewhere'),
  entry('ap-11', '2026-11-11', 'A quiet fictional day'),
  entry('ap-12', '2026-11-12', 'Walked by the river'),
  entry('ap-13', '2026-11-13', 'Fictional dinner with friends tonight'),
]};

test('streak up to yesterday (today not written yet), the longest run, words this year, words per entry', async ({page}) => {
  await seeded(page, {'zigoals:journal:v1': JOURNAL}, '/app/journal');
  const writing = page.locator('dl.journal-stats');
  await expect(writing).toBeVisible();
  await expect(writing.locator('div', {hasText: 'Writing streak'}).locator('dd')).toHaveText('3 days · write today to keep it');
  await expect(writing.locator('div', {hasText: 'Longest streak'}).locator('dd')).toHaveText('3 days');
  await expect(writing.locator('div', {hasText: 'Words in 2026'}).locator('dd')).toHaveText('13 in 3 entries');
  await expect(page.locator('.journal-entries li', {hasText: 'Fictional dinner with friends tonight'}).locator('.journal-entry-words')).toHaveText('5 words');
  // Nothing new is stored: the journal record is as it was.
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('zigoals:journal')).sort())).toEqual(['zigoals:journal:v1']);
});
