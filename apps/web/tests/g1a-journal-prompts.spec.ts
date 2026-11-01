import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AK (BUILD list 2 #13, lane G1a): Journal → Write → "Start from a prompt". Fresh start: a template fills the
 * entry with its headings (in English or Dutch), saving the headings alone is refused calmly, a written entry is saved
 * with its template id; "Another way to see it" says it is a reflection, not therapy. Works the same in the Showcase.
 */
const TODAY = '2026-11-04';
test.use({timezoneId: 'UTC'});
const read = async (page: Page) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), JOURNAL_KEY)) ?? 'null') as {entries: {text: string; template?: string}[]} | null;

test('fresh start: pick a prompt, write under it, save with its template id', async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/journal');
  await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  await form.getByText('Start from a prompt').click();
  await form.getByRole('button', {name: /^Another way to see it/}).click();
  const box = form.getByLabel('Today’s entry');
  await expect(box).toHaveValue('The situation:\n\nMy first thought:\n\nAnother view:\n');
  await expect(form.getByText('A reflection, not therapy.')).toBeVisible();
  await form.getByRole('button', {name: 'Save entry'}).click();
  await expect(form.getByRole('alert')).toHaveText('Write a few words under the headings first.');

  await form.getByText('Start from a prompt').click();
  await form.getByRole('button', {name: 'Nederlands'}).click();
  await form.getByRole('button', {name: /^Drie goede dingen/}).click();
  await expect(box).toHaveValue('Iets goeds vandaag:\n\nNog iets goeds:\n\nEn nog één:\n');
  await box.fill('Iets goeds vandaag:\nDe zon op het balkon.\n\nNog iets goeds:\nSoep.\n');
  await form.getByRole('button', {name: 'Save entry'}).click();
  await expect.poll(async () => (await read(page))?.entries.at(-1)).toMatchObject({template: 'three-good-things', text: expect.stringContaining('De zon op het balkon.')});
});

test('the Showcase: the prompts are there too', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app/journal');
  await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  await form.getByText('Start from a prompt').click();
  await expect(form.getByRole('list', {name: 'Prompts'}).getByRole('listitem')).toHaveCount(8);
});
