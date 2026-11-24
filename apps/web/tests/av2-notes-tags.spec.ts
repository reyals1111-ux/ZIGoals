import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #306, Bear's tags): #tags written in a note (nested with "/") and in its Tags field
 * are kept as its tags; Notes → Notes → Tags lists them nested with counts, and one tag becomes Notes' focus (the list,
 * Search and the Graph) until cleared, kept on this device. At 390 and 1440, Nebula, Light and Dark, axe-clean, no
 * sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional standup', body: 'Notes from the #work/meetings call.', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Fictional desk ideas', body: 'A plant for the #work desk.', createdAt: '2026-11-02T09:00:00.000Z'},
  {id: 'n-c', kind: 'topic', title: 'Fictional garden', body: 'Roses.', tags: ['home'], createdAt: '2026-11-03T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: tags in the text, nested, and a focus tag`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const list = page.locator('section[aria-labelledby="note-list-title"]');
  const fold = list.locator('details.note-tags-fold');
  await expect(fold.locator(':scope > summary')).toHaveText(/Tags\s*· 2 tags and 1 nested/);
  await fold.locator(':scope > summary').click();
  const tags = fold.getByRole('list', {name: 'Tags'});
  await expect(tags.getByRole('button')).toHaveText([/#home\s*1 note/, /#work\s*2 notes/, /#meetings\s*1 note/]);
  // Focus on #work: the list keeps its two notes (one nested), and says so.
  await tags.getByRole('button', {name: /#work\s*2 notes/}).click();
  await expect(tags.getByRole('button', {name: /#work\s*2 notes/})).toHaveAttribute('aria-pressed', 'true');
  await expect(list.locator('.note-focus-line')).toContainText('Showing notes tagged #work');
  await expect(list.locator('.note-list strong')).toHaveText(['Fictional desk ideas', 'Fictional standup']);
  const findings = await axe(page, list);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Kept on this device: after a reload the focus stays, and the graph is narrowed too.
  await page.reload(); await hydrated(page);
  await expect(page.locator('.note-focus-line')).toContainText('#work');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).focusTag, NOTES_KEY)).toBe('work');
  await page.goto('/app/notes?view=graph'); await hydrated(page);
  await expect(page.locator('.note-focus-line')).toContainText('#work');
  await page.locator('.note-focus-line').getByRole('button', {name: 'Clear focus'}).click();
  await expect(page.locator('.note-focus-line')).toHaveCount(0);
  // A #tag in a note's words focuses Notes on it; the Tags field keeps a tag of its own.
  await page.goto('/app/notes?note=n-c'); await hydrated(page);
  const open = page.getByRole('region', {name: 'Open note'});
  await expect(open.locator('.note-tag-line')).toContainText('#home');
  await open.getByRole('button', {name: 'Edit'}).click();
  await expect(open.getByLabel('Tags', {exact: true})).toHaveValue('home');
  await open.getByLabel('Note', {exact: true}).fill('Roses for the #garden.');
  await open.getByRole('button', {name: 'Save'}).click();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).notes.find((n: {id: string}) => n.id === 'n-c').tags, NOTES_KEY)).toEqual(['garden', 'home']);
  await open.getByRole('button', {name: '#garden: show the notes with this tag'}).click();
  await expect(page).toHaveURL(/view=notes/);
  await expect(page.locator('.note-focus-line')).toContainText('#garden');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
