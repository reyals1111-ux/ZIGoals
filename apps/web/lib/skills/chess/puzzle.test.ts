import {describe, expect, it} from 'vitest';
import {applyPuzzleCheckIn, puzzleCheckIn} from './puzzle';
import {appliedOn, markApplied, setChessHabit} from './engine';
import {dashboardSettingsSchema, emptyDashboardSettings} from '../../dashboard-settings';
import {createHabit, emptyHabitData, habitDay} from '../../habits';

// Session AK (lane C): the daily puzzle solved on the Chess page ticks the chess habit once a day, sharing the day marker
// with a finished game, as engine.ts's chessCheckIn does.
const HABIT = '59a35604-3696-4a78-b455-000000000031', NOW = new Date('2026-10-31T15:00:00.000Z');
function setUp() {
  const habits = createHabit({...emptyHabitData(), timeZone: 'UTC'}, {title: 'Chess every day', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 1}, new Date('2026-10-01T09:00:00.000Z'), HABIT);
  const settings = setChessHabit(dashboardSettingsSchema.parse(emptyDashboardSettings()), HABIT, '2026-10-01T09:00:00.000Z');
  return {habits, settings};
}
describe('the daily puzzle ticks the chess habit', () => {
  it('once a day, while due; the day marker then stops a second tick', () => {
    const {habits, settings} = setUp();
    const item = puzzleCheckIn(habits, settings, NOW);
    expect(item).toEqual({habitId: HABIT, day: '2026-10-31'});
    const next = applyPuzzleCheckIn(habits, item!, NOW);
    expect(habitDay(next.habits[0]!, '2026-10-31', '2026-10-31').status).not.toBe('due');
    expect(puzzleCheckIn(next, settings, NOW)).toBeNull(); // no longer due
    const marked = markApplied(settings, '2026-10-31', NOW.toISOString());
    expect(appliedOn(marked, '2026-10-31')).toBeTruthy();
    expect(puzzleCheckIn(habits, marked, NOW)).toBeNull(); // a game (or an undo) already used the day
  });
  it('nothing without a chess habit', () => {
    const {habits} = setUp();
    expect(puzzleCheckIn(habits, dashboardSettingsSchema.parse(emptyDashboardSettings()), NOW)).toBeNull();
  });
});
