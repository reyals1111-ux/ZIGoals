// @vitest-environment jsdom
import {afterEach, expect, test} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {ProgressSlot, Slot, registerProgressCard, registerSlotCard} from '../components/progress/slot';

// Gate C audit: the browser render of the slots (the server snapshot is always empty; see progress-slot.test.ts).
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
const roots: Root[] = [];
afterEach(() => { act(() => { for (const r of roots.splice(0)) r.unmount(); }); document.body.innerHTML = ''; });
const mount = (element: ReturnType<typeof createElement>) => { const host = document.createElement('div'); document.body.append(host); const root = createRoot(host); roots.push(root); act(() => root.render(element)); return host; };

test('a page slot shows its registered cards in order in the browser, follows a card added later, and empties again', () => {
  const Card = () => createElement('p', null, 'game card'), Other = () => createElement('p', null, 'other card');
  const offA = registerProgressCard('activity', Card);
  const host = mount(createElement(ProgressSlot, {page: 'activity'}));
  expect(host.textContent).toBe('game card');
  let offB = () => {};
  act(() => { offB = registerProgressCard('activity', Other); });
  expect(host.textContent).toBe('game cardother card');
  act(() => { offA(); offB(); });
  expect(host.textContent).toBe('');
});

test('a named place shows only its own cards', () => {
  const Coach = () => createElement('p', null, 'coach');
  const off = registerSlotCard('review:coach', Coach);
  const own = mount(createElement(Slot, {place: 'review:coach'}));
  expect(own.textContent).toBe('coach');
  const other = mount(createElement(Slot, {place: 'today:game'}));
  expect(other.textContent).toBe('');
  act(() => off());
  expect(own.textContent).toBe('');
});
