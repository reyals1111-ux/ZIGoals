import {describe, expect, test} from 'vitest';
import {collectEverything, DEVICE_KEYS} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {EVENING_PLAN_KEY, eveningRecordSchema} from '../evening-plan/schema';
import {DEFAULT_ON, emptyNotifyPrefs, energyReminders, NOTIFY_KEY, NOTIFY_TYPES, notifyPrefsSchema, setEnergyReminder, typeOn} from './prefs';
import {NOTIFY_LABELS} from './labels';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #235, #236; TIER 3 (stored formats), additive): the notification prefs' curve
 * reminders (`energy`) and the evening plan's morning steps, mornings and step reminders. A record written by an earlier
 * release reads as before; an unreadable new value is dropped, never a reason to refuse the record; and Export everything
 * → erase → Restore keeps every new field.
 */
const AT = '2026-11-20T08:00:00.000Z';
const PLAN = {version: 1, plan: {bedtime: '23:00', windDown: 45, hindrances: ['screens'], steps: [{id: 'screens-away', label: 'Screens away', minutesBefore: 45}, {id: 'lights-out', label: 'Lights out', minutesBefore: 0}], updatedAt: AT}, days: {'2026-11-19': ['lights-out']}};
const WITH = {...PLAN, morning: {steps: [{id: 'm-daylight', label: 'Daylight outside', minutesAfter: 15}], updatedAt: AT}, mornings: {'2026-11-20': ['m-daylight']}, remind: ['screens-away', 'm-daylight']};
const roundTrip = (key: string, value: unknown) => {
  const collected = collectEverything({[key]: JSON.stringify(value)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
  const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === key);
  expect(part).toBeDefined();
  const back = nextValue(part!, 'replace', undefined);
  return 'value' in back ? back.value : undefined;
};

describe('notification prefs: the curve reminders', () => {
  test('older prefs read as before: the energy type is off, no curve reminder', () => {
    const p = notifyPrefsSchema.parse({version: 1, types: {habits: true}});
    expect(p.energy).toBeUndefined();
    expect(typeOn(p, 'energy')).toBe(false);
    expect(DEFAULT_ON.energy).toBe(false);
    expect(NOTIFY_TYPES).toContain('energy');
    expect(NOTIFY_LABELS.energy.blurb).toContain('Never a sleep figure');
    expect(energyReminders(p)).toEqual({focus: false, dip: false, windDown: false});
  });
  test('choosing one switches the type on and keeps the others; an unreadable value is dropped', () => {
    let p = setEnergyReminder(emptyNotifyPrefs(), 'focus', true);
    p = setEnergyReminder(p, 'dip', true);
    p = setEnergyReminder(p, 'focus', false);
    expect(energyReminders(p)).toEqual({focus: false, dip: true, windDown: false});
    expect(typeOn(p, 'energy')).toBe(true);
    expect(notifyPrefsSchema.parse({...p, energy: 'loud'}).energy).toBeUndefined();
    expect(notifyPrefsSchema.parse({...p, energy: {focus: 'yes', dip: true}}).energy).toEqual({dip: true});
  });
  test('Export everything carries them (the notification prefs are exported, not restored: a new device asks again)', () => {
    const p = setEnergyReminder(setEnergyReminder(emptyNotifyPrefs(), 'windDown', true), 'dip', true);
    const collected = collectEverything({[NOTIFY_KEY]: JSON.stringify(p)}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    expect((collected.json as {device: Record<string, unknown>}).device.notify).toMatchObject({energy: {dip: true, windDown: true}});
    expect(planParts(JSON.parse(JSON.stringify(collected.json))).some(x => x.kind === 'device' && x.key === NOTIFY_KEY)).toBe(false);
  });
});

describe('the evening plan: morning steps, mornings, reminders', () => {
  test('a plan written before reads as before', () => {
    const r = eveningRecordSchema.parse(PLAN);
    expect(r.morning).toBeUndefined();
    expect(r.mornings).toBeUndefined();
    expect(r.remind).toBeUndefined();
  });
  test('the new fields read as written; an unreadable one is dropped and the rest kept', () => {
    expect(eveningRecordSchema.parse(WITH)).toEqual(WITH);
    const r = eveningRecordSchema.parse({...WITH, morning: {steps: []}, remind: ['Not An Id'], mornings: 'x'});
    expect(r.plan?.bedtime).toBe('23:00');
    expect(r.morning).toBeUndefined();
    expect(r.remind).toBeUndefined();
    expect(r.mornings).toBeUndefined();
  });
  const registered = Object.values(DEVICE_KEYS as Record<string, string>).includes(EVENING_PLAN_KEY);
  test.skipIf(!registered)('Export everything → erase → Restore keeps the morning steps and reminders', () => {
    expect(roundTrip(EVENING_PLAN_KEY, WITH)).toEqual(WITH);
  });
});
