import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #312, Bear's find and replace): while editing, Find and replace counts the matches,
 * steps through them (Next, Enter, Previous), replaces one or all, and Save keeps the earlier words as a version. Esc
 * closes it with focus back on its button. At 390 and 1440, Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional shopping', body: 'Buy tea. Tea for the office.\n\nMore tea later.', createdAt: '2026-11-01T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: find and replace in a note`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await note.getByRole('button', {name: 'Edit'}).click();
  await note.getByRole('button', {name: 'Find and replace'}).click();
  const find = note.getByRole('region', {name: 'Find and replace'});
  await expect(find.getByLabel('Find', {exact: true})).toBeFocused();
  await find.getByLabel('Find', {exact: true}).fill('tea');
  await expect(find.locator('.note-find-count')).toHaveText('1 of 3');
  await find.getByLabel('Find', {exact: true}).press('Enter');
  await expect(find.locator('.note-find-count')).toHaveText('2 of 3');
  await expect(find.locator('.note-find-context mark')).toHaveText('Tea');
  await find.getByRole('button', {name: 'Previous'}).click();
  await expect(find.locator('.note-find-count')).toHaveText('1 of 3');
  await find.getByLabel('Replace with').fill('coffee');
  await find.getByRole('button', {name: 'Replace', exact: true}).click();
  await expect(find.locator('.note-find-count')).toHaveText('1 of 2');
  await find.getByRole('button', {name: 'Replace all 2'}).click();
  await expect(find.locator('.note-find-count')).toHaveText('No match in this note.');
  await expect(find.getByRole('status')).toHaveText('Replaced 2. Save keeps the earlier words under Earlier versions.');
  await expect(note.getByLabel('Note', {exact: true})).toHaveValue('Buy coffee. coffee for the office.\n\nMore coffee later.');
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await find.getByLabel('Find', {exact: true}).press('Escape');
  await expect(find).toHaveCount(0);
  await expect(note.getByRole('button', {name: 'Find and replace'})).toBeFocused();
  await note.getByRole('button', {name: 'Save'}).click();
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!) as {notes: {body: string}[]; versions: {body: string}[]}, NOTES_KEY);
  expect(stored.notes[0]!.body).toContain('More coffee later.');
  expect(stored.versions.map(v => v.body)).toEqual(['Buy tea. Tea for the office.\n\nMore tea later.']);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
