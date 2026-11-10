// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {hideToast, showStatus, showToast, showUndo, shownToasts, UndoToastHost} from '../../components/ui/undo-toast';
import {changeWithUndo, removeWithUndo} from '../../components/ui/remove-with-undo';

/** Session AL (3e): the one toast system — restore() runs, the queue never exceeds its cap, Escape closes it. */
vi.mock('next/link', () => ({default: ({href, children, ...rest}: {href: string; children: unknown}) => createElement('a', {href, ...rest}, children as never)}));
let host: HTMLDivElement, root: Root;
beforeEach(async () => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(createElement(UndoToastHost)));
});
afterEach(async () => { await act(async () => { hideToast(); hideToast(); root.unmount(); }); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const toasts = () => [...host.querySelectorAll<HTMLElement>('.aa-toast')];
const undoButton = () => host.querySelector<HTMLButtonElement>('.aa-toast-undo')!;

test('Undo runs restore() once and says what it did; the store record is what restore changed', async () => {
  const store = {water: [{id: 'w1', ml: 250}]};
  const restore = vi.fn(() => { store.water = []; });
  await act(async () => { showUndo({message: 'Water logged: 250 mL.', restore, undone: 'Water entry removed.'}); });
  expect(toasts()).toHaveLength(1);
  expect(toasts()[0]!.textContent).toContain('Water logged: 250 mL.');
  await act(async () => { undoButton().click(); });
  expect(restore).toHaveBeenCalledTimes(1);
  expect(store.water).toEqual([]);
  expect(toasts()[0]!.textContent).toContain('Water entry removed.');
  expect(undoButton()).toBeNull();
});
test('a failing restore says so, as an alert', async () => {
  await act(async () => { showUndo({message: 'Task removed.', restore: () => { throw new Error('the record is locked'); }}); });
  await act(async () => { undoButton().click(); });
  expect(toasts()[0]!.textContent).toContain('Could not undo: the record is locked');
  expect(toasts()[0]!.getAttribute('role')).toBe('alert');
});
test('showUndo refuses an offer without restore()', () => {
  expect(() => showUndo({message: 'x'} as never)).toThrow(/restore/);
});
test('the queue never exceeds its cap: twenty toasts in a row leave one, the newest', async () => {
  await act(async () => { for (let i = 0; i < 20; i++) (i % 2 ? showStatus : (m: string) => showUndo({message: m, restore: () => {}}))(`Toast ${i}`); });
  expect(shownToasts()).toHaveLength(1);
  expect(toasts()).toHaveLength(1);
  expect(toasts()[0]!.textContent).toContain('Toast 19');
  expect(host.querySelector('.aa-toast-region')!.getAttribute('aria-live')).toBe('polite');
});
test('a status toast has no Undo; it leaves after its time; the old showToast API still works', async () => {
  vi.useFakeTimers();
  await act(async () => { showStatus('Day saved.', {timeoutMs: 6000}); });
  expect(undoButton()).toBeNull();
  await act(async () => { vi.advanceTimersByTime(5900); });
  expect(toasts()).toHaveLength(1);
  await act(async () => { vi.advanceTimersByTime(200); });
  expect(toasts()).toHaveLength(0);
  const undo = vi.fn();
  await act(async () => { showToast({message: 'Old API', undo}); });
  await act(async () => { undoButton().click(); });
  expect(undo).toHaveBeenCalledTimes(1);
});
test('Escape on the toast closes it, does not reach the page, and puts the focus back', async () => {
  const before = document.createElement('button'); document.body.append(before); before.focus();
  const pageEscape = vi.fn(); document.addEventListener('keydown', pageEscape);
  await act(async () => { showUndo({message: 'Habit skipped.', restore: () => {}}); });
  await act(async () => { undoButton().focus(); });
  expect(document.activeElement).toBe(undoButton());
  await act(async () => { undoButton().dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true, cancelable: true})); });
  expect(toasts()).toHaveLength(0);
  expect(pageEscape).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(before);
  document.removeEventListener('keydown', pageEscape); before.remove();
});
test('changeWithUndo: Undo reverses exactly the save in the latest store record (NB-081)', async () => {
  type H = {updatedAt: string; water: {id: string; ml: number}[]};
  let record: H = {updatedAt: 't0', water: [{id: 'a', ml: 250}]};
  const update = async (fn: (latest: H) => H) => { record = fn(record); };
  const offered = await act(async () => changeWithUndo(update, h => ({updatedAt: 't1', water: [...h.water, {id: 'b', ml: 500}]}), 'Water logged: 500 mL.', {undone: 'Water entry removed.'}));
  expect(offered).toBe(true);
  // Something else saved since: kept.
  record = {...record, water: [...record.water, {id: 'c', ml: 100}]};
  await act(async () => { undoButton().click(); });
  expect(record.water.map(w => w.id)).toEqual(['a', 'c']);
  expect(toasts()[0]!.textContent).toContain('Water entry removed.');
  // A save that changed no listed item: said without an Undo.
  expect(await act(async () => changeWithUndo(update, h => ({...h, updatedAt: 't2'}), 'Saved.'))).toBe(false);
  expect(undoButton()).toBeNull();
});
test('removeWithUndo still puts removed items back', async () => {
  let record = {tasks: [{id: '1'}, {id: '2'}]};
  const update = async (fn: (latest: typeof record) => typeof record) => { record = fn(record); };
  await act(async () => removeWithUndo(update, r => ({tasks: r.tasks.filter(t => t.id !== '1')}), 'Task removed.'));
  await act(async () => { undoButton().click(); });
  expect(record.tasks.map(t => t.id)).toEqual(['1', '2']);
});
