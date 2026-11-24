import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {addTask} from '../lib/tasks/engine';
import {emptyTasks} from '../lib/tasks/schema';
import {TASK_ATTACHMENT_DB, TASK_ATTACHMENT_STORE} from '../lib/tasks/attachments';

/**
 * Session AV lane 2 (r5-notes; LEDGER #355, Akiflow's files on a task): a PDF and a Word file on a task, kept in this
 * browser only; the PDF opens in the browser's viewer, the Word file is saved; Tasks → Files lists them with a search and
 * the space used, Remove has Undo; a file dropped on Tasks makes an Inbox task holding it. Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional files made here; nothing is fetched.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const at = new Date('2026-11-22T07:00:00Z');
const seeded = addTask(emptyTasks(), {title: 'Book the fictional train', due: '2026-11-22'}, {id: 'task_fictional-train', at, today: '2026-11-22'});
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const kept = (page: import('@playwright/test').Page) => page.evaluate(([db, store]) => new Promise<{kind: string; taskId: string; name?: string}[]>(resolve => {
  const r = indexedDB.open(db, 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(store)) r.result.createObjectStore(store); };
  r.onsuccess = () => { const q = r.result.transaction(store, 'readonly').objectStore(store).getAll(); q.onsuccess = () => { resolve((q.result as {kind: string; taskId: string; name?: string}[]).map(v => ({kind: v.kind, taskId: v.taskId, name: v.name}))); r.result.close(); }; };
}), [TASK_ATTACHMENT_DB, TASK_ATTACHMENT_STORE] as const);

for (const theme of THEMES) test(`${theme}: files on a task, the Files list and a dropped file`, async ({page, isMobile, context}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings'); await settle(page);
  await page.evaluate(v => { localStorage.setItem('zigoals:tasks:v1', v); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify(seeded));
  await page.goto('/app/tasks?task=task_fictional-train'); await settle(page);
  const editor = page.getByRole('form', {name: 'Edit “Book the fictional train”'});
  const group = editor.getByRole('group', {name: /^Files/});
  await expect(group).toContainText('No files yet.');
  await group.locator('input[type=file]').setInputFiles([{name: 'Ticket.pdf', mimeType: 'application/pdf', buffer: PDF}, {name: 'Plan.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('PK fictional')}]);
  await expect(group).toContainText('2 files kept on this device.');
  await expect.poll(async () => (await kept(page)).map(k => [k.kind, k.name]).sort()).toEqual([['file', 'Plan.docx'], ['file', 'Ticket.pdf']]);
  const f = await axe(page, group);
  expect(f.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(f)).toEqual([]);
  // The PDF opens in a new tab (the browser's viewer); the Word file is saved.
  const tab = context.waitForEvent('page');
  await group.getByRole('button', {name: /^Open “Ticket\.pdf”/}).click();
  await (await tab).close();
  const download = page.waitForEvent('download');
  await group.getByRole('button', {name: /^Save “Plan\.docx”/}).click();
  expect((await download).suggestedFilename()).toBe('Plan.docx');
  // Tasks → Files: search, the space used, Remove with Undo.
  await page.getByRole('button', {name: 'Files', exact: true}).click();
  const panel = page.getByRole('region', {name: 'Files'});
  await expect(panel).toContainText(/2 files on your tasks, \d+ kB of 100 MB on this device\./);
  await panel.getByLabel('Search files').fill('ticket');
  await expect(panel.getByRole('list', {name: 'Files on your tasks'}).getByRole('listitem')).toHaveCount(1);
  await panel.getByRole('button', {name: 'Remove “Ticket.pdf”'}).click();
  await expect.poll(async () => (await kept(page)).length).toBe(1);
  await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).click();
  await expect.poll(async () => (await kept(page)).length).toBe(2);
  // A file dropped on Tasks makes an Inbox task holding it.
  const drop = await page.evaluateHandle(() => { const dt = new DataTransfer(); dt.items.add(new File(['fictional words'], 'Receipt notes.txt', {type: 'text/plain'})); return dt; });
  await page.locator('.tasks-page').dispatchEvent('dragover', {dataTransfer: drop});
  await page.locator('.tasks-page').dispatchEvent('drop', {dataTransfer: drop});
  await expect(page.getByText('An Inbox task holds the file: open one to see it.')).toBeVisible();
  await expect.poll(async () => (await kept(page)).filter(k => k.name === 'Receipt notes.txt').length).toBe(1);
  await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:tasks:v1') ?? '{}').tasks ?? []).map((t: {title: string}) => t.title))).toContain('Receipt notes');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
