import {expect, test} from 'vitest';
import {navPrefetch} from '../components/nav-prefetch';
import {NAV_ITEMS} from '../components/app-nav';

// Session X Part 5a: only the seven destinations measured no slower without prefetching skip it; everything else keeps
// Next's default (undefined), so a new page prefetches as before unless it is measured.
test('the measured destinations skip prefetching; Today, Health, Staking, Activity and Chess keep the default', () => {
  expect(Object.fromEntries(NAV_ITEMS.map(([href]) => [href, navPrefetch(href)]))).toEqual({
    '/app': undefined, '/app/goals': false, '/app/habits': false, '/app/health': undefined, '/app/wealth': false,
    '/app/markets': false, '/app/staking': undefined, '/app/portfolio': false,
    '/app/ecosystem': false, '/app/chess': undefined, '/app/activity': undefined, '/app/settings': false,
  });
  expect(navPrefetch('/app/settings#privacy')).toBe(false);
  expect(navPrefetch('/app/goals?contribute=1')).toBe(false);
  expect(navPrefetch('/app/goals/123')).toBeUndefined();
  expect(navPrefetch('/app/help')).toBeUndefined();
});
