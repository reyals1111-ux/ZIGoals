import {describe, expect, test} from 'vitest';
import {emptyHabitData} from '../habits';
import {createEmptyHealth} from '../health';
import {XP_RULES, checklistOrbitDays, xpEvents, xpSummary, type GameStores} from '../game/xp';
import {BADGES, badges} from '../game/badges';
import {celebrationId, checklistCelebrations, pendingCelebrations} from '../game/celebrate';
import type {ChecklistDays} from './schema';

// Session AF (L3; P7.7, P7.13): the Checklist in the game layer — derived from its day history, nothing stored.
const TODAY = '2026-10-18';
const days = (map: Record<string, [number, number, boolean?]>): ChecklistDays => ({version: 1, days: Object.fromEntries(Object.entries(map).map(([d, [total, done, perfect]]) => [d, {total, done, ...(perfect ? {perfect} : {})}]))});
const stores = (checklist: ChecklistDays | null, checklistToday: GameStores['checklistToday'] = null): GameStores => ({habits: emptyHabitData(), health: createEmptyHealth(), checklist, checklistToday});

describe('the Checklist in the game layer: badges and celebrations (no XP since Session AG)', () => {
  // Session AG (owner Part 6; ADR-029 I4): removed with the feature, at equal strength — the Checklist earns no XP: no day,
  // full or Perfect, adds an event or a point, while its badges below still read the same days.
  test('no XP for any Checklist day — full, Perfect, partial or empty (Session AG)', () => {
    expect(Object.keys(XP_RULES).filter(k => /checklist/i.test(k))).toEqual([]);
    const s = stores(days({'2026-10-15': [4, 4], '2026-10-16': [4, 3], '2026-10-17': [5, 5, true], '2026-10-14': [0, 0]}), {date: TODAY, total: 3, done: 3, perfect: true});
    expect(xpEvents(s, TODAY)).toEqual([]);
    expect(xpSummary(s, TODAY)).toMatchObject({total: 0, today: 0, byKind: {checklist: 0, habit: 0}});
    expect(checklistOrbitDays(s, TODAY).map(o => o.day), 'the days still count for the badges').toEqual(['2026-10-15', '2026-10-17', TODAY]);
  });
  test('today counts once every dot is lit (from the Checklist’s own summary); a store without the history earns nothing', () => {
    expect(checklistOrbitDays(stores(null, {date: TODAY, total: 3, done: 3}), TODAY)).toEqual([{day: TODAY, perfect: false}]);
    expect(checklistOrbitDays(stores(null, {date: TODAY, total: 3, done: 2}), TODAY)).toEqual([]);
    expect(xpEvents({habits: emptyHabitData(), health: createEmptyHealth()}, TODAY)).toEqual([]);
  });
  test('three badges: First orbit, Seven orbits, Perfect orbit; warm words only', () => {
    expect(BADGES.filter(b => ['first-orbit', 'seven-orbits', 'perfect-orbit'].includes(b.id)).map(b => b.title)).toEqual(['First orbit', 'Seven orbits', 'Perfect orbit']);
    const one = badges(stores(days({'2026-10-17': [3, 3]})), TODAY);
    expect(one.filter(b => b.id.includes('orbit')).map(b => [b.id, b.earned])).toEqual([['first-orbit', true], ['seven-orbits', false], ['perfect-orbit', false]]);
    const week = Object.fromEntries(Array.from({length: 7}, (_, i) => [`2026-10-${String(10 + i).padStart(2, '0')}`, [2, 2, i === 3] as [number, number, boolean]]));
    expect(badges(stores(days(week)), TODAY).filter(b => b.id.includes('orbit')).every(b => b.earned)).toBe(true);
    expect(BADGES.every(x => !/fail|lost|lazy|should|guilt|punish/i.test(`${x.title} ${x.blurb}`))).toBe(true);
  });
  test('celebrations: every dot lit, then a Perfect orbit, once each per day; only with the game layer on', () => {
    const s = stores(null, {date: TODAY, total: 4, done: 4, perfect: true});
    expect(checklistCelebrations(s, TODAY, {}).map(c => [c.id, c.kind, c.title])).toEqual([[celebrationId.checklist('all', TODAY), 'checklist', 'All dots lit'], ['checklist:perfect:2026-10-18', 'checklist', 'Perfect orbit']]);
    expect(checklistCelebrations(s, TODAY, {[celebrationId.checklist('all', TODAY)]: TODAY, [celebrationId.checklist('perfect', TODAY)]: TODAY})).toEqual([]);
    expect(checklistCelebrations(stores(null, {date: TODAY, total: 4, done: 3}), TODAY, {})).toEqual([]);
    expect(pendingCelebrations(s, {version: 1, enabled: false}, {}, TODAY)).toEqual([]);
    const on = pendingCelebrations(s, {version: 1, enabled: true, levelSeen: 1}, {}, TODAY);
    expect(on.filter(c => c.kind === 'checklist')).toHaveLength(2);
  });
});
