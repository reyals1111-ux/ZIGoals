import {expect, test} from '@playwright/test';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (review B3C-2, B3C-3, B3C-14): a letter whose day is still to come stays folded on the Journal page
 * (no "On this day" memory of it, no words under Every answer to a prompt, no search hit on its words) and on Today
 * (counted, never its first line). The seed's today is 2026-11-14. Fictional entries; the API offline.
 */
const SECRET = 'fictional-sealed-words';
const letter = (id: string, date: string, opensOn: string) => ({id, date, text: `Dear future me,\n${SECRET} ${id}\n\nRight now I am…\n\nWhat I hope for you:\n`, createdAt: `${date}T09:00:00.000Z`, template: 'letter-future-you', opensOn});
const records = {[JOURNAL_KEY]: {version: 1, todayLines: true, entries: [
  letter('journal_fictional-month-0001', '2026-10-14', '2027-04-14'),
  letter('journal_fictional-year-00001', '2025-11-14', '2027-11-14'),
  letter('journal_fictional-today-0001', '2026-11-14', '2027-11-14'),
  {id: 'journal_fictional-plain-0001', date: '2026-11-13', text: 'A fictional plain entry.', createdAt: '2026-11-13T09:00:00.000Z', template: 'letter-future-you'},
]}};

test('Journal: no On this day, no answers and no search hit from a folded letter', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, records);
  await page.goto('/app/journal'); await hydrated(page);
  await expect(page.locator('ol.journal-entries > li').first()).toBeVisible();
  await expect(page.locator('details.on-this-day')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(SECRET);
  // B3C-3: Every answer to a prompt counts the letters with their day, never their words.
  const fold = page.locator('details.journal-prompt-answers-fold');
  await fold.locator('summary').click();
  await expect(fold.locator('.prompt-answers-sealed')).toHaveText('3 letters are folded away, the next until Apr 14, 2027; each letter’s words show here from its day.');
  await expect(fold).toContainText('A fictional plain entry.');
  await expect(fold).not.toContainText(SECRET);
  // B3C-14: the search finds no row by a folded letter's words; after Read it now it does.
  const search = page.getByLabel('Search your journal');
  await search.fill(SECRET);
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(0);
  await search.fill('');
  const row = page.locator('ol.journal-entries > li').filter({has: page.locator('.journal-entry-sealed')}).first();
  await row.getByRole('button', {name: /^Read the letter of .* now$/}).click();
  await search.fill(SECRET);
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(1);
});

test('Today: the letter written today is counted, its first line not shown', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, records);
  await page.goto('/app'); await hydrated(page);
  const glance = page.getByRole('region', {name: 'Your journal today'});
  await expect(glance).toContainText('Written today: 1 entry');
  await expect(glance).not.toContainText('On this day');
  await expect(page.locator('main')).not.toContainText(SECRET);
  await expect(page.locator('main')).not.toContainText('Dear future me');
});
