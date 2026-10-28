import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {AI_MEMORY_KEY} from '../lib/ai/store/keys';

/**
 * Session AI (feature 3): "What ZIGi remembers" — the person's notes on one page: see, pause (kept, never sent), edit,
 * export as a file and erase. Device only; offline; empty start plus two fictional notes.
 */
test.use({timezoneId: 'UTC'});
const NOW = '2026-10-28T09:00:00.000Z';
const note = (id: string, text: string, category: string) => ({id, text, category, source: 'person', createdAt: NOW, updatedAt: NOW});
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/manifest.webmanifest');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    [AI_MEMORY_KEY]: JSON.stringify({version: 1, notes: [note('note_a', 'I train in the morning', 'schedule'), note('note_b', 'I prefer short answers', 'preferences')]}),
  });
});
const notes = async (page: Page) => (JSON.parse((await page.evaluate(k => localStorage.getItem(k), AI_MEMORY_KEY)) ?? 'null') as {notes: {id: string; text: string; paused?: boolean}[]} | null)?.notes ?? [];

test('What ZIGi remembers: the notes, a pause that keeps the note, export, and delete', async ({page}) => {
  await page.goto('/app/zigi/memory');
  await expect(page.getByRole('heading', {level: 1, name: 'What ZIGi remembers'})).toBeVisible();
  const list = page.getByRole('list', {name: 'Your notes'});
  await expect(list.getByRole('listitem')).toHaveCount(2);
  // Pause: the note stays on the device and is marked paused (notesForAi leaves it out; unit-tested in memory.test.ts).
  const first = list.getByRole('listitem').filter({hasText: 'I train in the morning'});
  await first.getByRole('switch', {name: 'Use this note'}).click();
  await expect.poll(async () => (await notes(page)).find(n => n.id === 'note_a')?.paused).toBe(true);
  await expect(first).toContainText('Paused: kept on this device, never sent.');
  // Export: one JSON file with the notes.
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export my notes'}).click();
  expect((await download).suggestedFilename()).toBe('zigi-notes.json');
  // Delete one note.
  await page.getByRole('button', {name: 'Delete the note "I prefer short answers"'}).click();
  await expect.poll(async () => (await notes(page)).map(n => n.id)).toEqual(['note_a']);
});
test('Settings links to the page from What ZIGi knows about me', async ({page}) => {
  await page.goto('/app/settings#zigi-notes');
  await expect(page.locator('#zigi-notes')).toHaveAttribute('open', '');
  await expect(page.locator('#zigi-notes').getByRole('link', {name: 'Open What ZIGi remembers'})).toHaveAttribute('href', '/app/zigi/memory');
});
