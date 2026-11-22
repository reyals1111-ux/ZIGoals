import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #360, Logseq's recycled pages): Delete note moves a note to Notes → Notes →
 * Recently deleted (kept 30 days), out of the list and Search; Restore brings it back in one tap; Empty now removes them
 * for good after a confirmation; a note deleted more than 30 days ago is gone on arrival. Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional old plan', body: 'A plan for later.', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Fictional ideas', body: 'Ideas.', createdAt: '2026-11-02T09:00:00.000Z'}],
trash: [{id: 'n-old', kind: 'topic', title: 'Fictional long gone', body: 'Old.', createdAt: '2026-09-01T09:00:00.000Z', deletedAt: '2026-10-01T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: recently deleted notes`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  await page.getByRole('region', {name: 'Open note'}).getByRole('button', {name: 'Delete note'}).click();
  await expect(page.getByText('“Fictional old plan” deleted. It waits 30 days in Notes → Notes → Recently deleted.').first()).toBeVisible();
  const list = page.locator('section[aria-labelledby="note-list-title"]');
  await expect(list.locator('ul.note-list').first().locator('strong')).toHaveText(['Fictional ideas']);
  // The one deleted in October left on arrival; the one deleted today waits.
  const fold = list.locator('details.note-trash-fold');
  await expect(fold.locator('summary')).toHaveText(/Recently deleted\s*· 1 note, kept 30 days/);
  await expect.poll(async () => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{}').trash ?? []).map((n: {id: string}) => n.id), NOTES_KEY)).toEqual(['n-a']);
  await list.getByLabel('Search', {exact: true}).fill('later');
  await expect(list.locator('.note-results')).not.toContainText('Fictional old plan');
  await list.getByLabel('Search', {exact: true}).fill('');
  await fold.locator('summary').click();
  await expect(fold.locator('.note-trash-list li')).toContainText(['Deleted Nov 22, 2026 · 29 days left']);
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await fold.getByRole('button', {name: 'Restore “Fictional old plan”'}).click();
  await expect(page.getByRole('region', {name: 'Open note'}).getByRole('heading', {name: 'Fictional old plan'})).toBeVisible();
  // Delete again, then Empty now (a confirmation first).
  await page.getByRole('region', {name: 'Open note'}).getByRole('button', {name: 'Delete note'}).click();
  await list.locator('details.note-trash-fold summary').click();
  await list.getByRole('button', {name: 'Empty now…'}).click();
  await list.getByRole('button', {name: 'Empty now', exact: true}).click();
  await expect(list.locator('details.note-trash-fold')).toContainText('1 note was deleted for good');
  await expect(list.locator('details.note-trash-fold summary')).toHaveText(/none; a deleted note waits here 30 days/);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
