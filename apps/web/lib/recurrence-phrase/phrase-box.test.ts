// @vitest-environment jsdom
import {afterEach, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import RecurrencePhrase, {type PhraseChoice} from '../../components/habits/recurrence-phrase';

// Session AK (item 21): the habit form's phrase box, rendered: chips before saving, unknown words marked, nothing guessed.
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null, host: HTMLDivElement | null = null;
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; });
function mount(onUse: (c: PhraseChoice) => void) {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root!.render(createElement(RecurrencePhrase, {today: '2026-10-31', onUse})));
  const input = host.querySelector('input')!, button = [...host.querySelectorAll('button')].find(b => b.textContent === 'Use this schedule')!;
  const type = (text: string) => act(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!; set.call(input, text); input.dispatchEvent(new Event('input', {bubbles: true})); });
  return {host, input, button, type};
}

test('a phrase shows its chips, and "Use this schedule" hands the schedule, time and part of the day to the form', () => {
  const onUse = vi.fn(), box = mount(onUse);
  expect(box.button.disabled).toBe(true);
  box.type('every other tue 7am');
  const chips = [...box.host.querySelectorAll('.recurrence-phrase-chips li')].map(li => li.textContent);
  expect(chips[0]).toMatch(/Every other week, from Tue/); expect(chips[1]).toMatch(/Reminder at/); expect(chips[2]).toMatch(/Morning/);
  expect(box.button.disabled).toBe(false);
  act(() => box.button.click());
  expect(onUse).toHaveBeenCalledWith({schedule: {kind: 'interval', every: 14, anchor: '2026-11-03'}, time: '07:00', partOfDay: 'morning'});
  expect(box.host.textContent).toMatch(/Schedule set:/);
});

test('unknown words are marked and named in text; with no schedule nothing can be used', () => {
  const onUse = vi.fn(), box = mount(onUse);
  box.type('every other tuw');
  expect([...box.host.querySelectorAll('mark')].map(m => m.textContent)).toEqual(['other (not understood)', 'tuw (not understood)']);
  expect(box.host.textContent).toMatch(/Not understood, so left out: “other”, “tuw”/);
  expect(box.button.disabled).toBe(true);
  act(() => box.button.click()); expect(onUse).not.toHaveBeenCalled();
  box.type('8x a week');
  expect(box.host.textContent).toMatch(/At most 7 times a week/); expect(box.button.disabled).toBe(true);
});
