import {expect, test} from 'vitest';
import {isHabitDayAction, standsAlone} from './activity-zigi';

test('DV-115: a removed habit check-in from a Today card leaves "Actions by ZIGi"', () => {
  const tick = {kind: 'checklist-tick', activityId: 'habit:ae34:2026-11-09', title: 'Check-in: Floss'};
  expect(isHabitDayAction(tick)).toBe(true);
  expect(standsAlone(tick, new Set())).toBe(false);
  expect(isHabitDayAction({kind: 'check-in', activityId: 'habit:a:2026-11-09'})).toBe(true);
  // A card whose record has no row of its own (water, a reminder) still gets its line; one with a row does not.
  expect(standsAlone({kind: 'log-water', activityId: 'water:1'}, new Set())).toBe(true);
  expect(standsAlone({kind: 'log-water', activityId: 'water:1'}, new Set(['water:1']))).toBe(false);
  expect(standsAlone({kind: 'checklist-tick', activityId: 'checklist:water:2026-11-09'}, new Set())).toBe(true);
  expect(standsAlone({kind: 'log-food', activityId: 'diary:1', via: 'quick-add'}, new Set())).toBe(false);
});
