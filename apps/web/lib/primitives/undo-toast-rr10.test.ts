// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {clearOfField, hideToast, MOVED_ON_AFTER_MS, showUndo, shownToasts, UndoToastHost} from '../../components/ui/undo-toast';

/**
 * Release review AL (RR-10): on a phone the toast never covers the field the person types in (it sits above it, or below
 * it when there is no room above) and it leaves once they type the next thing; on a computer nothing changes.
 */
vi.mock('next/link', () => ({default: ({href, children, ...rest}: {href: string; children: unknown}) => createElement('a', {href, ...rest}, children as never)}));
const rect = (top: number, height: number, left = 16, width = 358) => ({top, bottom: top + height, left, right: left + width, height, width, x: left, y: top, toJSON() { return this; }});

test('clearOfField: above the field when there is room, below it when not, nothing when already clear', () => {
  expect(clearOfField(rect(522, 66), rect(530, 52), 664)).toBe(530 - 8 - 66);
  expect(clearOfField(rect(522, 66), rect(40, 52), 664)).toBeNull(); // the field is far above: already clear
  expect(clearOfField(rect(30, 66), rect(40, 52), 664)).toBe(40 + 52 + 8); // no room above: under it
  expect(clearOfField(rect(522, 66), rect(530, 52, 380, 10), 664)).toBeNull(); // side by side: clear
  expect(clearOfField(rect(522, 0), rect(530, 52), 664)).toBeNull(); // an empty region covers nothing
});

let host: HTMLDivElement, root: Root, field: HTMLTextAreaElement, now = 0, phone = true;
beforeEach(async () => {
  (globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal('matchMedia', () => ({get matches() { return phone; }, addEventListener() {}, removeEventListener() {}}));
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  field = document.createElement('textarea'); field.setAttribute('aria-label', 'Message NOVA'); document.body.append(field);
  field.getBoundingClientRect = () => rect(530, 52) as DOMRect;
  await act(async () => root.render(createElement(UndoToastHost)));
});
afterEach(async () => { await act(async () => { hideToast(); hideToast(); root.unmount(); }); host.remove(); field.remove(); phone = true; now = 0; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const region = () => host.querySelector<HTMLElement>('.aa-toast-region')!;
async function showOverField() {
  await act(async () => { showUndo({message: 'Water logged: 250 mL.', restore: () => undefined}); });
  region().getBoundingClientRect = () => (region().style.bottom ? rect(522 - (parseFloat(region().style.bottom) - 76), 66) : rect(522, 66)) as DOMRect;
  vi.spyOn(window, 'getComputedStyle').mockImplementation(el => ({bottom: (el as HTMLElement).style.bottom || '76px'}) as CSSStyleDeclaration);
}

test('on a phone, a field taking the focus under the toast moves the toast just above it', async () => {
  await showOverField();
  await act(async () => { field.focus(); await new Promise(r => requestAnimationFrame(() => r(null))); });
  expect(region().dataset.clearOf).toBe('field');
  // From 76 px off the bottom (its top at 522) to its top at 530 − 8 − 66 = 456: 76 + 66 = 142 px.
  expect(region().style.bottom).toBe('142px');
  expect(shownToasts()).toHaveLength(1);
});
test('on a phone, typing the next thing after the toast\'s first moments closes it; right after it shows, it stays', async () => {
  await showOverField();
  await act(async () => { field.focus(); field.dispatchEvent(new Event('input', {bubbles: true})); });
  expect(shownToasts(), 'typing at once is still the action that showed it').toHaveLength(1);
  now = MOVED_ON_AFTER_MS + 1;
  await act(async () => { field.dispatchEvent(new Event('input', {bubbles: true})); });
  expect(shownToasts()).toHaveLength(0);
});
test('on a computer nothing moves and typing leaves the toast', async () => {
  phone = false;
  await showOverField();
  now = MOVED_ON_AFTER_MS + 1;
  await act(async () => { field.focus(); field.dispatchEvent(new Event('input', {bubbles: true})); await new Promise(r => requestAnimationFrame(() => r(null))); });
  expect(region().dataset.clearOf).toBeUndefined();
  expect(shownToasts()).toHaveLength(1);
});
test('the Checklist\'s own toast slot keeps its place', async () => {
  const slot = document.createElement('div'); slot.className = 'checklist-toast-slot'; document.body.append(slot);
  await act(async () => { root.unmount(); });
  root = createRoot(slot);
  await act(async () => root.render(createElement(UndoToastHost)));
  await act(async () => { showUndo({message: 'Done.', restore: () => undefined}); });
  now = MOVED_ON_AFTER_MS + 1;
  await act(async () => { field.focus(); field.dispatchEvent(new Event('input', {bubbles: true})); });
  expect(shownToasts()).toHaveLength(1);
  await act(async () => { hideToast(); root.unmount(); }); slot.remove();
  root = createRoot(host);
});
