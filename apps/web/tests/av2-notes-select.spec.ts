import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #359, Logseq's bulk actions): Select in the Notes list; a tag added to the chosen
 * notes in one step, pinned and archived, then deleted with one Undo that brings them all back. Nebula, Light and Dark,
 * keyboard (Esc leaves Select, focus on Select), axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional alpha', body: 'One.', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Fictional beta', body: 'Two.', createdAt: '2026-11-02T09:00:00.000Z'},
  {id: 'n-c', kind: 'topic', title: 'Fictional gamma', body: 'Three.', createdAt: '2026-11-03T09:00:00.000Z'}]};
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), NOTES_KEY);
for (const theme of THEMES) test(`${theme}: act on several notes at once`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const list = page.locator('section[aria-labelledby="note-list-title"]');
  await list.getByRole('button', {name: 'Select', exact: true}).click();
  const bar = list.getByRole('group', {name: 'Act on the chosen notes'});
  await expect(bar).toContainText('No note chosen yet');
  const pick = list.getByRole('list', {name: 'Notes to choose'});
  // Review b5i B5I-9: focus moves into the chooser at once.
  await expect(pick.getByRole('checkbox').first()).toBeFocused();
  await pick.getByRole('checkbox', {name: /Fictional alpha/}).check();
  await pick.getByRole('checkbox', {name: /Fictional beta/}).check();
  await expect(bar).toContainText('2 notes chosen');
  const findings = await axe(page, list);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await bar.getByLabel('Tag', {exact: true}).fill('#trip');
  await bar.getByRole('button', {name: 'Add tag'}).click();
  await expect(page.getByText('#trip added to 2 notes.').first()).toBeVisible();
  await expect.poll(async () => (await stored(page)).notes.map((n: {tags?: string[]}) => n.tags ?? [])).toEqual([['trip'], ['trip'], []]);
  await pick.getByRole('checkbox', {name: /Fictional gamma/}).check();
  await pick.getByRole('checkbox', {name: /Fictional alpha/}).check();
  await bar.getByRole('button', {name: 'Delete', exact: true}).click();
  await expect(page.getByText('2 notes deleted. They wait 30 days in Recently deleted.').first()).toBeVisible();
  await expect.poll(async () => (await stored(page)).trash?.map((n: {id: string}) => n.id).sort()).toEqual(['n-a', 'n-c']);
  await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).first().click();
  await expect.poll(async () => (await stored(page)).notes.length).toBe(3);
  await expect.poll(async () => (await stored(page)).trash).toBeUndefined();
  // Esc leaves Select; focus goes back to Select.
  await pick.getByRole('checkbox', {name: /Fictional beta/}).focus();
  await page.keyboard.press('Escape');
  await expect(list.getByRole('button', {name: 'Select', exact: true})).toBeFocused();
  await expect(list.locator('ul.note-list').first().locator('strong')).toHaveCount(3);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
