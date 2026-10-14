import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';

/**
 * Session AB-Cloud Part 8 (ADR-023 C26, persona #10): ZIGi's History. Delete and "Delete all chats" hide at once with an
 * Undo for 8 seconds; Undo brings the chats back untouched; the chats are removed only when the time ends (or another
 * delete replaces it). Two fictional chats are stored straight in the chat database; no AI is called.
 */
const NOW = '2026-10-14T19:00:00.000Z';
// page.clock.install keeps time flowing in real time as well, so each "not yet" check sits 1.5 s before the 8 s end and the
// "gone" check after it: real time spent between steps under load can never carry the deletion across either check (Gate C:
// with a 100 ms margin the full local suite saw the deletion land before the "not yet" check).
const chat = (id: string, title: string, minutes: number) => ({version: 1, id, scope: 'local', title, provider: 'local', model: 'mock-chat', createdAt: NOW, updatedAt: new Date(Date.parse(NOW) - minutes * 60000).toISOString(), turns: []});
const CHATS = [chat('chat-first-0001', 'Fictional first chat', 1), chat('chat-second-002', 'Fictional second chat', 2)];
const stored = (page: Page) => page.evaluate(() => new Promise<string[]>((resolve, reject) => { const r = indexedDB.open('zigoals-ai-chats-v1'); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.length) { db.close(); resolve([]); return; } const t = db.transaction(db.objectStoreNames[0]!, 'readonly'), q = t.objectStore(db.objectStoreNames[0]!).getAllKeys(); q.onsuccess = () => { db.close(); resolve((q.result as string[]).sort()); }; }; }));
/** The stored chats themselves, by key, to show that Undo leaves them untouched (Gate C test audit). */
const storedChats = (page: Page) => page.evaluate(() => new Promise<Record<string, unknown>>((resolve, reject) => { const r = indexedDB.open('zigoals-ai-chats-v1'); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result, t = db.transaction('chats', 'readonly'), s = t.objectStore('chats'), keys = s.getAllKeys(), values = s.getAll(); t.oncomplete = () => { db.close(); resolve(Object.fromEntries((keys.result as string[]).map((k, i) => [k, values.result[i]]))); }; }; }));
const AS_STORED = Object.fromEntries(CHATS.map(c => [`local:${c.id}`, c]));
test.beforeEach(async ({page}) => {
  await page.clock.install({time: NOW});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(({values, chats}) => new Promise<void>((resolve, reject) => {
    localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    const r = indexedDB.open('zigoals-ai-chats-v1', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('chats')) r.result.createObjectStore('chats'); };
    r.onerror = () => reject(r.error);
    r.onsuccess = () => { const db = r.result, t = db.transaction('chats', 'readwrite'); for (const c of chats) t.objectStore('chats').put(c, `local:${c.id}`); t.oncomplete = () => { db.close(); resolve(); }; };
  }), {values: {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}), [AI_SETTINGS_KEY]: JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234'})}, chats: CHATS});
  expect(await stored(page)).toEqual(['local:chat-first-0001', 'local:chat-second-002']);
});
async function history(page: Page) {
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await panel.getByRole('button', {name: 'More: history, customize, settings and help'}).click();
  await panel.getByRole('button', {name: 'Chat history'}).click();
  const region = panel.getByRole('region', {name: 'Chat history'});
  await expect(region.locator('.ai-history-list li')).toHaveCount(2);
  return region;
}
const row = (region: ReturnType<Page['locator']>, title: string) => region.locator('.ai-history-list li').filter({hasText: title});

test('Delete hides a chat with Undo; Undo brings it back; the chat is removed only when the 8 seconds end', async ({page}) => {
  const region = await history(page);
  await row(region, 'Fictional first chat').getByRole('button', {name: 'Delete', exact: true}).click();
  await expect(row(region, 'Fictional first chat')).toHaveCount(0);
  await expect(region.getByRole('status')).toHaveText('“Fictional first chat” deleted. Undo');
  expect(await stored(page)).toHaveLength(2);
  await region.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(row(region, 'Fictional first chat')).toHaveCount(1);
  await expect(region.getByRole('status')).toHaveCount(0);
  await page.clock.runFor(9000);
  expect(await storedChats(page)).toEqual(AS_STORED);
  // Deleted again, and the time runs out: removed from the device.
  await row(region, 'Fictional first chat').getByRole('button', {name: 'Delete', exact: true}).click();
  await page.clock.runFor(6500);
  expect(await stored(page)).toHaveLength(2);
  await page.clock.runFor(1600);
  await expect.poll(() => stored(page)).toEqual(['local:chat-second-002']);
  await expect(region.getByRole('status')).toHaveCount(0);
  await expect(region.locator('.ai-history-list li')).toHaveCount(1);
});

test('"Delete all chats" keeps its confirmation, then hides every chat with Undo; a second delete ends the first one\'s time', async ({page}) => {
  const region = await history(page);
  await region.getByRole('button', {name: 'Clear all', exact: true}).click();
  await region.getByRole('button', {name: 'Delete all chats', exact: true}).click();
  await expect(region.locator('.ai-history-list li')).toHaveCount(0);
  await expect(region.getByRole('status')).toHaveText('All chats deleted. Undo');
  await region.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(region.locator('.ai-history-list li')).toHaveCount(2);
  await page.clock.runFor(9000);
  expect(await storedChats(page)).toEqual(AS_STORED);
  // One delete, then another before the first one's time ends: the first is removed at once, the second waits.
  await row(region, 'Fictional first chat').getByRole('button', {name: 'Delete', exact: true}).click();
  await row(region, 'Fictional second chat').getByRole('button', {name: 'Delete', exact: true}).click();
  await expect.poll(() => stored(page)).toEqual(['local:chat-second-002']);
  await expect(region.getByRole('status')).toHaveText('“Fictional second chat” deleted. Undo');
  await region.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(row(region, 'Fictional second chat')).toHaveCount(1);
  expect(await stored(page)).toEqual(['local:chat-second-002']);
});

test('"Delete all chats" removes every chat when its 8 seconds end', async ({page}) => {
  const region = await history(page);
  await region.getByRole('button', {name: 'Clear all', exact: true}).click();
  await region.getByRole('button', {name: 'Delete all chats', exact: true}).click();
  await page.clock.runFor(6500);
  expect(await storedChats(page)).toEqual(AS_STORED);
  await page.clock.runFor(1600);
  await expect.poll(() => stored(page)).toEqual([]);
  await expect(region.getByRole('status')).toHaveCount(0);
});

test('closing History ends the Undo time: the deleted chat is removed then, the other kept as it was', async ({page}) => {
  const region = await history(page);
  await row(region, 'Fictional first chat').getByRole('button', {name: 'Delete', exact: true}).click();
  await expect(region.getByRole('status')).toHaveText('“Fictional first chat” deleted. Undo');
  const panel = page.locator('dialog.ai-chat[open]');
  await panel.getByRole('button', {name: 'More: history, customize, settings and help'}).click();
  await panel.getByRole('button', {name: 'Chat history'}).click();
  await expect(panel.getByRole('region', {name: 'Chat history'})).toHaveCount(0);
  await expect.poll(() => stored(page)).toEqual(['local:chat-second-002']);
  expect(await storedChats(page)).toEqual({'local:chat-second-002': CHATS[1]});
});
