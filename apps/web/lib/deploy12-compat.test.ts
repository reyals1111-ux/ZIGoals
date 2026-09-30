/**
 * Rollback guard (UI design pass, Part 10). Alpha deploy #12 (source 5dd2ee7) reads Health and Today settings with
 * strict schemas. These lists are frozen copies of what that build accepts. A person who never uses the quick
 * counters or the new widget kinds must keep writing data that deploy #12 can read; only those two features may
 * write anything outside these lists. See docs/STATUS.md, "Compatibility and rollback".
 */
import {expect,test} from 'vitest';
import {createEmptyHealth,healthSchema} from './health';
import {addWater,editWater,removeWater,saveHealthPreferences,saveGroceryNotes,dailyData} from './health-daily';
import {changeCount,countOn,DEFAULT_COUNTERS,exerciseData} from './health-counters';
import {presetSettings,saveWidget,moveDashboardItem,moveWidget,removeWidget,resetDashboardPlacement,reconcileDashboardPlacement,dashboardSettingsSchema,WIDGET_CATALOG,type DashboardSettings} from './dashboard-settings';

const DEPLOY12_HEALTH_KEYS = ['schemaVersion', 'kind', 'measurements', 'targets', 'daily', 'foods', 'recipes', 'diary', 'weights', 'activity'];
const DEPLOY12_WIDGET_METRICS: Record<string, readonly string[]> = {
  goals: ['overview'], goal: ['progress', 'next-contribution'], habits: ['overview'], habit: ['today', 'streak'],
  'food-entry': ['kcal', 'macros'], meal: ['kcal', 'macros'], health: ['kcal', 'macros', 'water', 'weight', 'steps', 'activity', 'history'],
  wealth: ['USD', 'EUR', 'history-USD', 'history-EUR'], asset: ['quantity', 'value', 'available'], staking: ['quantity'],
  allocation: ['allocation'], ecosystem: ['directory'],
};
const at = '2026-09-30T08:00:00.000Z', day = '2026-09-30';
const readableByDeploy12 = (s: DashboardSettings) => s.widgets.every(w => DEPLOY12_WIDGET_METRICS[w.kind]?.includes(w.metric));

test('Health written without the quick counters keeps exactly the deploy #12 fields', () => {
  let h = createEmptyHealth();
  h = addWater(h, {id: 'health_water-00000001', date: day, amountMilli: 250000, unit: 'ml'}, at);
  h = editWater(h, 'health_water-00000001', {date: day, amountMilli: 300000, unit: 'ml'}, at);
  h = saveHealthPreferences(h, {...dailyData(h).preferences});
  h = saveGroceryNotes(h, 'Fictional note');
  h = removeWater(h, 'health_water-00000001');
  // Showing the counter row reads defaults; reading never writes.
  const before = JSON.stringify(h);
  expect(exerciseData(h).counters).toHaveLength(DEFAULT_COUNTERS.length);
  expect(countOn(h, DEFAULT_COUNTERS[0]!.id, day)).toBeNull();
  expect(JSON.stringify(h)).toBe(before);
  const written = JSON.parse(JSON.stringify(healthSchema.parse(h))) as Record<string, unknown>;
  expect(Object.keys(written).every(k => DEPLOY12_HEALTH_KEYS.includes(k))).toBe(true);
});

test('only a counter change adds the exercise group, the one field deploy #12 cannot read', () => {
  const tapped = JSON.parse(JSON.stringify(changeCount(createEmptyHealth(), DEFAULT_COUNTERS[0]!.id, day, 1))) as Record<string, unknown>;
  expect(Object.keys(tapped).filter(k => !DEPLOY12_HEALTH_KEYS.includes(k))).toEqual(['exercise']);
});

test('Today settings without the new widget kinds stay readable by deploy #12, through presets, pins, moves and resets', () => {
  for (const preset of ['balanced', 'wealth', 'habits-health', 'health'] as const) {
    let s = presetSettings(preset);
    expect(readableByDeploy12(s), preset).toBe(true);
    s = saveWidget(s, {id: 'pin-1', kind: 'habit', entity: 'habit-1', metric: 'today', title: '', size: 'compact', hidden: false, revision: 1});
    const p = reconcileDashboardPlacement(s);
    s = moveDashboardItem(s, p.main.at(-1)!, {region: 'main', anchor: p.main[0]!, position: 'before'});
    s = moveWidget(s, 'pin-1', 1);
    s = resetDashboardPlacement(s);
    s = removeWidget(s, 'pin-1');
    expect(readableByDeploy12(dashboardSettingsSchema.parse(s)), preset).toBe(true);
  }
});

test('the only catalog entries deploy #12 cannot read are the new kinds and the macros ring', () => {
  const unreadable = Object.entries(WIDGET_CATALOG).flatMap(([kind, entry]) => entry.metrics.filter(m => !DEPLOY12_WIDGET_METRICS[kind]?.includes(m)).map(m => `${kind}:${m}`));
  expect(unreadable.sort()).toEqual(['checkins:week', 'exercise:counts', 'health:macros-ring', 'holding-share:top', 'milestone:next', 'streak:best']);
});
