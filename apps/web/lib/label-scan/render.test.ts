// @vitest-environment jsdom
import {afterEach, expect, test} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import LabelScan from '../../components/health/label-scan';
import {NO_AI_PHOTO} from '../../components/health/meal-photo-panel';
import DietTemplates from '../../components/health/diet-templates';
import {NutriScoreSetting} from '../../components/health/nutri-score';
import {createEmptyHealth} from '../health';
import {FOOD_DISPLAY_KEY} from '../food-display/schema';

// Session AK (items 3, 15, 20): the new Health surfaces, rendered once each. No AI, network or model is used.
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null, host: HTMLDivElement | null = null;
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; localStorage.clear(); });
const render = (el: ReturnType<typeof createElement>) => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); act(() => root!.render(el)); return host; };

test('with no AI connected, the label reader says so in the meal photo’s own words and sends nothing', () => {
  const h = render(createElement(LabelScan, {target: 'food-form', onDraft: () => { throw Error('no draft without an AI'); }}));
  expect(h.textContent).toContain(NO_AI_PHOTO);
  expect(h.querySelector('input[type=file]')).toBeNull();
  expect(h.querySelector('a')?.getAttribute('href')).toBe('/app/settings');
});

test('the template fold reviews 7 days of 4 meals before anything is written', () => {
  const h = render(createElement(DietTemplates, {data: createEmptyHealth(), anyDay: '2026-11-04', perform: async () => { throw Error('nothing is written on review'); }}));
  expect(h.querySelectorAll('.diet-templates-days > li')).toHaveLength(7);
  expect(h.querySelectorAll('.diet-templates-days ul > li')).toHaveLength(28);
  expect(h.textContent).toMatch(/Greek yogurt with walnuts and honey/);
  const veg = h.querySelector<HTMLInputElement>('input[value=vegetarian]')!;
  act(() => veg.click());
  expect(h.textContent).toMatch(/Oats with milk and banana/); expect(h.textContent).not.toMatch(/Salmon/);
});

test('the food quality letter is off by default and turns on with one button', async () => {
  const h = render(createElement(NutriScoreSetting));
  await act(async () => { await Promise.resolve(); }); // the record is read after mount
  const button = h.querySelector('button')!;
  expect(button.getAttribute('aria-pressed')).toBe('false'); expect(button.textContent).toBe('Show food quality letters');
  act(() => button.click());
  expect(JSON.parse(localStorage.getItem(FOOD_DISPLAY_KEY)!)).toEqual({version: 1, nutriScore: true});
  expect(h.querySelector('button')!.getAttribute('aria-pressed')).toBe('true');
});
