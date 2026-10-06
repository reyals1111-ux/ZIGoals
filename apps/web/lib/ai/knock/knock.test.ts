import {describe, expect, it} from 'vitest';
import {INFLATION, LOUD, SHAME, toneProblem} from '../proactive/calm';
import {ZIGI_DEFAULTS, zigiKnockSchema, type ZigiKnock} from '../store/records';
import {dismissZigiReminder, goalRefs, zigiDue, PACK_REFRESH, WEALTH_LOOK} from './due';
import {inQuietHours, knockFor, knockLines, recordKnock, snooze, snoozeUntil, type KnockCandidate} from './rules';
import {KNOCK_OFFER, offerDue} from './offer';

// Session V Part 13: ZIGi's own weekly reminders and the knock's rules, all on this device.
const at = (iso: string) => new Date(iso);
// Sunday 2026-09-20 at 19:00 local (the tests run in UTC, see vitest's TZ).
const SUNDAY_EVENING = at('2026-09-20T19:00:00');
describe('ZIGi reminders that are due', () => {
  const platform = {goals: [{id: 'g1', name: 'Japan adventure', status: 'active'}, {id: 'g2', name: 'Old car', status: 'closed'}]} as never;
  const goal = goalRefs(platform, {'7': 'Emergency fund'});
  it('a weekly time is due on its weekday once the time has passed, until dismissed for the day', () => {
    const reminders = {version: 1 as const, goalCheckIns: {'private:g1': {weekday: 0, time: '18:00'}, 'private:g2': {weekday: 0, time: '18:00'}, 'legacy:7': {weekday: 0, time: '20:00'}, 'private:gone': {weekday: 0, time: '09:00'}}, wealthLook: {weekday: 0, time: '10:00'}, packRefresh: {weekday: 1, time: '10:00'}};
    const due = zigiDue({reminders, goal, now: SUNDAY_EVENING});
    expect(due.map(d => [d.id, d.title, d.href])).toEqual([['wealth-look', 'A look at Wealth', '/app/wealth'], ['goal:private:g1', 'Japan adventure', '/app/goals/tracked/g1']]);
    expect(zigiDue({reminders, goal, now: at('2026-09-20T20:30:00')}).map(d => d.id)).toContain('goal:legacy:7');
    expect(zigiDue({reminders, goal, now: at('2026-09-21T10:30:00')}).map(d => d.id)).toEqual([PACK_REFRESH]);
    const dismissed = dismissZigiReminder(reminders, WEALTH_LOOK, '2026-09-20');
    expect(zigiDue({reminders: dismissed, goal, now: SUNDAY_EVENING}).map(d => d.id)).toEqual(['goal:private:g1']);
    expect(zigiDue({reminders: dismissed, goal, now: at('2026-09-27T19:00:00')}).map(d => d.id)).toContain(WEALTH_LOOK);
  });
  it('"Not today" keeps two weeks of dates, today first', () => {
    let r: Parameters<typeof dismissZigiReminder>[0] = {version: 1};
    for (let d = 1; d <= 20; d++) r = dismissZigiReminder(r, 'wealth-look', `2026-09-${String(d).padStart(2, '0')}`);
    expect(Object.keys(r.dismissed!)).toHaveLength(14);
    expect(Object.keys(r.dismissed!)).toContain('2026-09-20'); expect(Object.keys(r.dismissed!)).not.toContain('2026-09-06');
  });
});
describe('the knock', () => {
  const prefs = {...ZIGI_DEFAULTS.knock, enabled: true};
  const c = (id: string, time = '18:00'): KnockCandidate => ({id, kind: 'habit', title: id, time, day: '2026-09-20', href: '/app/habits'});
  const empty: ZigiKnock = {version: 1};
  it('quiet hours may cross midnight; an empty window is never quiet', () => {
    expect(inQuietHours('23:00', '22:00', '08:00')).toBe(true); expect(inQuietHours('07:59', '22:00', '08:00')).toBe(true);
    expect(inQuietHours('08:00', '22:00', '08:00')).toBe(false); expect(inQuietHours('21:59', '22:00', '08:00')).toBe(false);
    expect(inQuietHours('13:00', '12:00', '14:00')).toBe(true); expect(inQuietHours('10:00', '10:00', '10:00')).toBe(false);
  });
  it('off by default; on, it knocks for the earliest reminder not yet knocked today, never in the quiet hours or above the cap', () => {
    expect(knockFor({candidates: [c('a')], prefs: ZIGI_DEFAULTS.knock, state: empty, now: SUNDAY_EVENING, day: '2026-09-20'})).toBeNull();
    expect(knockFor({candidates: [c('a'), c('b')], prefs, state: empty, now: SUNDAY_EVENING, day: '2026-09-20'})?.id).toBe('a');
    expect(knockFor({candidates: [c('a')], prefs, state: empty, now: at('2026-09-20T22:30:00'), day: '2026-09-20'})).toBeNull();
    let state = recordKnock(empty, 'a', '2026-09-20', SUNDAY_EVENING);
    expect(knockFor({candidates: [c('a'), c('b')], prefs, state, now: SUNDAY_EVENING, day: '2026-09-20'})?.id).toBe('b');
    state = recordKnock(recordKnock(state, 'b', '2026-09-20', SUNDAY_EVENING), 'c', '2026-09-20', SUNDAY_EVENING);
    expect(state.counts!['2026-09-20']).toBe(3);
    expect(knockFor({candidates: [c('d')], prefs, state, now: SUNDAY_EVENING, day: '2026-09-20'})).toBeNull();
    expect(knockFor({candidates: [c('d')], prefs: {...prefs, maxPerDay: 4}, state, now: SUNDAY_EVENING, day: '2026-09-20'})?.id).toBe('d');
    // A reminder whose own card the page shows is left alone.
    expect(knockFor({candidates: [c('d')], prefs: {...prefs, maxPerDay: 4}, state, now: SUNDAY_EVENING, day: '2026-09-20', blocked: new Set(['d'])})).toBeNull();
    expect(zigiKnockSchema.safeParse(state).success).toBe(true);
  });
  it('a snooze holds the reminder until it ends, then ZIGi knocks once more', () => {
    const shown = recordKnock({version: 1}, 'a', '2026-09-20', SUNDAY_EVENING);
    const until = snoozeUntil('15m', SUNDAY_EVENING, prefs)!;
    const snoozed = snooze(shown, 'a', until, SUNDAY_EVENING);
    expect(knockFor({candidates: [c('a')], prefs, state: snoozed, now: at('2026-09-20T19:10:00'), day: '2026-09-20'})).toBeNull();
    expect(knockFor({candidates: [c('a')], prefs, state: snoozed, now: at('2026-09-20T19:16:00'), day: '2026-09-20'})?.id).toBe('a');
    const again = recordKnock(snoozed, 'a', '2026-09-20', at('2026-09-20T19:16:00'));
    expect(again.snoozed).toEqual({});
    expect(knockFor({candidates: [c('a')], prefs, state: again, now: at('2026-09-20T19:30:00'), day: '2026-09-20'})).toBeNull();
    expect(zigiKnockSchema.safeParse(snoozed).success).toBe(true);
  });
  it('snooze lengths: 15 minutes, an hour, and "Tonight" (20:00) only before 19:30 and outside the quiet hours', () => {
    expect(snoozeUntil('1h', SUNDAY_EVENING, prefs)!.getTime() - SUNDAY_EVENING.getTime()).toBe(3_600_000);
    expect(snoozeUntil('tonight', at('2026-09-20T15:00:00'), prefs)!.getHours()).toBe(20);
    expect(snoozeUntil('tonight', at('2026-09-20T19:45:00'), prefs)).toBeNull();
    expect(snoozeUntil('tonight', at('2026-09-20T15:00:00'), {quietFrom: '19:00', quietTo: '08:00'})).toBeNull();
  });
  it('two weeks of counts and knocks are kept', () => {
    let state: ZigiKnock = {version: 1};
    for (let d = 1; d <= 20; d++) state = recordKnock(state, 'a', `2026-09-${String(d).padStart(2, '0')}`, SUNDAY_EVENING);
    expect(Object.keys(state.counts!)).toHaveLength(14); expect(Object.keys(state.shown!)).toHaveLength(14);
    expect(zigiKnockSchema.safeParse(state).success).toBe(true);
  });
  it('what ZIGi says is calm: the name and the time, nothing about what was missed', () => {
    for (const kind of ['habit', 'water', 'goal', 'wealth', 'pack'] as const) {
      const lines = knockLines({...c('Stretch'), kind});
      for (const text of [lines.title, lines.line, lines.action]) { expect(toneProblem(text), text).toBeNull(); expect(LOUD.test(text) || SHAME.test(text) || INFLATION.test(text), text).toBe(false); }
    }
    expect(toneProblem(KNOCK_OFFER)).toBeNull();
  });
});
describe('the knock, offered once', () => {
  const base = {connected: true, sensitive: false, chatEnded: false, today: '2026-09-20', connectedOn: '2026-09-20'};
  it('after the first chat, or on a later day; never twice, never unconnected, never on a sensitive screen', () => {
    expect(offerDue({...base, record: {version: 1}})).toBe(false);
    expect(offerDue({...base, record: {version: 1}, chatEnded: true})).toBe(true);
    expect(offerDue({...base, record: {version: 1}, connectedOn: '2026-09-19'})).toBe(true);
    expect(offerDue({...base, record: {version: 1, knock: {offer: 'declined'}}, chatEnded: true})).toBe(false);
    expect(offerDue({...base, record: {version: 1, knock: {offer: 'accepted', enabled: false}}, chatEnded: true})).toBe(false);
    expect(offerDue({...base, record: {version: 1, knock: {enabled: true}}, chatEnded: true})).toBe(false);
    expect(offerDue({...base, record: {version: 1}, chatEnded: true, sensitive: true})).toBe(false);
    expect(offerDue({...base, record: {version: 1}, chatEnded: true, connected: false})).toBe(false);
  });
});
