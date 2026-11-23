// @vitest-environment jsdom
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import WorkoutStatus from '../../components/health/r5/workout-status';
import {PLANNED_KEY} from './planned';

/**
 * Session AV lane 2 (fixb5): "Change it" puts focus on the status that is set (the checked radio), not on the first radio
 * of the list: `querySelector('input:checked, input')` returns the first input in the page's order (tests/av2-r5-status.spec.ts).
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('requestAnimationFrame', (run: FrameRequestCallback) => window.setTimeout(() => run(0), 0));
  localStorage.setItem(PLANNED_KEY, JSON.stringify({version: 1, items: [], statuses: [{id: 'status-a', kind: 'break', from: '2026-11-16', createdAt: '2026-11-16T09:00:00.000Z'}]}));
  element = document.createElement('div'); document.body.append(element); root = createRoot(element);
});
afterEach(async () => { await act(async () => root.unmount()); element.remove(); localStorage.clear(); vi.unstubAllGlobals(); });

test('Change it focuses the radio of the status that is set', async () => {
  await act(async () => root.render(h(WorkoutStatus, {today: '2026-11-19'})));
  const change = [...element.querySelectorAll('button')].find(b => b.textContent === 'Change it')!;
  expect(change).toBeTruthy();
  await act(async () => { change.click(); await new Promise(done => setTimeout(done, 10)); });
  const focused = document.activeElement as HTMLInputElement;
  expect(focused.type).toBe('radio');
  expect(focused.checked).toBe(true);
  expect(focused.parentElement!.textContent!.trim()).toBe('On a break');
});
