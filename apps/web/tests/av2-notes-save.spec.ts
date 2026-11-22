import {expect, test} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #319, Bear's exports): Save this note as… makes an HTML page, plain text or a Word
 * file on the device; each download is read back here (the Word file is a stored ZIP with its document part). At 390
 * and 1440, Nebula, Light and Dark, axe-clean. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional trip', body: '# Plan\n\nPack **light**.\n\n- [ ] passport', tags: ['travel'], createdAt: '2026-11-01T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: save a note as HTML, text or Word`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await note.getByRole('button', {name: 'Save this note as…'}).click();
  const panel = note.getByRole('region', {name: 'Save this note as'});
  await expect(panel.getByRole('button', {name: 'A web page (.html)'})).toBeFocused();
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const read = async (name: string) => { const wait = page.waitForEvent('download'); await panel.getByRole('button', {name}).click(); const d = await wait; return {file: d.suggestedFilename(), bytes: readFileSync((await d.path())!)}; };
  const html = await read('A web page (.html)');
  expect(html.file).toBe('Fictional trip.html');
  expect(html.bytes.toString('utf8')).toContain('<h1>Fictional trip</h1>');
  expect(html.bytes.toString('utf8')).toContain('<strong>light</strong>');
  const text = await read('Plain text (.txt)');
  expect(text.file).toBe('Fictional trip.txt');
  expect(text.bytes.toString('utf8')).toContain('• ☐ passport');
  const word = await read('A Word file (.docx)');
  expect(word.file).toBe('Fictional trip.docx');
  expect(word.bytes.subarray(0, 4).toString('hex')).toBe('504b0304');
  expect(word.bytes.toString('latin1')).toContain('word/document.xml');
  await expect(panel.getByRole('status')).toHaveText('Saved as Fictional trip.docx.');
  await panel.getByRole('button', {name: 'Close'}).click();
  await expect(note.getByRole('button', {name: 'Save this note as…'})).toBeFocused();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
