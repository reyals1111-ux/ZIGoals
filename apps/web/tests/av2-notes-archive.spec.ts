import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #315, Bear's archive): Archive takes a note out of the list and the graph (Undo in
 * the message); it waits under Notes → Archived, stays in Search marked archived, says so when opened, and Back to the
 * list brings it back. At 390 and 1440, Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional old plan', body: 'A plan for later, linked to [[Fictional ideas]].', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Fictional ideas', body: 'Ideas.', createdAt: '2026-11-02T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: archive a note`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await note.getByRole('button', {name: 'Archive'}).click();
  await expect(page.getByRole('status').filter({hasText: 'archived: out of the list and the graph'}).first()).toBeVisible();
  await expect(note.locator('.note-archived-line')).toContainText('Archived: this note is out of the list and the graph');
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Out of the list, waiting under Archived; still in Search.
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const list = page.locator('section[aria-labelledby="note-list-title"]');
  await expect(list.locator('ul.note-list').first().locator('strong')).toHaveText(['Fictional ideas']);
  const shelf = list.locator('details.note-archived-fold');
  await expect(shelf.locator('summary')).toHaveText(/Archived\s*· 1 note, still in Search/);
  await list.getByLabel('Search', {exact: true}).fill('later');
  await expect(list.locator('.note-results li')).toContainText(['Fictional old plan · archived']);
  await list.getByLabel('Search', {exact: true}).fill('');
  // Not in the graph's list.
  await page.goto('/app/notes?view=graph'); await hydrated(page);
  // Session AV lane 2 (fixb4; deliberate): exactly "List" — "Tuck the Checklist button away" also holds the word (as in
  // notes.spec.ts); while the graph's chunk loads it was the only match, so the click went there. As strict.
  await page.getByRole('button', {name: 'List', exact: true}).click();
  await expect(page.getByRole('list', {name: 'Notes, goals and habits and their links'})).not.toContainText('Fictional old plan');
  // Back to the list.
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  await page.locator('details.note-archived-fold summary').click();
  await page.locator('details.note-archived-fold').getByRole('button', {name: 'Back to the list'}).click();
  await expect(page.locator('section[aria-labelledby="note-list-title"] ul.note-list').first().locator('strong')).toHaveText(['Fictional old plan', 'Fictional ideas']);
  await expect(page.locator('details.note-archived-fold')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
