import {describe, expect, it} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {COUNTDOWNS, COUNTDOWNS_KEY, COUNTDOWN_TITLE_MAX, MAX_COUNTDOWNS, addCountdown, countdownWords, countdownsOn, countdownsSchema, daysUntil, emptyCountdowns, removeCountdown, restoreCountdown, splitCountdowns} from './schema';

/** Session AP: "Days until", a device record of the person's own countdowns. */
const TODAY = '2026-11-14', at = new Date('2026-11-14T09:00:00.000Z');
let n = 0;
const add = (r: ReturnType<typeof emptyCountdowns>, title: string, date: string, note?: string) => addCountdown(r, {title, date, note}, {id: `c${++n}`, at});

describe('the stored format (TIER 3, additive key)', () => {
  it('its own versioned key, strict, empty by default', () => {
    expect(COUNTDOWNS_KEY).toBe('zigoals:countdowns:v1');
    expect(COUNTDOWNS.key).toBe(COUNTDOWNS_KEY);
    expect(emptyCountdowns()).toEqual({version: 1, items: []});
    const one = add(emptyCountdowns(), '  Trip to Lisbon ', '2026-12-20', ' Pack light ');
    expect(one.items[0]).toEqual({id: expect.any(String), title: 'Trip to Lisbon', date: '2026-12-20', note: 'Pack light', createdAt: at.toISOString()});
    expect(countdownsSchema.safeParse({...one, extra: true}).success).toBe(false);
    expect(countdownsSchema.safeParse({version: 1, items: [{...one.items[0], colour: 'red'}]}).success).toBe(false);
    expect(countdownsSchema.safeParse({version: 1, items: [one.items[0], one.items[0]]}).success).toBe(false);
    expect(countdownsSchema.safeParse({version: 2, items: []}).success).toBe(false);
  });
  it('at most 50, a name of at most 80 characters, a real date', () => {
    let r = emptyCountdowns();
    for (let i = 0; i < MAX_COUNTDOWNS; i++) r = add(r, `Day ${i}`, '2027-01-01');
    expect(() => add(r, 'One more', '2027-01-01')).toThrow(/50 countdowns/);
    expect(() => add(emptyCountdowns(), 'x'.repeat(COUNTDOWN_TITLE_MAX + 1), '2027-01-01')).toThrow(/80 characters/);
    expect(() => add(emptyCountdowns(), '   ', '2027-01-01')).toThrow(/name/);
    expect(() => add(emptyCountdowns(), 'Odd', '2027-02-30')).toThrow(/real calendar date/);
  });
  it('unreadable bytes read as empty and unreadable', () => {
    expect(readDeviceRecord({getItem: () => '{"version":1,"items":[{"id":"a"}]}'}, COUNTDOWNS)).toEqual({data: emptyCountdowns(), unreadable: true});
  });
});

describe('days until, never negative', () => {
  it('counts calendar days, across a daylight-saving change and a year end', () => {
    expect(daysUntil('2026-11-14', TODAY)).toBe(0);
    expect(daysUntil('2026-12-25', TODAY)).toBe(41);
    expect(daysUntil('2027-03-29', '2027-03-27')).toBe(2);
    expect(daysUntil('2026-11-10', TODAY)).toBe(-4);
  });
  it('says Today, Tomorrow, In N days, Yesterday or N days ago', () => {
    expect(countdownWords(TODAY, TODAY)).toBe('Today');
    expect(countdownWords('2026-11-15', TODAY)).toBe('Tomorrow');
    expect(countdownWords('2026-12-25', TODAY)).toBe('In 41 days');
    expect(countdownWords('2026-11-13', TODAY)).toBe('Yesterday');
    expect(countdownWords('2026-11-10', TODAY)).toBe('4 days ago');
    for (const d of ['2026-01-01', '2025-06-30', '2026-11-13']) expect(countdownWords(d, TODAY)).not.toMatch(/-|left/);
  });
  it('splits into coming (soonest first, today included) and passed (latest first); the Agenda finds a day\'s own', () => {
    let r = emptyCountdowns();
    r = add(r, 'Concert', '2026-12-01'); r = add(r, 'Birthday', TODAY); r = add(r, 'Exam', '2026-11-01'); r = add(r, 'Move', '2026-11-12');
    const {upcoming, passed} = splitCountdowns(r, TODAY);
    expect(upcoming.map(c => c.title)).toEqual(['Birthday', 'Concert']);
    expect(passed.map(c => c.title)).toEqual(['Move', 'Exam']);
    expect(countdownsOn(r, '2026-12-01').map(c => c.title)).toEqual(['Concert']);
    expect(countdownsOn(r, '2026-12-02')).toEqual([]);
  });
});

describe('remove and Undo', () => {
  it('puts it back in its place once, on the latest record', () => {
    let r = emptyCountdowns();
    r = add(r, 'A', '2026-12-01'); r = add(r, 'B', '2026-12-02'); r = add(r, 'C', '2026-12-03');
    const b = r.items[1]!, without = removeCountdown(r, b.id);
    expect(without.items.map(i => i.title)).toEqual(['A', 'C']);
    const later = add(without, 'D', '2026-12-04');
    expect(restoreCountdown(later, b, 1).items.map(i => i.title)).toEqual(['A', 'B', 'C', 'D']);
    expect(restoreCountdown(restoreCountdown(later, b, 1), b, 1).items).toHaveLength(4);
  });
});

describe('the Today card is one of the cards kept on this device', () => {
  it('`countdowns` is a Today card id, before `orbit`, which stays last; turning it on writes only the card list', async () => {
    const {TODAY_CARD_IDS, emptyTodayCards, shownCards, toggleCard} = await import('../today-cards/store');
    expect(TODAY_CARD_IDS).toContain('countdowns');
    expect(TODAY_CARD_IDS.at(-1)).toBe('orbit');
    expect(shownCards(toggleCard(emptyTodayCards(), 'countdowns'))).toEqual(['countdowns']);
  });
});
