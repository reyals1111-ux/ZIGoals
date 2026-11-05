// @vitest-environment jsdom
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, test, vi} from 'vitest';
import {buildShowcase} from './showcase-data';
import {PLATFORM_KEY, type Platform} from './positions';
import {privateGoalSummary} from './goal-summary';
import {GoalSummaryCard} from '../components/goal-card';

/** Session AL sweep 2 (D-211, P-DVR-29): the goal card's art box shows the shared skeleton while its scene loads. */
vi.mock('next/navigation', () => ({useSearchParams: () => new URLSearchParams(), usePathname: () => '/app/goals', useRouter: () => ({replace: () => {}, push: () => {}})}));
vi.mock('../components/showcase-controls', () => ({useShowcase: () => false}));

test('the scene is a lazy chunk: before it arrives the box holds a hidden skeleton, never an empty block', () => {
  const now = Date.parse('2026-09-21T12:00:00Z'), data = JSON.parse(buildShowcase('2026-09-21', 'UTC').records[PLATFORM_KEY]!) as Platform;
  const summary = privateGoalSummary(data, data.goals.find(g => g.id === '9201')!, [], now);
  const box = document.createElement('div');
  box.innerHTML = renderToStaticMarkup(createElement(GoalSummaryCard, {summary}));
  const skeleton = box.querySelector('.goal-card-art > .goal-card-art-skeleton');
  expect(skeleton?.tagName).toBe('DIV'); // the box hides its direct <span> children
  expect(skeleton?.classList.contains('aa-skeleton')).toBe(true);
  expect(skeleton?.getAttribute('aria-hidden')).toBe('true');
  expect(box.querySelector('.goal-card-art svg.scene-art')).toBeNull();
});
