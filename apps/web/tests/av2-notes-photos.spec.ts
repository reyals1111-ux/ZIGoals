import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #307, Bear's photos in a note): the first photo shows under the words, as before; a
 * second one, added while reading, is placed at the end of the words as a `![photo](<id>)` line and drawn there; one added
 * while editing goes at the caret. Photos lists them, and deleting one takes its line out. At 390 and 1440, Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline; photos made here.
 */
test.use({timezoneId: 'UTC'});
// An 8 × 8 violet PNG, made here: nothing is fetched.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNYUPEfK2IYWhIAKxSFwScT0+MAAAAASUVORK5CYII=', 'base64');
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional garden', body: 'Roses by the gate.', createdAt: '2026-11-01T09:00:00.000Z'}]};
type Stored = {notes: {photoId?: string; photos?: string[]; body: string}[]};
for (const theme of THEMES) test(`${theme}: several photos placed in a note`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'}), file = note.locator('.note-extras input[type=file]');
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)!) as Stored, NOTES_KEY);
  await file.setInputFiles({name: 'one.png', mimeType: 'image/png', buffer: PNG});
  await expect(note.locator('.note-extras img.note-photo')).toHaveCount(1);
  await expect(note.getByRole('button', {name: 'Add another photo'})).toBeVisible();
  await file.setInputFiles({name: 'two.png', mimeType: 'image/png', buffer: PNG});
  await expect(note.locator('.note-render figure.note-photo-figure img')).toHaveCount(1);
  let s = await stored();
  expect(s.notes[0]!.photos).toHaveLength(1);
  expect(s.notes[0]!.body).toBe(`Roses by the gate.\n\n![photo](${s.notes[0]!.photos![0]})`);
  // While editing, the third goes where the caret is, and is saved with the words.
  await note.getByRole('button', {name: 'Edit'}).click();
  const field = note.getByLabel('Note', {exact: true});
  await field.evaluate((el: HTMLTextAreaElement) => { el.focus(); el.setSelectionRange(5, 5); });
  await file.setInputFiles({name: 'three.png', mimeType: 'image/png', buffer: PNG});
  await expect(field).toHaveValue(/^Roses\n\n!\[photo\]\([A-Za-z0-9_-]+\)\n\nby the gate\./);
  await note.getByRole('button', {name: 'Save'}).click();
  await expect(note.locator('.note-render figure.note-photo-figure img')).toHaveCount(2);
  const photos = note.locator('details.note-photos-fold');
  await expect(photos.locator('summary')).toHaveText(/Photos\s*· 3 of 8/);
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Deleting photo 2 takes its line out of the words.
  await photos.locator('summary').click();
  await photos.getByRole('button', {name: 'Delete photo 2…'}).click();
  await note.getByRole('button', {name: 'Delete photo', exact: true}).click();
  await expect(note.locator('.note-render figure.note-photo-figure img')).toHaveCount(1);
  s = await stored();
  expect(s.notes[0]!.photos).toHaveLength(1);
  expect(s.notes[0]!.body.match(/!\[photo\]/g)).toHaveLength(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
