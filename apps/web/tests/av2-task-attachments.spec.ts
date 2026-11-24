import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';
import {TASK_ATTACHMENT_DB, TASK_ATTACHMENT_STORE} from '../lib/tasks/attachments';

/**
 * Session AV lane 2 (roadmap, LEDGER #8; Todoist's attachments): a photo and a short voice note on a task, kept in this
 * browser only (IndexedDB), shown in the task's editor beside its comments and removed after a confirmation — at 390 and
 * 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; nothing is fetched (the
 * microphone is a silent tone made on the page).
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-22T07:00:00Z');
const seeded = addTask(emptyTasks(), {title: 'Fix the fictional bike', due: '2026-11-22'}, {id: 'task_fictional-bike', at, today: '2026-11-22'});
// An 8 × 8 violet PNG, made here: nothing is fetched.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNYUPEfK2IYWhIAKxSFwScT0+MAAAAASUVORK5CYII=', 'base64');
const kept = (page: import('@playwright/test').Page) => page.evaluate(([db, store]) => new Promise<{kind: string; taskId: string}[]>(resolve => {
  const r = indexedDB.open(db, 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(store)) r.result.createObjectStore(store); };
  r.onsuccess = () => { const q = r.result.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => { resolve((q.result as {kind: string; taskId: string}[]).map(v => ({kind: v.kind, taskId: v.taskId}))); r.result.close(); }; };
}), [TASK_ATTACHMENT_DB, TASK_ATTACHMENT_STORE] as const);
const noSideways = (page: import('@playwright/test').Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
async function openEditor(page: import('@playwright/test').Page) {
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?task=task_fictional-bike'); await settle(page);
  const editor = page.getByRole('form', {name: 'Edit “Fix the fictional bike”'});
  return {editor, group: editor.getByRole('group', {name: /^Photos and voice notes/})};
}

for (const theme of THEMES) test(`${theme}: a photo on a task, shown and removed; the empty state teaches`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const {group} = await openEditor(page);
  await expect(group).toContainText('No photos or voice notes yet.');
  await expect(group).toContainText('Never uploaded or synced');
  await group.locator('input[type=file]').setInputFiles({name: 'bike.png', mimeType: 'image/png', buffer: PNG});
  await expect(group).toContainText('Photo kept on this device');
  await expect(group.getByRole('list', {name: 'Photos and voice notes on “Fix the fictional bike”'}).getByRole('listitem')).toHaveCount(1);
  await expect(group.getByRole('link', {name: /^Open photo 1 of “Fix the fictional bike”/})).toBeVisible();
  await expect.poll(() => kept(page)).toEqual([{kind: 'photo', taskId: 'task_fictional-bike'}]);
  const f = await axe(page, page.locator('main'));
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);
  // Remove asks first; Cancel keeps it and focus goes back to Remove.
  const remove = group.getByRole('button', {name: 'Remove photo 1 from “Fix the fictional bike”'});
  await remove.click();
  await group.getByRole('alertdialog', {name: 'Remove this photo?'}).getByRole('button', {name: 'Cancel'}).click();
  await expect(remove).toBeFocused();
  await remove.click();
  await group.getByRole('alertdialog', {name: 'Remove this photo?'}).getByRole('button', {name: 'Remove', exact: true}).click();
  await expect(group).toContainText('Photo removed from this device.');
  await expect.poll(() => kept(page)).toEqual([]);
  await expect(group.getByRole('button', {name: 'Add a photo'})).toBeFocused();
});

test('at 320 px the attachments fit with no sideways scroll', async ({page}) => {
  await offline(page);
  await page.setViewportSize({width: 320, height: 700});
  const {group} = await openEditor(page);
  await group.locator('input[type=file]').setInputFiles({name: 'bike.png', mimeType: 'image/png', buffer: PNG});
  await expect(group).toContainText('Photo kept on this device');
  expect(await noSideways(page)).toBe(true);
});

test('a short voice note is recorded, kept, played back and removed', async ({page, browserName}) => {
  test.skip(browserName !== 'chromium', 'the stand-in microphone uses Chromium’s WebM recorder');
  await offline(page);
  // A stand-in microphone: a quiet tone from the page's own audio, so no device or permission prompt is needed.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { const ctx = new AudioContext(), osc = ctx.createOscillator(), gain = ctx.createGain(), out = ctx.createMediaStreamDestination(); gain.gain.value = 0.01; osc.connect(gain).connect(out); osc.start(); return out.stream; };
  });
  const {group} = await openEditor(page);
  await group.getByRole('button', {name: 'Record a voice note'}).click();
  await expect(group.getByRole('status')).toContainText('Recording…');
  const stop = group.getByRole('button', {name: /^Stop and keep/});
  await expect(stop).toBeFocused();
  await page.waitForTimeout(1200);
  await stop.click();
  await expect(group).toContainText('Voice note kept on this device');
  await expect(group.getByRole('button', {name: 'Record a voice note'})).toBeFocused();
  await expect(group.locator('audio')).toHaveAttribute('aria-label', /^Voice note 1 of “Fix the fictional bike”/);
  await expect.poll(() => kept(page)).toEqual([{kind: 'voice', taskId: 'task_fictional-bike'}]);
  // Cancel recording keeps nothing.
  await group.getByRole('button', {name: 'Record a voice note'}).click();
  await group.getByRole('button', {name: 'Cancel recording'}).click();
  await expect(group).toContainText('Recording cancelled; nothing was kept.');
  await expect.poll(async () => (await kept(page)).length).toBe(1);
  await group.getByRole('button', {name: 'Remove voice note 1 from “Fix the fictional bike”'}).click();
  await group.getByRole('alertdialog', {name: 'Remove this voice note?'}).getByRole('button', {name: 'Remove', exact: true}).click();
  await expect.poll(() => kept(page)).toEqual([]);
});
