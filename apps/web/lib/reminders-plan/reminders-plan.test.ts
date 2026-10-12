import {describe, expect, test} from 'vitest';
import {dismissPlan, emptyRemindersPlan, setPlanItem, setQuietHours, quietHours, REMINDERS_PLAN} from './schema';
import {planDue} from './due';
import {readDeviceRecord} from '../device-record';
import {FOCUSES, FOCUS_IDS, setupUndoable, suggestionsFor, emptyOnboardingSetup} from '../onboarding-setup';
import {inQuietHours} from '../habits-extras/bell';

const at = (clock: string) => new Date(`2026-10-07T${clock}:00`);
describe('S7 reminders plan', () => {
  test('items switch on with a time, quiet hours default and change, dismissals prune to today', () => {
    let p = emptyRemindersPlan(); expect(quietHours(p)).toEqual({from: '22:00', to: '08:00'});
    p = setPlanItem(p, 'bedtime', {on: true, time: '22:30'}); p = setPlanItem(p, 'review', {on: true, weekday: 0});
    p = setQuietHours(p, {from: '23:00', to: '07:00'}); expect(quietHours(p)).toEqual({from: '23:00', to: '07:00'});
    p = dismissPlan({...p, dismissed: {'goal-checkin': '2026-10-01'}}, 'bedtime', '2026-10-07'); expect(p.dismissed).toEqual({bedtime: '2026-10-07'});
    expect(() => setPlanItem(p, 'bedtime', {on: true, time: '25:00'})).toThrow();
    const m = new Map<string, string>(); m.set(REMINDERS_PLAN.key, JSON.stringify({version: 1, items: {bedtime: {on: true}}, later: true}));
    expect(readDeviceRecord({getItem: k => m.get(k) ?? null}, REMINDERS_PLAN).unreadable).toBe(false);
  });
  test('due: after the time, on, not dismissed, outside quiet hours; the review on its weekday; the fast only once past its target', () => {
    let p = setPlanItem(emptyRemindersPlan(), 'bedtime', {on: true, time: '21:30'}); p = setPlanItem(p, 'review', {on: true, time: '09:00'}); p = setPlanItem(p, 'fasting-end', {on: true}); p = setPlanItem(p, 'goal-checkin', {on: true, time: '09:00', weekday: 3});
    const ctx = {weekday: 3, reviewWeekday: 0, fastDone: false};
    expect(planDue(p, at('21:45'), '2026-10-07', ctx).map(d => d.kind)).toEqual(['bedtime', 'goal-checkin']);
    expect(planDue(p, at('21:00'), '2026-10-07', ctx).map(d => d.kind)).toEqual(['goal-checkin']);
    expect(planDue(p, at('22:30'), '2026-10-07', ctx)).toEqual([]); // quiet hours
    expect(planDue(p, at('09:30'), '2026-10-07', {...ctx, weekday: 0}).map(d => d.kind)).toEqual(['review']);
    expect(planDue(p, at('13:00'), '2026-10-07', {...ctx, fastDone: true}).map(d => d.kind)).toContain('fasting-end');
    expect(planDue(dismissPlan(p, 'bedtime', '2026-10-07'), at('21:45'), '2026-10-07', ctx).map(d => d.kind)).toEqual(['goal-checkin']);
    expect(inQuietHours(at('03:00'))).toBe(true); expect(inQuietHours(at('12:00'))).toBe(false); expect(inQuietHours(at('12:00'), '11:00', '13:00')).toBe(true);
  });
});
describe('S4 onboarding focuses', () => {
  test('every focus belongs to a pillar; suggestions merge without twins; the setup is undoable for a day', () => {
    expect([...FOCUSES.map(f => f.id)].sort()).toEqual([...FOCUS_IDS].sort());
    const s = suggestionsFor(['move', 'water', 'save', 'meditate']);
    expect(s.habits).toEqual(['Walk', 'Drink water', 'Meditate', 'Contribute']); expect(s.goal).toEqual({name: 'Emergency fund', category: 'Emergency Fund'}); expect(s.widgets).toEqual(['health', 'habits', 'meditation', 'goals', 'wealth']);
    expect(suggestionsFor([])).toEqual({habits: [], goal: null, widgets: []});
    const done = {...emptyOnboardingSetup(), at: '2026-10-07T08:00:00.000Z', habitIds: ['a']};
    expect(setupUndoable(done, new Date('2026-10-07T20:00:00.000Z'))).toBe(true); expect(setupUndoable(done, new Date('2026-10-09T08:00:00.000Z'))).toBe(false); expect(setupUndoable({...done, undone: true}, new Date('2026-10-07T09:00:00.000Z'))).toBe(false);
  });
});
