import {expect, test, type Page} from '@playwright/test';
import {axe} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (review b1 #5, privacy): an earlier version of a journal entry or of a note can be deleted — one
 * ("Delete this version") or all ("Delete all earlier versions") — each after a confirmation, with Undo; focus stays in
 * the versions part. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const stored = <T,>(page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key) as Promise<T>;
type Versions = {versions?: {id: string}[]};

test('journal: delete one earlier version, Undo, then delete all', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-23T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false,
    entries: [{id: 'e1', date: '2026-11-22', text: 'A fictional kind evening.', createdAt: '2026-11-22T20:00:00.000Z', updatedAt: '2026-11-22T22:00:00.000Z'}],
    versions: [{id: 'v-first0001', entryId: 'e1', text: 'Fictional words I regret.', savedAt: '2026-11-22T20:00:00.000Z'}, {id: 'v-second001', entryId: 'e1', text: 'Fictional middle words.', savedAt: '2026-11-22T21:00:00.000Z'}]})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const row = page.locator('ol.journal-entries > li').first();
  await row.locator('details.journal-entry-more > summary').click();
  const versions = row.getByRole('region', {name: /^Earlier versions/});
  await versions.locator('.journal-versions-list summary').last().click();
  await versions.getByRole('button', {name: /^Delete the version of/}).last().click();
  const ask = versions.getByRole('alertdialog', {name: 'Delete this earlier version?'});
  await expect(ask.getByRole('button', {name: 'Cancel'})).toBeFocused();
  const findings = await axe(page, row);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await ask.getByRole('button', {name: 'Delete this version'}).click();
  await expect.poll(async () => (await stored<Versions>(page, JOURNAL_KEY)).versions?.map(v => v.id)).toEqual(['v-second001']);
  await expect(versions.locator('.journal-versions-title')).toBeFocused();
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await stored<Versions>(page, JOURNAL_KEY)).versions?.map(v => v.id).sort()).toEqual(['v-first0001', 'v-second001']);
  await versions.getByRole('button', {name: 'Delete all earlier versions'}).click();
  await versions.getByRole('alertdialog', {name: 'Delete all 2 earlier versions?'}).getByRole('button', {name: 'Delete all earlier versions'}).click();
  await expect.poll(async () => (await stored<Versions>(page, JOURNAL_KEY)).versions).toBeUndefined();
  await expect(row.locator('.journal-entry-text').first()).toHaveText('A fictional kind evening.');
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
});

test('notes: delete an earlier version after asking, then all', async ({page}) => {
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, voice: false,
    notes: [{id: 'n-fict1', kind: 'topic', title: 'Fictional plans', body: 'Tidy fictional words.', createdAt: '2026-11-20T09:00:00.000Z', updatedAt: '2026-11-21T09:00:00.000Z'}],
    versions: [{id: 'v-note0001', noteId: 'n-fict1', title: 'Fictional plans', body: 'A fictional secret.', savedAt: '2026-11-20T09:00:00.000Z'}, {id: 'v-note0002', noteId: 'n-fict1', title: 'Fictional plans', body: 'Fictional middle.', savedAt: '2026-11-20T12:00:00.000Z'}]})); }, NOTES_KEY);
  await page.goto('/app/notes?note=n-fict1'); await hydrated(page);
  const open = page.getByRole('region', {name: 'Open note'});
  const fold = open.locator('details.note-versions-fold');
  await fold.locator('summary').first().click();
  await fold.locator('.note-versions-list summary').last().click();
  await fold.getByRole('button', {name: /^Delete the version of/}).last().click();
  await fold.getByRole('alertdialog', {name: 'Delete this earlier version?'}).getByRole('button', {name: 'Delete this version'}).click();
  await expect.poll(async () => (await stored<Versions>(page, NOTES_KEY)).versions?.map(v => v.id)).toEqual(['v-note0002']);
  await expect(fold.getByText('1 earlier version, kept on this device until you delete them.')).toBeFocused();
  await fold.getByRole('button', {name: 'Delete all earlier versions'}).click();
  await fold.getByRole('alertdialog', {name: 'Delete the one earlier version?'}).getByRole('button', {name: 'Delete all earlier versions'}).click();
  await expect.poll(async () => (await stored<Versions>(page, NOTES_KEY)).versions).toBeUndefined();
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await stored<Versions>(page, NOTES_KEY)).versions?.map(v => v.id)).toEqual(['v-note0002']);
});
