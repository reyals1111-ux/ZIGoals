// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {hideToast, showStatus, UndoToastHost} from '../../components/ui/undo-toast';
import {removeWithUndo} from '../../components/ui/remove-with-undo';
import {PATH_REMOVAL_STACK} from '../checklist/habit-undo';

/** Session AL third pass (P-LS-08, LS-058): quick removals of one kind stack into one Undo that puts all of them back. */
vi.mock('next/link', () => ({default: ({href, children, ...rest}: {href: string; children: unknown}) => createElement('a', {href, ...rest}, children as never)}));
let host: HTMLDivElement, root: Root;
beforeEach(async () => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(UndoToastHost)));
});
afterEach(async () => { await act(async () => { hideToast(); hideToast(); root.unmount(); }); host.remove(); vi.unstubAllGlobals(); });
const toasts = () => [...host.querySelectorAll<HTMLElement>('.aa-toast')];
const undoButton = () => host.querySelector<HTMLButtonElement>('.aa-toast-undo')!;
type Path = {items: {id: string; label: string}[]};
const pathStore = () => {
  const store = {record: {items: ['a', 'b', 'c', 'd', 'e'].map(id => ({id, label: id.toUpperCase()}))} as Path};
  const update = (fn: (r: Path) => Path) => { store.record = fn(store.record); };
  const take = (id: string, words = `${id.toUpperCase()} is off your path. Its records stay on its page.`) =>
    act(async () => removeWithUndo(update, r => ({items: r.items.filter(i => i.id !== id)}), words, 'Back on your path.', {stack: PATH_REMOVAL_STACK}));
  return {store, update, take};
};

test('LS-058: three quick removals give one toast whose Undo puts all three back, each where it was', async () => {
  const {store, take} = pathStore();
  await take('b'); await take('d'); await take('a');
  expect(store.record.items.map(i => i.id)).toEqual(['c', 'e']);
  expect(toasts()).toHaveLength(1);
  expect(toasts()[0]!.textContent).toContain('3 items are off your path. Their records stay on their pages.');
  expect(undoButton().getAttribute('aria-label')).toBe('Undo: put all 3 back');
  await act(async () => { undoButton().click(); });
  expect(store.record.items.map(i => i.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  expect(toasts()[0]!.textContent).toContain('All 3 are back on your path.');
});

test('one removal reads and undoes exactly as before (the protected wording)', async () => {
  const {store, take} = pathStore();
  await take('c');
  expect(toasts()[0]!.textContent).toContain('C is off your path. Its records stay on its page.');
  await act(async () => { undoButton().click(); });
  expect(store.record.items.map(i => i.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  expect(toasts()[0]!.textContent).toContain('Back on your path.');
});

test('another toast in between, or an Undo already used, starts a new stack', async () => {
  const {store, take} = pathStore();
  await take('a');
  await act(async () => { showStatus('Saved.'); });
  await take('b');
  expect(toasts()[0]!.textContent).toContain('B is off your path.');
  await act(async () => { undoButton().click(); });
  expect(store.record.items.map(i => i.id)).toEqual(['b', 'c', 'd', 'e']);
  await take('c');
  expect(toasts()[0]!.textContent).toContain('C is off your path.');
  expect(toasts()[0]!.textContent).not.toContain('items are off');
});

test('items changed since are kept: Undo puts back only what is missing, in the latest record', async () => {
  const {store, update, take} = pathStore();
  await take('a'); await take('b');
  update(r => ({items: [...r.items, {id: 'z', label: 'Z'}]}));
  await act(async () => { undoButton().click(); });
  expect(store.record.items.map(i => i.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'z']);
});
