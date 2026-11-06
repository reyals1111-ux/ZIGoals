import {expect, test} from 'vitest';
import {AUTO_DESTINATIONS_ID, applyDashboardPreset, emptyDashboardSettings, presetSettings, reconcileDashboardPlacement, withDestinationsOnceGoals} from './dashboard-settings';

// Session AL (NB-166, P-NB-53): once a goal exists, "Your destinations" shows on Today by default.
const goalsShown = (s: ReturnType<typeof emptyDashboardSettings>) => s.widgets.filter(w => w.kind === 'goals' && !w.hidden);
test('NB-166: a Habits + Health Today with a goal shows the goals overview; with no goal, nothing changes', () => {
  const start = {...presetSettings('habits-health'), onboarded: true};
  expect(goalsShown(start)).toHaveLength(0);
  expect(withDestinationsOnceGoals(start, 0)).toBe(start);
  const shown = withDestinationsOnceGoals(start, 2);
  expect(goalsShown(shown).map(w => w.id)).toEqual([AUTO_DESTINATIONS_ID]);
  expect(reconcileDashboardPlacement(shown).main).toContainEqual({kind: 'widget', id: AUTO_DESTINATIONS_ID});
  // The money cards stay as the original default had them (hidden: no Wealth on this Today).
  expect(reconcileDashboardPlacement(shown).hiddenBuiltins).toEqual(expect.arrayContaining(['wallet', 'staking']));
  // Display only: the original record is unchanged.
  expect(goalsShown(start)).toHaveLength(0);
});
test('NB-166: the Balanced default already shows it; an arranged Today keeps its own choice', () => {
  const balanced = emptyDashboardSettings();
  expect(withDestinationsOnceGoals(balanced, 3)).toBe(balanced);
  const arranged = applyDashboardPreset(balanced, 'habits-health'); // a saved placement, the goals overview kept hidden
  expect(arranged.placement).toBeDefined();
  expect(withDestinationsOnceGoals(arranged, 3)).toBe(arranged);
});
test('a Health-only Today with a hidden goals overview shows that same widget, not a second one', () => {
  const s = {...presetSettings('health'), onboarded: true};
  const withHidden = {...s, widgets: [...s.widgets, {id: 'g-1', kind: 'goals' as const, metric: 'overview', title: '', size: 'compact' as const, hidden: true, revision: 1}]};
  const shown = withDestinationsOnceGoals(withHidden, 1);
  expect(goalsShown(shown).map(w => w.id)).toEqual(['g-1']);
  expect(shown.widgets.filter(w => w.kind === 'goals')).toHaveLength(1);
});
