// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {JournalCompose} from '../../components/journal/journal-compose';
import {JOURNAL_KEY} from '../journal/schema';

/**
 * Session AV lane 2 (fixb1; LEDGER #38): switching a prompt pack on keeps the choice in the same tap. The box stays
 * ticked straight after the click (it used to spring back until a later import had resolved, so a quick tap or a slow
 * device saw it untick), and the journal record holds the pack at once; switching it off again works the same way.
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); localStorage.clear(); element = document.createElement('div'); document.body.append(element); root = createRoot(element); });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); });
const settle = async () => { for (let i = 0; i < 10; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); }); };
const packs = () => (JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? 'null') as {packs?: string[]} | null)?.packs;

test('a pack switched on stays ticked and is kept in the same tap; off again the same way', async () => {
  await act(async () => root.render(h(JournalCompose)));
  await settle();
  const fold = element.querySelector<HTMLDetailsElement>('details.prompt-packs-fold');
  expect(fold).toBeTruthy();
  await act(async () => { fold!.open = true; fold!.dispatchEvent(new Event('toggle')); });
  await settle();
  const sleep = () => [...element.querySelectorAll<HTMLInputElement>('.prompt-packs-list input[type="checkbox"]')].find(i => i.closest('label')?.textContent?.trim().startsWith('Sleep'));
  for (let i = 0; i < 100 && !sleep(); i++) await act(async () => { await new Promise(r => setTimeout(r, 20)); }); // the lazy list loads
  expect(sleep()).toBeTruthy();
  expect(sleep()!.checked).toBe(false);
  // A synchronous act: nothing that waits on a promise has run when the box is read.
  act(() => { sleep()!.click(); });
  expect(sleep()!.checked).toBe(true);
  expect(packs()).toEqual(['sleep']);
  expect(fold!.querySelector('summary')!.textContent).toContain('1 on');
  act(() => { sleep()!.click(); });
  expect(sleep()!.checked).toBe(false);
  expect(packs()).toEqual([]);
});
