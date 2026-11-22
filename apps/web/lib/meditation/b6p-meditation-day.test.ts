import {afterEach, describe, expect, test} from 'vitest';
import {createEmptyHealth, type HealthData} from '../health';
import {dailyData, saveHealthPreferences} from '../health-daily';
import {withHealthGroup} from '../vault/w-homes';
import {createHabit, emptyHabitData, saveHabitTimezone, type HabitInput} from '../habits';
import {autoCompletions} from '../habit-health-links/engine';
import type {HabitHealthLinkV4} from '../habit-health-links/schema';
import {widgetMetric, type DashboardSources} from '../dashboard-metrics';
import type {DashboardWidget} from '../dashboard-settings';
import {emptyPlatform} from '../positions';
import {deriveDots} from '../checklist/derive';
import {fullPath, sources} from '../checklist/test-fixtures';
import {emptyDayEnds, setCurrentDayEnds} from '../day-boundary-core';
import {emptyMeditation} from './schema';
import {saveManual} from './engine';
import {meditationDayAt} from './stats';

/**
 * Review B6P-2 (Session AV lane 2, r6-body; LEDGER #411): every reader of the meditation figures asks for the meditation
 * day ("My day ends at"), as the Meditation view does. With the day ending at 03:00, a session at 01:00 on 22 November
 * counts on the 21st: in a linked habit's tick, in Today's "Mindful minutes today" and on the Checklist.
 */
const AMS = 'Europe/Amsterdam', NOW = new Date('2026-11-22T00:30:00.000Z'); // 01:30 in Amsterdam
const sat = saveManual(emptyMeditation(), {date: '2026-11-22', time: '01:00', minutes: 20, timeZone: AMS}, NOW);
const health = (): HealthData => withHealthGroup(saveHealthPreferences(createEmptyHealth(), {...dailyData(createEmptyHealth()).preferences, timezone: AMS}), 'meditation', sat, false);
const HABIT = '92000000-0000-4000-8000-0000000000b6';
const INPUT: HabitInput = {title: 'Meditate', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
const link: HabitHealthLinkV4 = {version: 1, measure: 'meditationMinutes', rule: 'at-least', target: 10, updatedAt: '2026-11-01T00:00:00.000Z'};
const widget: DashboardWidget = {id: 'w-med', kind: 'meditation', metric: 'today', title: '', size: 'compact', hidden: false, revision: 1};
const dash = (): DashboardSources => ({platform: emptyPlatform(), habits: emptyHabitData(), health: health(), goals: [], quotes: [], now: NOW.getTime(), today: '2026-11-22', healthDate: '2026-11-22'});
afterEach(() => { setCurrentDayEnds(emptyDayEnds()); });

describe('B6P-2: the meditation day everywhere', () => {
  test('the day ends at 03:00: the habit link ticks the 21st, Today and the Checklist count the session on the 21st', () => {
    setCurrentDayEnds({version: 1, endsAt: 180});
    expect(meditationDayAt('2026-11-22', NOW, AMS)).toBe('2026-11-21');
    const habits = saveHabitTimezone(createHabit(emptyHabitData(), INPUT, new Date('2026-11-01T08:00:00.000Z'), HABIT), AMS);
    expect(autoCompletions({links: {version: 1, links: {[HABIT]: link}, applied: []}, habits, health: health(), now: NOW})).toEqual([{habitId: HABIT, date: '2026-11-21', healthDate: '2026-11-21', measure: 'meditationMinutes', value: 20}]);
    expect(widgetMetric(widget, dash())).toMatchObject({value: '20 min today', detail: '2026-11-21'});
    const dot = deriveDots(fullPath(), {date: '2026-11-21', ticks: [], custom: [], nudged: []}, '2026-11-21', sources({meditation: sat, health: health(), healthDay: '2026-11-22', now: NOW, zone: AMS})).find(d => d.label === 'Meditate');
    expect(dot).toMatchObject({state: 'done', note: '20 min today'});
  });
  test('the day ends at midnight (the default): the calendar day, exactly as before', () => {
    expect(meditationDayAt('2026-11-22', NOW, AMS)).toBe('2026-11-22');
    const habits = saveHabitTimezone(createHabit(emptyHabitData(), INPUT, new Date('2026-11-01T08:00:00.000Z'), HABIT), AMS);
    expect(autoCompletions({links: {version: 1, links: {[HABIT]: link}, applied: []}, habits, health: health(), now: NOW})).toEqual([{habitId: HABIT, date: '2026-11-22', healthDate: '2026-11-22', measure: 'meditationMinutes', value: 20}]);
    expect(widgetMetric(widget, dash())).toMatchObject({value: '20 min today', detail: '2026-11-22'});
    const dot = deriveDots(fullPath(), {date: '2026-11-22', ticks: [], custom: [], nudged: []}, '2026-11-22', sources({meditation: sat, health: health(), healthDay: '2026-11-22', now: NOW, zone: AMS})).find(d => d.label === 'Meditate');
    expect(dot).toMatchObject({state: 'done', note: '20 min today'});
  });
});
