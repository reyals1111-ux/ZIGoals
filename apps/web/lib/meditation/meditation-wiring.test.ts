import {describe, expect, test} from 'vitest';
import {createEmptyHealth, healthSchema, HEALTH_STORAGE_KEY, type HealthData} from '../health';
import {buildShowcase} from '../showcase-data';
import {healthGroupIn, withHealthGroup} from '../vault/w-homes';
import {widgetMetric, widgetMetricLabel, type DashboardSources} from '../dashboard-metrics';
import type {DashboardWidget} from '../dashboard-settings';
import {emptyPlatform} from '../positions';
import {emptyHabitData} from '../habits';
import {measureSource, measureValue, ruleMet, formatMeasureValue} from '../habit-health-links/engine';
import type {HabitHealthLinkV4} from '../habit-health-links/schema';
import {knockLines} from '../ai/knock/rules';
import {emptyMeditation, type Meditation} from './schema';
import {saveManual, setMeditationGoal} from './engine';
import {showcaseMeditation} from './showcase';

// Session W Part 5: Meditation where the rest of the app reads it. Everything here is fictional.
const BXL = 'Europe/Brussels';
const log = (entries: [date: string, time: string, minutes: number][], zone = BXL): Meditation => entries.reduce((m, [date, time, minutes]) => saveManual(m, {date, time, minutes, timeZone: zone}, new Date('2026-12-01T00:00:00Z')), emptyMeditation());
const health = (m: Meditation): HealthData => withHealthGroup(createEmptyHealth(), 'meditation', m, false);
const link = (patch: Partial<HabitHealthLinkV4> = {}): HabitHealthLinkV4 => ({version: 1, measure: 'meditationMinutes', rule: 'at-least', target: 10, updatedAt: '2026-10-01T00:00:00.000Z', ...patch});

describe('habit links: mindful minutes on the Health day', () => {
  test('the sessions that began on the day add up; another day or no session is null', () => {
    const h = health(log([['2026-10-21', '07:00', 6], ['2026-10-21', '21:30', 5], ['2026-10-22', '07:00', 20]]));
    expect(measureValue(h, '2026-10-21', link())).toBe(11);
    expect(measureValue(h, '2026-10-23', link())).toBeNull();
    expect(measureValue(createEmptyHealth(), '2026-10-21', link())).toBeNull();
    expect(ruleMet(link({target: 10}), 11)).toBe(true);
    expect(ruleMet(link({target: 12}), 11)).toBe(false);
    expect(ruleMet(link({rule: 'recorded', target: undefined}), 11)).toBe(true);
  });
  test('a session counts on the day it began where it was lived', () => {
    // 23:30 in Tokyo on the 21st is 14:30 UTC: still the 21st there.
    const h = health(log([['2026-10-21', '23:30', 15]], 'Asia/Tokyo'));
    expect(measureValue(h, '2026-10-21', link())).toBe(15);
  });
  test('the badge words', () => {
    expect(measureSource({measure: 'meditationMinutes'})).toBe('your meditation log');
    expect(formatMeasureValue('meditationMinutes', 12)).toBe('12 min');
    expect(formatMeasureValue('meditationMinutes', 75)).toBe('1 h 15 min');
  });
});

describe('the Today widget (Health → Meditation)', () => {
  const sources = (m?: Meditation): DashboardSources => ({platform: emptyPlatform(), habits: emptyHabitData(), health: m ? health(m) : createEmptyHealth(), goals: [], quotes: [], now: Date.parse('2026-10-21T12:00:00Z'), today: '2026-10-21', healthDate: '2026-10-21'});
  const widget = (metric: string): DashboardWidget => ({id: 'w-med', kind: 'meditation', metric, title: '', size: 'compact', hidden: false, revision: 1});
  test('no session is never zero', () => {
    expect(widgetMetric(widget('today'), sources())).toMatchObject({title: 'Meditation', value: 'No session today', href: '/app/health?view=meditation'});
    expect(widgetMetric(widget('week'), sources(emptyMeditation()))).toMatchObject({value: 'No sessions yet'});
  });
  test('today and this week (Monday to Sunday), with your goal', () => {
    const m = setMeditationGoal(log([['2026-10-19', '07:00', 10], ['2026-10-21', '07:00', 15], ['2026-10-18', '07:00', 30]]), 60, new Date('2026-10-01T00:00:00Z'));
    expect(widgetMetric(widget('today'), sources(m))).toMatchObject({value: '15 min today', detail: '2026-10-21'});
    expect(widgetMetric(widget('week'), sources(m))).toMatchObject({value: '25 min this week', detail: 'Your goal: 1 h 00 min a week · Monday to Sunday'});
  });
  test('its choices are named for what they show, not for the habit widget\'s "today"', () => {
    expect(widgetMetricLabel('today', 'meditation')).toBe('Mindful minutes today');
    expect(widgetMetricLabel('week', 'meditation')).toBe('This week (Monday to Sunday)');
    expect(widgetMetricLabel('today', 'habit')).toBe('Habit today');
    expect(widgetMetricLabel('week')).toBe('Last 7 days');
  });
});

describe('the knock and the Showcase', () => {
  test('ZIGi\'s knock for the meditation time', () => {
    expect(knockLines({kind: 'meditation-time', id: 'meditation-time', title: 'Time to meditate', time: '07:30', day: '2026-10-21', href: '/app/health?view=meditation'} as Parameters<typeof knockLines>[0])).toEqual({title: 'Time to meditate', line: 'Your meditation time · 07:30', action: 'Open Meditation'});
  });
  test('the Showcase Health holds the fictional sessions next to the nights (v4)', () => {
    const day = '2026-10-05', h = healthSchema.parse(JSON.parse(buildShowcase(day).records[HEALTH_STORAGE_KEY]!));
    expect(h.schemaVersion).toBe(4);
    expect(healthGroupIn(h, 'meditation')).toEqual(showcaseMeditation(day));
    expect(healthGroupIn(h, 'sleep')?.nights.length).toBeGreaterThan(20);
  });
});
