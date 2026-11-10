// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {CHECKLIST_RESTORE_NOTE} from './checklist-note';
import {DEVICE_PARTS, NEVER_RESTORED} from './plan';

// Session AK (journey question J6-2): the restore screen and "Test a backup" say what the Checklist does on a restore.
// Session AL (P-LS-36, LS-025, LS-064): the Checklist now restores (path and days with Today and Life, Health quick inputs
// only with Health); only today's ticks never do, and the rule and the sentence say exactly that.
vi.mock('./test-restore', () => ({testBackup: async () => ({exportedAt: null, app: null, demo: false, ok: 3, parts: [{label: 'Goals', ok: true}, {label: 'Habits', ok: true}, {label: 'Health', ok: true}], photos: 0, never: NEVER_RESTORED})}));
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });

test('the rule names what of the Checklist never restores, the parts name what does, and the sentence says it plainly', () => {
  expect(NEVER_RESTORED).toContain('today’s Checklist ticks');
  expect(NEVER_RESTORED).not.toContain('Checklist favourites and day history');
  expect(DEVICE_PARTS.filter(p => p.key.startsWith('zigoals:checklist')).map(p => [p.id, p.group, p.health])).toEqual([['device:checklist', 'Today and Life', false], ['device:checklistHealth', 'Health', true], ['device:checklistDays', 'Today and Life', false]]);
  expect(CHECKLIST_RESTORE_NOTE).toMatch(/^The Checklist restores too: .*Health quick inputs only with Health\. Today’s ticks stay as they are on this device\.$/);
});

test('"Test a backup" says, beside "All N parts would restore.", how the Checklist restores and what never does', async () => {
  const {default: TestBackup} = await import('../../components/restore/test-backup');
  await act(async () => root.render(createElement(TestBackup)));
  const input = element.querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input, 'files', {value: [new File(['x'], 'zigoals-export.zip', {type: 'application/zip'})]});
  await act(async () => { input.dispatchEvent(new Event('change', {bubbles: true})); });
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  const status = element.querySelector('[role=status]')!.textContent!;
  expect(status).toMatch(/^All 3 parts would restore\./);
  expect(status).toContain(CHECKLIST_RESTORE_NOTE);
  expect(status).toContain(NEVER_RESTORED);
});

test('the restore screen says it before a file is chosen, and lists the whole rule, not a shorter hand-made list', () => {
  const source = readFileSync(join(__dirname, '..', '..', 'components', 'restore', 'restore-backup.tsx'), 'utf8');
  expect(source).toMatch(/never in it and never restored\. \{CHECKLIST_RESTORE_NOTE\}<\/p>/);
  expect(source).toContain('{preview.never}</p>');
  expect(source).not.toContain('recent searches and Point &amp; tell notes.');
});
