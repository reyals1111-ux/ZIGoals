import {describe, expect, it} from 'vitest';
import {dashboardSettingsSchema, emptyDashboardSettings} from '../dashboard-settings';
import {createEmptyHealth, healthSchema} from '../health';
import {intentionFrom, MOOD_WORDS, moodOn, setMood, setWrapUp, wrappedUp, wrapUpDay, wrapUpDue, wrapUpEnabled, wrapUpTime} from './engine';
import {todayItemShown, defaultView} from '../pages/visibility';
import {MAX_WRAP_UP_DAYS} from './schema';

// Session W Part 13: the evening wrap-up (settings v3 `wrapUp`) and the day's mood (Health v4 `moods`).
const AT = '2026-10-01T16:00:00.000Z', LATER = '2026-10-01T19:30:00.000Z';
describe('the wrap-up', () => {
  it('is off until turned on; turning it off where it was never on writes nothing; the first write raises settings to v3', () => {
    const empty = emptyDashboardSettings();
    expect(wrapUpEnabled(empty)).toBe(false);
    expect(setWrapUp(empty, false, '18:00', AT)).toBe(empty);
    const on = setWrapUp(empty, true, '18:00', AT);
    expect(on.schemaVersion).toBe(3);
    expect(on.wrapUp).toEqual({version: 1, enabled: {v: true, at: AT}, days: {}});
    expect(dashboardSettingsSchema.parse(on)).toEqual(on);
    expect(wrapUpTime(on)).toBe('18:00');
    const moved = setWrapUp(on, true, '20:30', LATER);
    expect(moved.wrapUp).toEqual({version: 1, enabled: {v: true, at: AT}, time: {v: '20:30', at: LATER}, days: {}});
    expect(() => setWrapUp(on, true, '8pm', LATER)).toThrow();
  });
  it('shows from its time on this device\'s clock until the day is wrapped up; "Not today" is the same without an intention', () => {
    const on = setWrapUp(emptyDashboardSettings(), true, '18:00', AT);
    expect(wrapUpDue(on, '2026-10-01', '17:59')).toBe(false);
    expect(wrapUpDue(on, '2026-10-01', '18:00')).toBe(true);
    const done = wrapUpDay(on, '2026-10-01', '  A short walk before work  ', LATER);
    expect(done.wrapUp!.days['2026-10-01']).toEqual({intention: 'A short walk before work', doneAt: LATER, at: LATER});
    expect(wrappedUp(done, '2026-10-01')).toBe(true);
    expect(wrapUpDue(done, '2026-10-01', '21:00')).toBe(false);
    expect(intentionFrom(done, '2026-10-01')).toBe('A short walk before work');
    expect(intentionFrom(setWrapUp(done, false, '18:00', LATER), '2026-10-01')).toBeNull();
    expect(wrapUpDay(on, '2026-10-01', null, LATER).wrapUp!.days['2026-10-01']).toEqual({doneAt: LATER, at: LATER});
    expect(wrapUpDue(setWrapUp(on, false, '18:00', LATER), '2026-10-01', '21:00')).toBe(false);
  });
  it('keeps the newest 400 days', () => {
    let s = setWrapUp(emptyDashboardSettings(), true, '18:00', AT);
    const days = Object.fromEntries(Array.from({length: MAX_WRAP_UP_DAYS}, (_, i) => [new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10), {doneAt: AT, at: AT}]));
    s = {...s, wrapUp: {...s.wrapUp!, days}};
    const next = wrapUpDay(s, '2027-01-01', null, LATER);
    expect(Object.keys(next.wrapUp!.days)).toHaveLength(MAX_WRAP_UP_DAYS);
    expect(next.wrapUp!.days['2025-01-01']).toBeUndefined();
    expect(next.wrapUp!.days['2027-01-01']).toBeDefined();
  });
});

describe('the day\'s mood', () => {
  it('one per Health day in the person\'s word, the newer answer replacing the earlier one; the first raises Health to v4', () => {
    const empty = createEmptyHealth();
    const h = setMood(empty, '2026-10-01', 4, AT);
    expect(h.schemaVersion).toBe(4);
    expect(moodOn(h, '2026-10-01')).toEqual({mood: 4, at: AT});
    expect(MOOD_WORDS[moodOn(h, '2026-10-01')!.mood - 1]).toBe('Good');
    const again = setMood(h, '2026-10-01', 2, LATER);
    expect(moodOn(again, '2026-10-01')).toEqual({mood: 2, at: LATER});
    expect(healthSchema.parse(again)).toEqual(again);
    expect(() => setMood(empty, '2026-10-01', 6, AT)).toThrow();
  });
});

it('Today\'s items of a hidden page leave Today with it; cross-area summaries stay', () => {
  const view = {...defaultView(), hidden: ['health', 'staking']} as ReturnType<typeof defaultView>;
  expect(todayItemShown(view, {widgetDomain: 'health'})).toBe(false);
  expect(todayItemShown(view, {widgetDomain: 'habits'})).toBe(true);
  expect(todayItemShown(view, {builtin: 'health'})).toBe(false);
  expect(todayItemShown(view, {builtin: 'wallet'})).toBe(false);
  expect(todayItemShown(view, {builtin: 'summary'})).toBe(true);
  expect(todayItemShown(defaultView(), {widgetDomain: 'chess'})).toBe(false);
  expect(todayItemShown(defaultView(true), {widgetDomain: 'chess'})).toBe(true);
});
