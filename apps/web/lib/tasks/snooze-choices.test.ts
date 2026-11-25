import {describe, expect, test} from 'vitest';
import {ownSnoozeUntil, ownSnoozes, snoozeButton, snoozeLabel, snoozeWords, USUAL_SNOOZES} from './snooze-choices';
import {SNOOZE_CHOICES, snoozeUntil} from './reminders';
import {instantAt} from '../zone-time';

/** Session AW (X1, LEDGER #439; Due's own snooze times): up to six choices of the person's own, the first on the notification. */
const ZONE = 'Europe/Amsterdam', at = (date: string, clock: string) => instantAt(date, clock, ZONE);
const NOW = at('2026-11-25', '18:10'); // a Wednesday

describe('own snooze choices', () => {
  test('only the ones this build can read, at most six, no twins; none kept is null (the usual three)', () => {
    expect(ownSnoozes(undefined)).toBeNull();
    expect(ownSnoozes([])).toBeNull();
    expect(ownSnoozes([{for: 3}, {for: 120}, {for: 120}, {at: '25:00', day: 'next'}, {at: '19:00', day: 'next'}, 'x'])).toEqual([{for: 120}, {at: '19:00', day: 'next'}]);
    expect(ownSnoozes(Array.from({length: 9}, (_, i) => ({for: 10 + i})))).toHaveLength(6);
  });
  test('words on the button and for a screen reader', () => {
    expect([{for: 120}, {for: 90}, {for: 20}, {at: '19:00', day: 'next'}, {at: '08:00', day: 'tomorrow'}, {at: '09:00', day: 1}].map(c => snoozeLabel(c as never))).toEqual(['2 h', '1 h 30 min', '20 min', 'This evening 7:00 PM', 'Tomorrow 8:00 AM', 'Monday 9:00 AM']);
    expect(snoozeWords({for: 120})).toBe('for 2 hours');
    expect(snoozeWords({at: '09:00', day: 1})).toBe('until Monday at 9:00 AM');
  });
  test('when each one ends', () => {
    expect(ownSnoozeUntil({for: 120}, NOW, ZONE)).toBe(NOW + 120 * 60_000);
    expect(ownSnoozeUntil({at: '19:00', day: 'next'}, NOW, ZONE)).toBe(at('2026-11-25', '19:00'));
    expect(ownSnoozeUntil({at: '17:00', day: 'next'}, NOW, ZONE)).toBe(at('2026-11-26', '17:00'));
    expect(ownSnoozeUntil({at: '08:00', day: 'tomorrow'}, NOW, ZONE)).toBe(at('2026-11-26', '08:00'));
    expect(ownSnoozeUntil({at: '09:00', day: 1}, NOW, ZONE)).toBe(at('2026-11-30', '09:00'));
    expect(ownSnoozeUntil({at: '20:00', day: 3}, NOW, ZONE)).toBe(at('2026-11-25', '20:00'));
  });
  test('the usual three are the same lengths as before', () => {
    expect(USUAL_SNOOZES.map(c => ownSnoozeUntil(c, NOW, ZONE))).toEqual(SNOOZE_CHOICES.map(c => snoozeUntil(c.id, NOW, ZONE)));
  });
  test('the notification button: a length, or steps the worker reads without zone rules', () => {
    expect(snoozeButton({for: 120}, NOW, ZONE)).toEqual({title: 'Snooze 2 h', ms: 7_200_000});
    const b = snoozeButton({at: '19:00', day: 'next'}, NOW, ZONE);
    expect(b.title).toBe('Snooze This evening 7:00 PM');
    const pick = (t: number) => b.steps!.filter(s => s[0] <= t).at(-1)![1];
    for (const t of [NOW, at('2026-11-25', '18:59'), at('2026-11-25', '19:00'), at('2026-11-26', '03:00'), at('2026-11-26', '19:30')]) expect(pick(t)).toBe(ownSnoozeUntil({at: '19:00', day: 'next'}, t, ZONE));
  });
});
