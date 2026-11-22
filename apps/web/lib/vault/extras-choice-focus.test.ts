// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {ExtrasSyncChoice} from '../../components/sync/extras-sync-choice';

/**
 * Session AV lane 2 (fixb2): while a sync runs, Settings → Account & sync's "Also sync …" boxes take no change but stay
 * focusable (aria-disabled, not disabled): a box ticked from the keyboard turned disabled as the sync it started ran, and
 * the focus dropped to the page (tests/av2-sync-choices.spec.ts found it).
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const props = (busy: boolean, onEnable = vi.fn(async () => undefined)) => ({opened: true, busy, health: true, status: null, onEnable, onRemove: vi.fn(async () => undefined)});
const box = (name: string) => [...element.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].find(i => i.labels?.[0]?.textContent === name)!;

test('busy: every box keeps the focus and says it is unavailable; a change is not taken', async () => {
  const onEnable = vi.fn(async () => undefined);
  await act(async () => root.render(h(ExtrasSyncChoice, props(false, onEnable))));
  const journal = box('Also sync my journal');
  journal.focus();
  await act(async () => root.render(h(ExtrasSyncChoice, props(true, onEnable))));
  for (const input of element.querySelectorAll<HTMLInputElement>('input[type=checkbox]')) { expect(input.disabled).toBe(false); expect(input.getAttribute('aria-disabled')).toBe('true'); }
  expect(document.activeElement).toBe(journal);
  await act(async () => { journal.click(); });
  expect(journal.checked).toBe(false);
  expect(onEnable).not.toHaveBeenCalled();
});

test('not busy: no aria-disabled, and a tick is taken', async () => {
  const onEnable = vi.fn(async () => undefined);
  await act(async () => root.render(h(ExtrasSyncChoice, props(false, onEnable))));
  const journal = box('Also sync my journal');
  expect(journal.hasAttribute('aria-disabled')).toBe(false);
  await act(async () => { journal.click(); });
  await vi.waitFor(async () => { await act(async () => { await new Promise(r => setTimeout(r, 10)); }); expect(onEnable).toHaveBeenCalledWith(true); }, {timeout: 5000});
  expect(journal.checked).toBe(true);
});
