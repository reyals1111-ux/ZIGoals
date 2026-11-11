import {describe, expect, it} from 'vitest';
import {daysUntil, gentleCard, GENTLE_MAX_CALM, GENTLE_MAX_FULL} from './proactive';
import {emptyStage, gentleShown, noteGentle, proactiveOn} from './record';

/** Session AM (ADR-038 A5): the gentle cards' rules. */
const open = {calm: false, shown: [] as string[], gate: () => true, available: () => true};
const quiet = {hour: 14, tasksDue: 0, habitsLeft: 0, billInDays: null};
describe('gentle cards (opt-in, off by default)', () => {
  it('are off unless the person turned them on', () => { expect(proactiveOn(emptyStage())).toBe(false); });
  it('nothing worth a glance: no card', () => { expect(gentleCard(quiet, open)).toBeNull(); expect(gentleCard({hour: 14, tasksDue: null, habitsLeft: null, billInDays: null}, open)).toBeNull(); });
  it('one card at a time, the most pressing first: a bill, then tasks, then open habits in the evening, then the morning plan', () => {
    expect(gentleCard({hour: 19, tasksDue: 2, habitsLeft: 3, billInDays: 1}, open)).toEqual({id: 'bills', why: 'A bill is due tomorrow.'});
    expect(gentleCard({hour: 19, tasksDue: 2, habitsLeft: 3, billInDays: 9}, open)).toEqual({id: 'tasks', why: '2 tasks are due today.'});
    expect(gentleCard({hour: 19, tasksDue: 0, habitsLeft: 1, billInDays: null}, open)?.id).toBe('habit-week');
    expect(gentleCard({hour: 12, tasksDue: 0, habitsLeft: 3, billInDays: null}, open)).toBeNull(); // open habits are no concern at noon
    expect(gentleCard({hour: 8, tasksDue: 0, habitsLeft: 3, billInDays: null}, open)?.id).toBe('glance');
    expect(gentleCard({hour: 8, tasksDue: 1, habitsLeft: 0, billInDays: 0}, open)?.why).toBe('A bill is due today.');
    expect(gentleCard({hour: 8, tasksDue: 1, habitsLeft: 0, billInDays: -2}, open)?.why).toBe('A bill is past its date.');
  });
  it('each card at most once a day; three a day at most; Calm makes them rarer (one a day)', () => {
    const busy = {hour: 19, tasksDue: 2, habitsLeft: 3, billInDays: 1};
    expect(gentleCard(busy, {...open, shown: ['bills']})?.id).toBe('tasks');
    expect(gentleCard(busy, {...open, shown: ['bills', 'tasks']})?.id).toBe('habit-week');
    expect(gentleCard(busy, {...open, shown: ['bills', 'tasks', 'habit-week']})).toBeNull();
    expect(GENTLE_MAX_FULL).toBe(3); expect(GENTLE_MAX_CALM).toBe(1);
    expect(gentleCard(busy, {...open, calm: true})?.id).toBe('bills');
    expect(gentleCard(busy, {...open, calm: true, shown: ['bills']})).toBeNull();
  });
  it('a card whose page-data switch is off, or that cannot show here, is never chosen', () => {
    const busy = {hour: 19, tasksDue: 2, habitsLeft: 3, billInDays: 1};
    expect(gentleCard(busy, {...open, gate: g => g !== 'wealth'})?.id).toBe('tasks');
    expect(gentleCard(busy, {...open, gate: () => false})).toBeNull();
    expect(gentleCard(busy, {...open, available: id => id === 'habit-week'})?.id).toBe('habit-week');
  });
  it('remembers what it showed per local day, in the stage record', () => {
    let r = noteGentle(emptyStage(), '2026-11-11', 'bills');
    r = noteGentle(r, '2026-11-11', 'tasks'); r = noteGentle(r, '2026-11-11', 'bills');
    expect(gentleShown(r, '2026-11-11')).toEqual(['bills', 'tasks']);
    expect(gentleShown(r, '2026-11-12')).toEqual([]);
    expect(gentleShown(noteGentle(r, '2026-11-12', 'glance'), '2026-11-12')).toEqual(['glance']);
  });
  it('counts days to a bill', () => {
    expect(daysUntil('2026-11-11', '2026-11-13')).toBe(2); expect(daysUntil('2026-11-11', '2026-11-11')).toBe(0); expect(daysUntil('2026-11-11', '2026-11-09')).toBe(-2);
    expect(daysUntil('2026-11-11', null)).toBeNull(); expect(daysUntil('2026-11-11', 'soon')).toBeNull();
  });
});
