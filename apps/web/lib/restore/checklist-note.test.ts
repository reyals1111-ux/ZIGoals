// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {CHECKLIST_NOT_RESTORED} from './checklist-note';
import {NEVER_RESTORED} from './plan';

// Session AK (journey question J6-2, owner): the Checklist is never restored, and the restore screen and "Test a backup"
// now say so instead of implying that every part comes back. The rule (plan.ts NEVER_RESTORED) is unchanged.
vi.mock('./test-restore', () => ({testBackup: async () => ({exportedAt: null, app: null, demo: false, ok: 3, parts: [{label: 'Goals', ok: true}, {label: 'Habits', ok: true}, {label: 'Health', ok: true}], photos: 0, never: NEVER_RESTORED})}));
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });

test('the rule names the Checklist, and the sentence says it plainly', () => {
  expect(NEVER_RESTORED).toContain('Checklist favourites and day history');
  expect(CHECKLIST_NOT_RESTORED).toMatch(/^The Checklist is never restored from a backup/);
});

test('"Test a backup" says, beside "All N parts would restore.", that the Checklist and the rest of the list never are', async () => {
  const {default: TestBackup} = await import('../../components/restore/test-backup');
  await act(async () => root.render(createElement(TestBackup)));
  const input = element.querySelector<HTMLInputElement>('input[type=file]')!;
  Object.defineProperty(input, 'files', {value: [new File(['x'], 'zigoals-export.zip', {type: 'application/zip'})]});
  await act(async () => { input.dispatchEvent(new Event('change', {bubbles: true})); });
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  const status = element.querySelector('[role=status]')!.textContent!;
  expect(status).toMatch(/^All 3 parts would restore\./);
  expect(status).toContain(CHECKLIST_NOT_RESTORED);
  expect(status).toContain(NEVER_RESTORED);
});

test('the restore screen says it before a file is chosen, and lists the whole rule, not a shorter hand-made list', () => {
  const source = readFileSync(join(__dirname, '..', '..', 'components', 'restore', 'restore-backup.tsx'), 'utf8');
  expect(source).toMatch(/never in it and never restored\. \{CHECKLIST_NOT_RESTORED\}<\/p>/);
  expect(source).toContain('{preview.never}</p>');
  expect(source).not.toContain('recent searches and Point &amp; tell notes.');
});
