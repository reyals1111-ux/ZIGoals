// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {HabitReorderList} from '../../components/habits/reorder-list';
import {CompactHabitList, HabitListModeSwitch} from '../../components/habits/reorder-compact-list';
import type {CompactRow} from './compact';

// Session AK (5.7): the reorder list (buttons and keyboard) and the compact list, rendered.
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const habits = [{id: 'a', title: 'Walk'}, {id: 'b', title: 'Read'}, {id: 'c', title: 'Stretch'}];

test('reorder: labelled buttons move by one and the move is announced; the first cannot go up', async () => {
  const onReorder = vi.fn();
  await act(async () => root.render(createElement(HabitReorderList, {habits, onReorder})));
  const up = host.querySelector<HTMLButtonElement>('[aria-label="Move Walk up"]')!;
  expect(up.disabled).toBe(true);
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Move Stretch up"]')!.click());
  expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b']);
  expect(host.querySelector('[role="status"]')!.textContent).toBe('Stretch moved to position 2 of 3.');
  expect(host.querySelector('li')!.getAttribute('aria-label')).toBe('Walk, position 1 of 3');
});
test('reorder: Alt + ↓ on a focused row moves it; a refused save is said', async () => {
  const onReorder = vi.fn().mockRejectedValueOnce(Error('Storage is full.'));
  await act(async () => root.render(createElement(HabitReorderList, {habits, onReorder})));
  const first = host.querySelector('li')!;
  await act(async () => { first.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', altKey: true, bubbles: true})); });
  expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  expect(host.querySelector('[role="alert"]')!.textContent).toContain('Storage is full.');
});
test('compact list: a tappable day is a pressed/unpressed button with its date and state; static days are not buttons', async () => {
  const onToggle = vi.fn();
  const rows: CompactRow[] = [{id: 'a', title: 'Walk', today: 'due', cells: [
    {date: '2026-10-04', status: 'complete', done: true, tappable: true},
    {date: '2026-10-05', status: 'due', done: false, tappable: true},
  ]}, {id: 'b', title: 'Read', today: 'not-scheduled', cells: [
    {date: '2026-10-04', status: 'skipped', done: false, tappable: false},
    {date: '2026-10-05', status: 'not-scheduled', done: false, tappable: false},
  ]}];
  await act(async () => root.render(createElement(CompactHabitList, {rows, onToggle})));
  const cells = [...host.querySelectorAll<HTMLButtonElement>('button.habit-compact-cell')];
  expect(cells).toHaveLength(2);
  expect(cells[0]!.getAttribute('aria-pressed')).toBe('true');
  expect(cells[1]!.getAttribute('aria-label')).toMatch(/^Walk, .*: not done yet$/);
  await act(async () => cells[1]!.click());
  expect(onToggle).toHaveBeenCalledWith('a', '2026-10-05', true);
  expect(host.querySelectorAll('span.habit-compact-cell.is-static[role="img"]')).toHaveLength(2);
  expect(host.querySelector('thead th:last-child')!.textContent).toBe('Today');
});
test('compact list: empty state offers an example; the mode switch says which is on', async () => {
  const onChange = vi.fn();
  await act(async () => root.render(createElement('div', null, createElement(CompactHabitList, {rows: [], onToggle: vi.fn()}), createElement(HabitListModeSwitch, {mode: 'cards', onChange}))));
  expect(host.textContent).toContain('Drink a glass of water');
  const [cards, compact] = [...host.querySelectorAll<HTMLButtonElement>('.habit-list-mode button')];
  expect(cards!.getAttribute('aria-pressed')).toBe('true');
  await act(async () => compact!.click());
  expect(onChange).toHaveBeenCalledWith('compact');
});
