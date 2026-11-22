// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {useFollowAddressView} from '../components/health/follow-address-view';

/**
 * Session AV lane 2 (fixb2): Health's view follows the address when a link inside Health names another view (the Diary's
 * "See the week" → ?view=insights#health-challenge, which tests/av2-logging-challenge.spec.ts found staying on the Diary),
 * and the card the hash names is shown; opening the page and an address naming no view change nothing.
 */
const VIEWS = {diary: 'Diary', insights: 'Insights', weight: 'Weight'} as const;
let element: HTMLDivElement, root: Root, shown: string[], revealed: string[];
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); element = document.createElement('div'); document.body.append(element); root = createRoot(element); shown = []; revealed = []; });
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.unstubAllGlobals(); window.history.replaceState(null, '', '/'); });

function Workspace({param}: {param: string}) {
  const [view, setView] = useState<string>(VIEWS[param as keyof typeof VIEWS] ?? 'Diary');
  useFollowAddressView<string>(param, VIEWS, view, next => { shown.push(next); setView(next); }, id => revealed.push(id));
  return h('p', null, view);
}

test('a new view in the address is followed, and the card its hash names is shown', async () => {
  window.history.replaceState(null, '', '/app/health?view=diary');
  await act(async () => root.render(h(Workspace, {param: 'diary'})));
  expect(element.textContent).toBe('Diary');
  expect(shown).toEqual([]); expect(revealed).toEqual([]);
  window.history.replaceState(null, '', '/app/health?view=insights#health-challenge');
  await act(async () => root.render(h(Workspace, {param: 'insights'})));
  expect(element.textContent).toBe('Insights');
  expect(shown).toEqual(['Insights']);
  expect(revealed).toEqual(['health-challenge']);
});

test('an address naming no view, or the view already shown, changes nothing', async () => {
  await act(async () => root.render(h(Workspace, {param: 'weight'})));
  await act(async () => root.render(h(Workspace, {param: 'nothing-here'})));
  expect(element.textContent).toBe('Weight');
  expect(shown).toEqual([]); expect(revealed).toEqual([]);
});
