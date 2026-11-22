import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (review B3C-1): "A letter to future you" with words written on the line of "Dear future me," and the
 * line after it; Write as a grid puts both in the first box, typing in another box keeps them, and Save stores them.
 * Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
test('Write as a grid keeps the words written on a heading’s line', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: []})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  await form.locator('details.prompt-fold > summary', {hasText: 'Start from a prompt'}).click();
  await form.getByRole('list', {name: 'Prompts'}).getByRole('button', {name: /^A letter to future you/}).click();
  const entry = form.getByRole('textbox', {name: 'Today’s entry'});
  await entry.fill('Dear future me, a fictional hello.\nA fictional move to Utrecht.\n\nRight now I am…\n\nWhat I hope for you:\n');
  await form.getByRole('button', {name: 'Write as a grid'}).click();
  const grid = form.getByRole('group', {name: 'A letter to future you, as a grid'});
  await expect(grid.getByRole('textbox', {name: 'Dear future me,'})).toHaveValue('a fictional hello.\nA fictional move to Utrecht.');
  await grid.getByRole('textbox', {name: 'Right now I am…'}).fill('fictionally busy');
  await form.getByRole('button', {name: 'Write as one text'}).click();
  await expect(entry).toHaveValue(/^Dear future me,\na fictional hello\.\nA fictional move to Utrecht\.\n\nRight now I am…\nfictionally busy\n/);
  await form.getByRole('button', {name: 'Save entry'}).click();
  await expect.poll(() => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{}') as {entries?: {text: string}[]}).entries?.[0]?.text ?? '', JOURNAL_KEY))
    .toContain('A fictional move to Utrecht.');
});
