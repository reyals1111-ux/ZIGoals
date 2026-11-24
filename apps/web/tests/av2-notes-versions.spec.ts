import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (notes; LEDGER #33, Notion's version history): saving a change to a note keeps the words it had under
 * "Earlier versions", which shows when each was saved and its words, and "Restore this version" brings them back (the
 * replaced words are kept too; Undo puts the note back). At 390 and 1440, in Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
type Stored = {notes: {id: string; body: string}[]; versions?: {noteId: string; body: string}[]};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored, NOTES_KEY);
for (const theme of THEMES) test(`${theme}: a note's earlier versions`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, voice: false, notes: [{id: 'n-fict1', kind: 'topic', title: 'Fictional plans', body: 'First fictional words.', createdAt: '2026-11-20T09:00:00.000Z'}]})); }, NOTES_KEY);
  await page.goto('/app/notes?note=n-fict1'); await hydrated(page);
  const open = page.getByRole('region', {name: 'Open note'});
  await open.getByRole('button', {name: 'Edit'}).click();
  await open.getByRole('textbox', {name: 'Note'}).fill('Second fictional words.');
  await open.getByRole('button', {name: 'Save'}).click();
  await expect.poll(async () => (await read(page)).versions?.map(v => v.body)).toEqual(['First fictional words.']);
  const fold = open.locator('details.note-versions-fold');
  await expect(fold.locator('summary')).toContainText('Earlier versions · 1');
  await fold.locator('summary').click();
  await fold.locator('.note-versions-list summary').first().click();
  await expect(fold.getByText('First fictional words.', {exact: true})).toBeVisible();
  const findings = await axe(page, open);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await fold.getByRole('button', {name: /^Restore the version of/}).click();
  await expect.poll(async () => (await read(page)).notes[0]!.body).toBe('First fictional words.');
  await expect.poll(async () => (await read(page)).versions?.map(v => v.body).sort()).toEqual(['First fictional words.', 'Second fictional words.']);
  await expect(open.getByText('First fictional words.').first()).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
