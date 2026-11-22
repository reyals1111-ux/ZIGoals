import {expect, test, type Page} from '@playwright/test';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY, journalSchema} from '../lib/journal/schema';
import {entryMarkdown} from '../lib/journal/export';

/**
 * Session AV lane 2 (review B3C-5): the journal's own Markdown file of an entry with ZIGi's follow-up, imported into the
 * journal it came from, is "already in your journal"; after removing the entry, it comes back with its follow-up as the
 * follow-up, not as words. The seed's today is 2026-11-14. Fictional entries; the API offline.
 */
const entry = {id: 'journal_fictional-rain-0001', date: '2026-11-12', text: 'A fictional walk in the rain.', createdAt: '2026-11-12T20:00:00.000Z', followUp: {question: 'What did the rain change?', from: 'device' as const, answer: 'Fictionally, my mood.'}};
const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [entry]});
const file = () => ({name: '2026-11-12 A fictional walk in the rain.md', mimeType: 'text/markdown', buffer: Buffer.from(entryMarkdown(journal, journal.entries[0]!))});
type Stored = {entries: {text: string; followUp?: {question: string; answer?: string}}[]};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored | null, JOURNAL_KEY);

test('a Markdown file with a follow-up does not double, and brings the follow-up back', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[JOURNAL_KEY]: journal});
  await page.goto('/app/journal'); await hydrated(page);
  const panel = page.getByRole('region', {name: 'Import and export'});
  await panel.locator('details.journal-files-fold > summary').click();
  await panel.locator('input[type="file"]').setInputFiles([file()]);
  const plan = panel.getByRole('group', {name: 'What the files hold'});
  await expect(plan).toContainText('No new entry in these files.');
  await plan.getByRole('button', {name: 'Cancel'}).click();
  // Into a journal without it: the words as they were, the question and answer as its follow-up.
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: true, entries: []})), JOURNAL_KEY);
  await page.reload(); await hydrated(page);
  await panel.locator('details.journal-files-fold > summary').click();
  await panel.locator('input[type="file"]').setInputFiles([file()]);
  await plan.getByRole('button', {name: 'Import 1 entry'}).click();
  await expect.poll(async () => (await read(page))?.entries.map(e => [e.text, e.followUp?.question, e.followUp?.answer])).toEqual([['A fictional walk in the rain.', 'What did the rain change?', 'Fictionally, my mood.']]);
});
