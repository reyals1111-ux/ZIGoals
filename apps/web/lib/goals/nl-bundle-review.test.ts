// @vitest-environment jsdom
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeAll, beforeEach, expect, test, vi} from 'vitest';
import {GoalBundleReview} from './nl-bundle-review';
import {parseGoalBundle} from './nl-bundle';
import {DEFAULT_DISPLAY_LOCALE, setDisplayLocale} from '../visual-format';

// Session AK (6.1): the review card hands only the ticked parts to its caller; the money plan starts unticked.
beforeAll(() => setDisplayLocale(DEFAULT_DISPLAY_LOCALE));
let host: HTMLDivElement, root: Root;
beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const TODAY = '2026-10-31';
const typeInto = async (el: HTMLInputElement, value: string) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value); await act(async () => { el.dispatchEvent(new Event('input', {bubbles: true})); }); };

test('goal and habits ticked, plan not: confirm passes goal and habits only; the amount is the person\'s', async () => {
  const onConfirm = vi.fn(), bundle = parseGoalBundle('save €5,000 for a trip by June and walk 8k steps most days', TODAY)!;
  await act(async () => root.render(createElement(GoalBundleReview, {bundle, today: TODAY, onConfirm, onDismiss: vi.fn()})));
  expect(host.textContent).toContain('Suggested: €625.00 a month for 8 months');
  expect(host.textContent).toContain('When steps ≥ 8,000 → Walk 8,000 steps is done');
  const boxes = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  expect(boxes.map(b => b.checked)).toEqual([true, true, false]);
  await typeInto(host.querySelector<HTMLInputElement>('.nl-bundle-amount input')!, '6000');
  expect(host.textContent).toContain('Suggested: €750.00 a month for 8 months');
  await act(async () => host.querySelector<HTMLButtonElement>('button.primary')!.click());
  expect(onConfirm).toHaveBeenCalledWith({goal: expect.objectContaining({name: 'Trip fund', target: 6000, currency: 'EUR'}), habits: [expect.objectContaining({title: 'Walk 8,000 steps'})]});
});
test('ticking the plan passes it; unticking everything disables Create; a bad amount is said', async () => {
  const onConfirm = vi.fn(), bundle = parseGoalBundle('save €5,000 for a trip by June', TODAY)!;
  await act(async () => root.render(createElement(GoalBundleReview, {bundle, today: TODAY, onConfirm, onDismiss: vi.fn()})));
  const [goalBox, planBox] = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  await act(async () => planBox!.click());
  await act(async () => host.querySelector<HTMLButtonElement>('button.primary')!.click());
  expect(onConfirm).toHaveBeenLastCalledWith(expect.objectContaining({contributionPlan: {perMonth: 625, months: 8, currency: 'EUR', suggested: true}}));
  await typeInto(host.querySelector<HTMLInputElement>('.nl-bundle-amount input')!, 'abc');
  await act(async () => host.querySelector<HTMLButtonElement>('button.primary')!.click());
  expect(host.querySelector('[role="alert"]')!.textContent).toMatch(/number/);
  await act(async () => goalBox!.click());
  expect(host.querySelector<HTMLButtonElement>('button.primary')!.disabled).toBe(true);
  expect(host.querySelector<HTMLButtonElement>('button.primary')!.textContent).toBe('Nothing ticked');
});
