// @vitest-environment jsdom
import {expect, test} from 'vitest';
import {keepEarlyEvents, takeEarlyEvent} from './early-events';

test('Session AV (D-WEIGHT): a tap made before its part arrived is taken once, and none is kept after', () => {
  keepEarlyEvents(window, ['zigoals:test-open']);
  expect(takeEarlyEvent('zigoals:test-never')).toBeUndefined();
  window.dispatchEvent(new CustomEvent('zigoals:test-open', {detail: {preset: 'rain'}}));
  const kept = takeEarlyEvent('zigoals:test-open') as CustomEvent<{preset: string}>;
  expect(kept.detail.preset).toBe('rain');
  expect(takeEarlyEvent('zigoals:test-open')).toBeUndefined();
  window.dispatchEvent(new Event('zigoals:test-open'));
  expect(takeEarlyEvent('zigoals:test-open')).toBeUndefined();
});
