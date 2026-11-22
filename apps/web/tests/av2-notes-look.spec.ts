import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #367, Craft's page look): an open note's Look sets a calm page colour in the
 * reading view (axe's colour contrast checked on the tinted page in every theme); a cover needs one of its own photos
 * (the fold says so); None takes the look off. Nebula, Light and Dark, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional garden', body: '## Beds\nTomatoes and **basil**, see [[Fictional seeds]].', createdAt: '2026-11-01T09:00:00.000Z'}]};
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), NOTES_KEY);
for (const theme of THEMES) test(`${theme}: a note's look`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  const fold = note.locator('details.note-look-fold');
  await expect(fold.locator('summary')).toHaveText(/Look\s*· a cover and a page colour/);
  await fold.locator('summary').click();
  await expect(fold.getByRole('group', {name: 'Cover'})).toContainText('Add a photo to this note first');
  await fold.getByRole('group', {name: 'Page colour'}).getByLabel('Sage').check();
  await expect(note.locator('.note-page')).toHaveAttribute('data-look', 'sage');
  await expect.poll(async () => (await stored(page)).notes[0].look).toEqual({colour: 'sage'});
  await expect(fold.locator('summary')).toHaveText(/Look\s*· Sage page/);
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await fold.getByRole('group', {name: 'Page colour'}).getByLabel('None').check();
  await expect(note.locator('.note-page')).not.toHaveAttribute('data-look', /./);
  await expect.poll(async () => 'look' in (await stored(page)).notes[0]).toBe(false);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
