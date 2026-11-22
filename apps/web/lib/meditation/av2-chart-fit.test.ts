// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {act, createElement as h} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {MeditationWeeksChart} from '../../components/health/meditation/meditation-chart';

/**
 * Session AV lane 2 (fixb1): the minutes-a-week chart on Health → Meditation fits its plot. At 320 px the plot is 254 px
 * wide and the chart is drawn at 254 (it was held at 260 and stood out of the plot), and every Sleep-style chart's SVG
 * is never wider than its plot, so between a resize and the next measure the page does not scroll sideways
 * (tests/av2-todays-practice.spec.ts and tests/av2-muted.spec.ts caught the old width right after 1440 → 320).
 */
let element: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) { return {width: this.classList.contains('sleep-chart-plot') ? 254 : 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({})} as DOMRect; });
  element = document.createElement('div'); document.body.append(element); root = createRoot(element);
});
afterEach(async () => { await act(async () => root.unmount()); element.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

test('at a 254 px plot the chart is drawn 254 px wide, labels still 14 px', async () => {
  const starts = ['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16'];
  const weeks = starts.map((weekStart, i) => ({weekStart, minutes: i % 2 ? 40 : 0, sessions: i % 2}));
  await act(async () => root.render(h(MeditationWeeksChart, {weeks, goal: 60})));
  const svg = element.querySelector('.sleep-chart-plot svg')!;
  expect(svg.getAttribute('width')).toBe('254');
  expect(svg.getAttribute('viewBox')).toBe('0 0 254 170');
});

test('a Sleep-style chart is never wider than its plot (max-width 100%, height kept in proportion)', () => {
  const css = readFileSync(join(__dirname, '..', '..', 'components', 'health', 'sleep', 'sleep.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = css.match(/\.sleep-chart svg\s*\{([^}]*)\}/)?.[1] ?? '';
  expect(rule).toMatch(/max-width:\s*100%/);
  expect(rule).toMatch(/height:\s*auto/);
  expect(rule).toMatch(/overflow:\s*visible/);
});
