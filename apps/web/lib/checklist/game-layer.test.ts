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

describe('Checklist XP, badges and celebrations', () => {
  test('15 XP for each day with every dot lit, 5 more for a Perfect orbit; partial and empty days earn nothing', () => {
    expect(XP_RULES.checklistDay).toBe(15); expect(XP_RULES.checklistPerfect).toBe(5);
    const s = stores(days({'2026-10-15': [4, 4], '2026-10-16': [4, 3], '2026-10-17': [5, 5, true], '2026-10-14': [0, 0]}));
    expect(xpEvents(s, TODAY).map(e => [e.id, e.xp, e.kind])).toEqual([['checklist:2026-10-15', 15, 'checklist'], ['checklist:2026-10-17', 15, 'checklist'], ['checklist-perfect:2026-10-17', 5, 'checklist']]);
    expect(xpSummary(s, TODAY)).toMatchObject({total: 35, byKind: {checklist: 35, habit: 0}});
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
