// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest';
import {AutoRulesEditor, AutoTickBadge} from '../../components/habits/auto-rules-editor';
import {newAutoRule} from './engine';
import {DEFAULT_DISPLAY_LOCALE, setDisplayLocale} from '../visual-format';

// Session AK (5.6): the rule editor as plain sentences.
beforeAll(() => setDisplayLocale(DEFAULT_DISPLAY_LOCALE));
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const habits = [{id: 'w', title: 'Walk'}, {id: 'g', title: 'Gym'}];
const set = async (el: HTMLSelectElement | HTMLInputElement, value: string) => {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
  await act(async () => { el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', {bubbles: true})); });
};

test('lists rules as sentences; the form previews and saves a new rule', async () => {
  const onSave = vi.fn(), rule = newAutoRule({source: 'steps', comparator: 'at-least', threshold: 8000, habitId: 'w'}, new Date('2026-10-01T00:00:00Z'), 'r1');
  await act(async () => root.render(createElement(AutoRulesEditor, {rules: [rule], habits, onSave, onRemove: vi.fn()})));
  expect(host.querySelector('.auto-rules-sentence')!.textContent).toBe('When steps ≥ 8,000 → Walk is done');
  const source = host.querySelector<HTMLSelectElement>(".auto-rules-form select")!;
  await set(source!, 'workout');
  await set([...host.querySelectorAll<HTMLSelectElement>('.auto-rules-form select')].at(-1)!, 'g');
  expect(host.querySelector('.auto-rules-preview')!.textContent).toBe('When a workout is logged → Gym is done');
  await act(async () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({source: 'workout', comparator: 'recorded', habitId: 'g', unit: 'minutes'}));
  expect(host.querySelector('[role="status"].auto-rules-status')!.textContent).toBe('Rule added.');
});
test('a bad number or a refused save is said; contribution asks for a goal', async () => {
  const onSave = vi.fn().mockRejectedValue(Error('This habit already ticks itself off from Health.'));
  await act(async () => root.render(createElement(AutoRulesEditor, {rules: [], habits, goals: [{id: '7', name: 'Holiday fund'}], onSave, onRemove: vi.fn()})));
  await set(host.querySelector<HTMLInputElement>('.auto-rules-form input')!, '');
  await act(async () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
  expect(host.querySelector('[role="alert"]')!.textContent).toMatch(/whole number/);
  await set(host.querySelector<HTMLInputElement>('.auto-rules-form input')!, '9000');
  await act(async () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
  expect(host.querySelector('[role="alert"]')!.textContent).toContain('already ticks itself off');
  await set(host.querySelector<HTMLSelectElement>('.auto-rules-form select')!, 'contribution');
  await act(async () => host.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
  expect(host.querySelector('[role="alert"]')!.textContent).toBe('Choose the goal to watch.');
});
test('no habits: the next action and an example; the badge has a labelled Undo', async () => {
  const onUndo = vi.fn();
  await act(async () => root.render(createElement('div', null, createElement(AutoRulesEditor, {rules: [], habits: [], onSave: vi.fn(), onRemove: vi.fn()}), createElement(AutoTickBadge, {label: 'auto · from steps · 8,800 steps', habitTitle: 'Walk', onUndo}))));
  expect(host.textContent).toContain('Add a habit first');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Undo the automatic tick of Walk"]')!.click());
  expect(onUndo).toHaveBeenCalled();
});
