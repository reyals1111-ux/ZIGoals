import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';
import {DEVICE_LOCK_KEY, UNLOCKED_SESSION_KEY} from '../lib/device-lock';

/**
 * Session AV lane 2 (r4-notes; LEDGER #318, in its conservative form): Lock this note needs this device's screen-cover
 * PIN; a locked note then shows "This note is locked" until the PIN is typed (a wrong one is refused), and stays out of
 * Search and the Graph. Its words are hidden, not encrypted (said on the cover). The PIN here is set through the real
 * Settings form, so no hash is hand-made. At 390 and 1440, Nebula, Light and Dark, axe-clean. Fictional data.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional diary', body: 'Fictional private words.', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Fictional plan', body: 'Open words.', createdAt: '2026-11-02T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: lock a note`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  // Without a screen-cover PIN the lock says what it needs.
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await note.getByRole('button', {name: 'Lock this note'}).click();
  await expect(note.getByRole('status').filter({hasText: 'A note locks with this device’s screen-cover PIN'})).toBeVisible();
  // Set a PIN in Settings (the real form), staying unlocked in this tab.
  await page.goto('/app/settings#device-lock'); await hydrated(page);
  const lock = page.locator('#device-lock');
  const form = lock.getByRole('form', {name: 'Set a PIN'});
  await form.getByLabel('PIN (4 to 8 digits)').fill('2468');
  await form.getByLabel('The same PIN again').fill('2468');
  await form.getByRole('button', {name: 'Turn the lock on'}).click();
  await expect.poll(() => page.evaluate(k => !!localStorage.getItem(k), DEVICE_LOCK_KEY)).toBe(true);
  await page.evaluate(k => sessionStorage.setItem(k, '1'), UNLOCKED_SESSION_KEY);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  await note.getByRole('button', {name: 'Lock this note'}).click();
  await expect(note.getByRole('button', {name: 'Remove the lock'})).toBeVisible();
  // Open again: the cover; a wrong PIN is refused, the right one shows the words.
  await page.reload(); await hydrated(page);
  const cover = note.getByRole('region', {name: 'This note is locked'});
  await expect(cover).toBeVisible();
  await expect(note).not.toContainText('Fictional private words.');
  await expect(cover).toContainText('Its words are not encrypted');
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await cover.getByLabel('Your screen-cover PIN').fill('1111');
  await cover.getByRole('button', {name: 'Show this note'}).click();
  await expect(cover.getByRole('status')).toHaveText('That PIN is not right. Try again.');
  await cover.getByLabel('Your screen-cover PIN').fill('2468');
  await cover.getByRole('button', {name: 'Show this note'}).click();
  await expect(note.locator('.note-render')).toContainText('Fictional private words.');
  // Out of Search and the Graph.
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const list = page.locator('section[aria-labelledby="note-list-title"]');
  await expect(list.locator('.note-list li', {hasText: 'Fictional diary'})).toContainText('Locked note: its words show after your PIN.');
  await list.getByLabel('Search', {exact: true}).fill('private');
  await expect(list.getByText('No note has those words.')).toBeVisible();
  await page.goto('/app/notes?view=graph'); await hydrated(page);
  // Session AV lane 2 (fixb4; deliberate): exactly "List" — "Tuck the Checklist button away" also holds the word (as in
  // notes.spec.ts); while the graph's chunk loads it was the only match, so the click went there. As strict.
  await page.getByRole('button', {name: 'List', exact: true}).click();
  await expect(page.getByRole('list', {name: 'Notes, goals and habits and their links'})).not.toContainText('Fictional diary');
});
