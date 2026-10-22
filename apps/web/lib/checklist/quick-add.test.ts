import {describe, expect, test} from 'vitest';
import {visualTone} from '../../components/visual-tone';
import {createHabit, emptyHabitData, logHabitValue} from '../habits';
import {habitIdForTone, untouchedHabit} from './quick-add';

describe('the Checklist\'s quick add (Session AG Polish 2, ADR-031 K11)', () => {
  test('a chosen colour is the habit card\'s own tone, drawn from a real UUID', () => {
    for (const tone of [0, 1, 2, 3, 4]) { const id = habitIdForTone(tone); expect(visualTone(id)).toBe(tone); expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); }
    expect(habitIdForTone(null)).toMatch(/^[0-9a-f-]{36}$/);
  });
  test('a fresh habit is untouched; a check-in or an edit makes it changed (owner amendment 3)', () => {
    const at = new Date('2026-10-22T10:00:00Z'), id = habitIdForTone(null);
    const data = createHabit(emptyHabitData(), {title: 'Fictional quick', category: 'Checklist', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}}, at, id);
    const fresh = data.habits[0]!;
    expect(untouchedHabit(fresh)).toBe(true);
    const ticked = logHabitValue(data, id, fresh.startDate, 1).habits[0]!;
    expect(untouchedHabit(ticked)).toBe(false);
    expect(untouchedHabit({...fresh, updatedAt: '2026-10-22T10:05:00.000Z'})).toBe(false);
  });
});
