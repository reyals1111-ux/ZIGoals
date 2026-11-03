import {describe, expect, test} from 'vitest';
import {GOAL_LIBRARY, LIBRARY_AREAS} from './goal-library';
import {BUILD_LIST_2_TEMPLATES, MORE_TEMPLATES, SAVINGS_CHALLENGE_TEMPLATES} from './goal-library-more';

// Session AK (F5a, items 2 and 5): the added templates join the library in life-area order; the extension point is open.
describe('more templates and the BUILD list 2 extension point', () => {
  test('every added template is in the library once, with an id goal extras accepts', () => {
    const added = [...SAVINGS_CHALLENGE_TEMPLATES, ...MORE_TEMPLATES, ...BUILD_LIST_2_TEMPLATES];
    for (const t of added) { expect(GOAL_LIBRARY.filter(x => x.id === t.id)).toHaveLength(1); expect(t.id).toMatch(/^[a-z0-9-]{1,60}$/); }
    expect(GOAL_LIBRARY.length).toBe(43 + added.length);
  });
  test('the library stays grouped by life area, in the areas\' order', () => {
    const order = GOAL_LIBRARY.map(t => LIBRARY_AREAS.indexOf(t.area));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(GOAL_LIBRARY[0]!.id).toBe('run-10k');
  });
});
