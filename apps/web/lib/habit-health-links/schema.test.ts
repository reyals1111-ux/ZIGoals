import {describe, expect, test} from 'vitest';
import {HABIT_HEALTH_LINKS_KEY, MAX_APPLIED_CHECK_INS, MAX_HEALTH_LINKS, emptyHabitHealthLinks, habitHealthLinkSchema, habitHealthLinksSchema, healthLinkIssue, type AppliedCheckIn, type HabitHealthLink} from './schema';
import {appliedCheckIn, markAutoCheckInUndone, readHabitHealthLinks, recordAutoCheckIn, setHabitHealthLink, startOverHabitHealthLinks, updateHabitHealthLinks} from './store';

const AT = '2026-10-01T07:00:00.000Z';
const habitId = (n: number) => `92000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const STEPS: HabitHealthLink = {version: 1, measure: 'steps', rule: 'at-least', target: 8000, updatedAt: AT};
const marker = (n: number, date = '2026-10-01'): AppliedCheckIn => ({habitId: habitId(n), date, healthDate: date, measure: 'steps', value: 8800, appliedAt: AT});
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage; }

describe('habit health links schema', () => {
  test('accepts every measure with its rule and refuses what a link cannot say', () => {
    for (const link of [STEPS, {...STEPS, measure: 'water', target: 2000}, {...STEPS, measure: 'activeMinutes', rule: 'recorded', target: undefined}, {...STEPS, measure: 'weight', rule: 'recorded', target: undefined}, {...STEPS, measure: 'exercise', exerciseId: 'health_counter-pushups', target: 20}] as const) expect(habitHealthLinkSchema.safeParse(link).success).toBe(true);
    expect(healthLinkIssue({...STEPS, measure: 'weight'})).toBe('A weight link completes when a reading is recorded.');
    expect(healthLinkIssue({...STEPS, target: undefined})).toBe('Enter a target above zero.');
    expect(healthLinkIssue({...STEPS, target: 0})).toBe('Enter a target above zero.');
    expect(healthLinkIssue({...STEPS, measure: 'exercise'})).toBe('Choose an exercise counter.');
    for (const link of [{...STEPS, measure: 'weight'}, {...STEPS, target: 0}, {...STEPS, measure: 'exercise'}, {...STEPS, measure: 'mood'}, {...STEPS, version: 2}, {...STEPS, progress: 1}, {...STEPS, target: 1e9 + 1}]) expect(habitHealthLinkSchema.safeParse(link).success).toBe(false);
  });
  test('the record: limits, one marker per habit and day, version 2 refused', () => {
    expect(habitHealthLinksSchema.parse(emptyHabitHealthLinks())).toEqual({version: 1, links: {}, applied: []});
    const links = Object.fromEntries(Array.from({length: MAX_HEALTH_LINKS}, (_, i) => [habitId(i + 1), STEPS]));
    expect(habitHealthLinksSchema.safeParse({version: 1, links, applied: []}).success).toBe(true);
    expect(habitHealthLinksSchema.safeParse({version: 1, links: {...links, [habitId(MAX_HEALTH_LINKS + 1)]: STEPS}, applied: []}).success).toBe(false);
    expect(habitHealthLinksSchema.safeParse({version: 1, links: {}, applied: Array.from({length: MAX_APPLIED_CHECK_INS}, (_, i) => marker(1, `2026-${String(1 + i % 12).padStart(2, '0')}-${String(1 + Math.floor(i / 12) % 28).padStart(2, '0')}`))}).success).toBe(false); // duplicates within the cap
    expect(habitHealthLinksSchema.safeParse({version: 1, links: {}, applied: [marker(1), marker(1)]}).success).toBe(false);
    expect(habitHealthLinksSchema.safeParse({version: 1, links: {}, applied: [marker(1), {...marker(1), undone: true, date: '2026-09-30'}]}).success).toBe(true);
    expect(habitHealthLinksSchema.safeParse({version: 2, links: {}, applied: []}).success).toBe(false);
    expect(habitHealthLinksSchema.safeParse({version: 1, links: {'not-a-uuid': STEPS}, applied: []}).success).toBe(false);
    expect(habitHealthLinksSchema.safeParse({version: 1, links: {}, applied: [{...marker(1), undone: false}]}).success).toBe(false);
  });
});

describe('habit health links store', () => {
  test('nothing stored reads as empty; unreadable bytes read as empty, say so, and are never touched', () => {
    const storage = memoryStorage();
    expect(readHabitHealthLinks(storage)).toEqual({data: emptyHabitHealthLinks(), unreadable: false});
    for (const raw of ['{', '[]', JSON.stringify({version: 2, links: {}, applied: []}), JSON.stringify({version: 1, links: {}, applied: [], extra: 1})]) {
      storage.setItem(HABIT_HEALTH_LINKS_KEY, raw);
      expect(readHabitHealthLinks(storage)).toEqual({data: emptyHabitHealthLinks(), unreadable: true});
      expect(() => updateHabitHealthLinks(storage, current => current)).toThrow('could not be read');
      expect(storage.getItem(HABIT_HEALTH_LINKS_KEY)).toBe(raw);
    }
    const denied = {getItem: () => { throw Error('denied'); }} as unknown as Storage;
    expect(readHabitHealthLinks(denied)).toEqual({data: emptyHabitHealthLinks(), unreadable: true});
  });
  test('a change writes the exact validated record and refuses an invalid result with nothing written', () => {
    const storage = memoryStorage();
    const next = updateHabitHealthLinks(storage, current => setHabitHealthLink(current, habitId(3), STEPS));
    expect(JSON.parse(storage.getItem(HABIT_HEALTH_LINKS_KEY)!)).toEqual({version: 1, links: {[habitId(3)]: STEPS}, applied: []});
    expect(readHabitHealthLinks(storage).data).toEqual(next);
    expect(() => updateHabitHealthLinks(storage, current => ({...current, links: {[habitId(3)]: {...STEPS, target: 0}}}))).toThrow();
    expect(readHabitHealthLinks(storage).data).toEqual(next);
    // Links of habits no longer in the journal are dropped with the next save that names the journal.
    const pruned = updateHabitHealthLinks(storage, current => setHabitHealthLink(current, habitId(4), {...STEPS, measure: 'water', target: 500}, new Set([habitId(4)])));
    expect(Object.keys(pruned.links)).toEqual([habitId(4)]);
    expect(updateHabitHealthLinks(storage, current => setHabitHealthLink(current, habitId(4), null)).links).toEqual({});
  });
  test('markers: one per habit and day, undone stays, the cap refuses with a plain message', () => {
    const storage = memoryStorage();
    const first = updateHabitHealthLinks(storage, current => recordAutoCheckIn(current, marker(1)));
    expect(first.applied).toEqual([marker(1)]);
    expect(recordAutoCheckIn(first, {...marker(1), value: 1})).toBe(first);
    const undone = markAutoCheckInUndone(first, habitId(1), '2026-10-01');
    expect(appliedCheckIn(undone, habitId(1), '2026-10-01')).toEqual({...marker(1), undone: true});
    expect(markAutoCheckInUndone(first, habitId(2), '2026-10-01')).toBe(first);
    // The cap: recordAutoCheckIn counts markers before it parses anything, so the dates here need not be real days.
    const full = {version: 1 as const, links: {}, applied: Array.from({length: MAX_APPLIED_CHECK_INS}, (_, i) => marker(1, String(i)))};
    expect(() => recordAutoCheckIn(full, marker(3))).toThrow('the most it keeps');
  });
  test('Start over copies the old bytes to a recovery key, then holds an empty record', () => {
    const storage = memoryStorage();
    storage.setItem(HABIT_HEALTH_LINKS_KEY, '{broken');
    expect(startOverHabitHealthLinks(storage)).toEqual(emptyHabitHealthLinks());
    const keys = Array.from({length: storage.length}, (_, i) => storage.key(i)!);
    const recovery = keys.find(k => k.startsWith(`${HABIT_HEALTH_LINKS_KEY}:recovery:`))!;
    expect(storage.getItem(recovery)).toBe('{broken');
    expect(readHabitHealthLinks(storage)).toEqual({data: emptyHabitHealthLinks(), unreadable: false});
  });
});
