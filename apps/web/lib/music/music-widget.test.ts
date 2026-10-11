import {expect, test} from 'vitest';
import {widgetMetric, type DashboardSources} from '../dashboard-metrics';
import {dashboardSettingsSchema, emptyDashboardSettings, isV3WidgetKind, saveWidget, type DashboardWidget} from '../dashboard-settings';
import {WIDGET_DESCRIPTIONS, WIDGET_GROUPS} from '../dashboard-widget-registry';
import {emptyHabitData} from '../habits';
import {createEmptyHealth} from '../health';
import {emptyPlatform} from '../positions';
import {AVAILABLE_BUTTONS, defaultView, isShown, todayItemShown, viewOf} from '../pages/visibility';
import {stepSound} from '../audio/ambient';
import {AMBIENT_SOUNDS} from './schema';

// Session W Part 20: the music player's Today widget, its switch and the panel's previous/next over the focus sounds.
const today = '2026-10-07';
const sources = (): DashboardSources => ({platform: emptyPlatform(), habits: emptyHabitData(), health: createEmptyHealth(), goals: [], quotes: [], now: Date.parse(`${today}T12:00:00Z`), today, healthDate: today});
const widget: DashboardWidget = {id: 'music-1', kind: 'music', metric: 'player', title: '', size: 'compact', hidden: false, revision: 1};

test('"Your soundtrack" is a widget in its own category; it asks no service and points to Settings → Music', () => {
  expect(WIDGET_GROUPS.find(g => g.id === 'music')).toEqual({id: 'music', label: 'Music', icon: 'music', kinds: ['music']});
  expect(WIDGET_DESCRIPTIONS.music).toBe('Your soundtrack: ambient sounds or your music app');
  expect(widgetMetric(widget, sources())).toEqual({title: 'Your soundtrack', value: 'Your soundtrack', detail: 'Focus sounds made on this device, or Spotify, from the music player.', href: '/app/settings#music'});
  expect(widgetMetric({...widget, title: 'Focus'}, sources()).title).toBe('Focus');
  // Only settings v3 holds it: saving it raises the record.
  expect(isV3WidgetKind('music')).toBe(true);
  const saved = dashboardSettingsSchema.parse(saveWidget(emptyDashboardSettings(), widget));
  expect(saved.schemaVersion).toBe(3);
  expect(saved.widgets.at(-1)).toMatchObject({kind: 'music', metric: 'player'});
});

test('the music player exists now: its switch is offered, hidden by default for existing people, shown in the Showcase, and its widget follows it', () => {
  expect(AVAILABLE_BUTTONS).toContain('music');
  expect(isShown(viewOf(undefined), 'music')).toBe(false);
  expect(isShown(defaultView(true), 'music')).toBe(true);
  expect(todayItemShown(viewOf(undefined), {widgetDomain: 'music'})).toBe(false);
  expect(todayItemShown(defaultView(true), {widgetDomain: 'music'})).toBe(true);
});

test('previous and next step through the six focus sounds in order, wrapping at both ends', () => {
  expect(AMBIENT_SOUNDS.map(s => stepSound(s, 1))).toEqual(['pink', 'brown', 'rain', 'ocean', 'drone', 'white']);
  expect(AMBIENT_SOUNDS.map(s => stepSound(s, -1))).toEqual(['drone', 'white', 'pink', 'brown', 'rain', 'ocean']);
});
