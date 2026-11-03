// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest';
import {WhatIfPanel, sliderMax} from '../../components/goals/what-if-panel';
import {DEFAULT_DISPLAY_LOCALE, setDisplayLocale} from '../visual-format';

// Session AK (6.2): the what-if panel, rendered: labelled sliders and number fields, a live result, the projection label.
beforeAll(() => setDisplayLocale(DEFAULT_DISPLAY_LOCALE));
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const points = [{day: '2026-09-01', value: 1000}, {day: '2026-10-31', value: 3000}];
const setValue = async (el: HTMLInputElement, value: string) => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value);
  await act(async () => { el.dispatchEvent(new Event('input', {bubbles: true})); });
};

test('shows the pace, then a what-if from the number field, always labelled a projection', async () => {
  await act(async () => root.render(createElement(WhatIfPanel, {goalName: 'Emergency fund', current: 3000, target: 6000, points, today: '2026-10-31', currency: 'EUR'})));
  expect(host.querySelector('.what-if-pace')!.textContent).toMatch(/^At your pace over the last 30 days you reach the target on .+\. About €2,000\.00 a month lately\.$/);
  expect(host.textContent).toContain('A projection from your own data, never a guarantee.');
  const range = host.querySelector<HTMLInputElement>('input[type="range"]')!, number = host.querySelector<HTMLInputElement>('input[type="number"]')!;
  expect(host.querySelector(`label[for="${range.id}"]`)!.textContent).toBe('Extra every month');
  expect(host.querySelector(`label[for="${number.id}"]`)!.textContent).toBe('Extra every month, as a number');
  await setValue(number, '500');
  expect(range.value).toBe('500');
  expect(host.querySelector('.what-if-headline')!.textContent).toMatch(/^With these changes you reach the target on .*\(9 days sooner\)\.$/);
});
test('a target date shows the pace it needs', async () => {
  await act(async () => root.render(createElement(WhatIfPanel, {goalName: 'Trip', current: 3000, target: 6000, points, today: '2026-10-31', currency: 'EUR', targetDate: '2026-12-30'})));
  expect(host.querySelector('.what-if-result')!.textContent).toMatch(/To reach it by .*: about €1,500\.00 a month \(€350\.00 a week\)\./);
});
test('slider range: about a twelfth of the target, rounded', () => {
  expect(sliderMax(15000)).toEqual({max: 2000, step: 100});
  expect(sliderMax(12)).toEqual({max: 1, step: 0.1});
});
