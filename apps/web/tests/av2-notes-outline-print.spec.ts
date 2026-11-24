import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #268 Obsidian's outline, #271 its PDF export): a note with headings lists them in
 * "Outline" above it, each jumping to its section with focus on the heading; "Print this note" puts a print sheet (title,
 * day, words) on the page for the browser's print window (window.print is stubbed here) and takes it away after, focus
 * back on the button. At 390 and 1440, Nebula, Light and Dark, axe-clean. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const body = ['# Fictional plan', 'Start.', '## Money', 'A budget.', '## Packing', '- [ ] passport', '### Shoes', 'Two pairs.'].join('\n\n');
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional long note', body, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-20T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Short fictional note', body: '# Only one heading\n\nWords.', createdAt: '2026-11-02T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: a note's outline and Print this note`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); (window as unknown as {printed: number}).printed = 0; window.print = () => { (window as unknown as {printed: number}).printed++; }; }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  const outline = note.getByRole('navigation', {name: 'Outline of this note'});
  await expect(outline.locator('summary')).toHaveText(/Outline\s*· 4 headings/);
  await outline.locator('summary').click();
  await expect(outline.getByRole('button')).toHaveText(['Fictional plan', 'Money', 'Packing', 'Shoes']);
  await outline.getByRole('button', {name: 'Packing'}).click();
  await expect(note.locator('.note-render h4', {hasText: 'Packing'})).toBeFocused();
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Print this note.
  await note.getByRole('button', {name: 'Print this note'}).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as {printed: number}).printed)).toBe(1);
  const sheet = page.locator('body > .note-print-sheet');
  await expect(sheet.locator('h1')).toHaveText('Fictional long note');
  await expect(sheet.locator('.note-print-meta')).toContainText('Made Nov 1, 2026 · changed Nov 20, 2026');
  await expect(sheet.locator('.note-render h5')).toHaveText('Shoes');
  await expect(page.locator('html')).toHaveClass(/zg-print-note/);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await expect(sheet).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveClass(/zg-print-note/);
  await expect(note.getByRole('button', {name: 'Print this note'})).toBeFocused();
  // One heading: no outline.
  await page.goto('/app/notes?note=n-b'); await hydrated(page);
  await expect(page.getByRole('navigation', {name: 'Outline of this note'})).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
