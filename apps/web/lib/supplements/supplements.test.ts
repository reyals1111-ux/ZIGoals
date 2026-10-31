import {describe, expect, test} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {addLocalDays} from '../local-date';
import {addSupplement, dayBit, dayDoses, editSupplement, markSupplement, removeSupplement, scheduledOn, setSupplementReminder, supplementReminders, supplementSummary} from './log';
import {emptySupplements, MAX_LOG, MAX_SUPPLEMENTS, SUPPLEMENTS, SUPPLEMENTS_KEY, supplementsSchema} from './schema';
import {showcaseSupplements} from './showcase';

const NOW = '2026-10-20T08:00:00.000Z', TODAY = '2026-10-31'; // a Saturday
const base = () => addSupplement(addSupplement(emptySupplements(), {name: ' Vitamin D ', dose: '1 capsule', times: ['08:00'], remind: true}, NOW, 'supp_vitd'), {name: 'Drops', kind: 'medication', times: []}, NOW, 'supp_drops');

describe('supplements and medication log (device-only, information only)', () => {
  test('the key is new and versioned; an empty or unknown-field record reads', () => {
    expect(SUPPLEMENTS_KEY).toBe('zigoals:supplements:v1');
    expect(supplementsSchema.parse({version: 1, later: true})).toEqual({version: 1, later: true});
    const storage = {getItem: () => '{"version":2}'};
    expect(readDeviceRecord(storage, SUPPLEMENTS).unreadable).toBe(true);
  });
  test('add, edit, remind, remove; names are needed, at most 40 items, at most 4 times', () => {
    let r = base();
    expect(r.items!.map(i => [i.name, i.times, i.weekdays, i.remind ?? false])).toEqual([['Vitamin D', ['08:00'], 127, true], ['Drops', [], 127, false]]);
    expect(() => addSupplement(r, {name: '  '}, NOW)).toThrow('Enter a name.');
    expect(() => addSupplement(r, {name: 'x', times: ['08:00', '09:00', '10:00', '11:00', '12:00']}, NOW)).toThrow();
    expect(() => addSupplement(r, {name: 'x', weekdays: 0}, NOW)).toThrow('Choose at least one day.');
    r = editSupplement(r, 'supp_vitd', {name: 'Vitamin D', times: ['20:00', '08:00', '08:00'], weekdays: dayBit(TODAY)});
    expect(r.items![0]).toMatchObject({times: ['08:00', '20:00'], weekdays: 32, createdAt: NOW});
    expect(r.items![0]!.remind).toBeUndefined();
    r = setSupplementReminder(r, 'supp_vitd', true); expect(r.items![0]!.remind).toBe(true);
    r = setSupplementReminder(r, 'supp_vitd', false); expect('remind' in r.items![0]!).toBe(false);
    let full = emptySupplements(); for (let i = 0; i < MAX_SUPPLEMENTS; i++) full = addSupplement(full, {name: `n${i}`}, NOW, `supp_item-${i}`);
    expect(() => addSupplement(full, {name: 'one more'}, NOW)).toThrow(/At most 40/);
    r = markSupplement(r, 'supp_drops', TODAY, 'any', 'taken', NOW);
    r = removeSupplement(r, 'supp_drops');
    expect(r.items).toHaveLength(1); expect(r.log).toEqual([]);
  });
  test('a day’s doses in time order, weekdays respected, marks set and cleared', () => {
    let r = editSupplement(base(), 'supp_vitd', {name: 'Vitamin D', times: ['08:00'], weekdays: dayBit(addLocalDays(TODAY, 1)), remind: true});
    expect(scheduledOn(r.items![0]!, TODAY)).toBe(false);
    expect(dayDoses(r, TODAY).map(d => d.slot)).toEqual(['any']);
    r = editSupplement(r, 'supp_vitd', {name: 'Vitamin D', times: ['21:00', '08:00'], remind: true});
    r = markSupplement(r, 'supp_vitd', TODAY, '08:00', 'taken', NOW);
    expect(dayDoses(r, TODAY).map(d => [d.name, d.slot, d.status])).toEqual([['Vitamin D', '08:00', 'taken'], ['Vitamin D', '21:00', null], ['Drops', 'any', null]]);
    r = markSupplement(r, 'supp_vitd', TODAY, '08:00', 'skipped', NOW);
    expect(r.log).toHaveLength(1); expect(r.log![0]!.status).toBe('skipped');
    r = markSupplement(r, 'supp_vitd', TODAY, '08:00', null, NOW);
    expect(r.log).toEqual([]);
    expect(() => markSupplement(r, 'supp_gone', TODAY, 'any', 'taken', NOW)).toThrow();
  });
  test('the log stays bounded: old marks go first, then the oldest beyond 4000', () => {
    let r = base();
    r = markSupplement(r, 'supp_vitd', '2025-01-01', '08:00', 'taken', NOW);
    r = markSupplement(r, 'supp_vitd', TODAY, '08:00', 'taken', NOW);
    expect(r.log!.map(m => m.date)).toEqual([TODAY]);
    const log = Array.from({length: MAX_LOG}, (_, i) => ({itemId: 'supp_drops', date: addLocalDays(TODAY, -(i % 300)), slot: `${String(Math.floor(i / 300) % 24).padStart(2, '0')}:${String(Math.floor(i / 7200) % 60).padStart(2, '0')}`, status: 'taken' as const, at: NOW}));
    r = supplementsSchema.parse({...r, log});
    r = markSupplement(r, 'supp_vitd', TODAY, '20:00', 'taken', NOW);
    expect(r.log!.length).toBe(MAX_LOG);
    expect(r.log!.some(m => m.itemId === 'supp_vitd' && m.slot === '20:00')).toBe(true);
  });
  test('the summary says not logged, never missed; as-needed counts only what was logged', () => {
    let r = base();
    r = markSupplement(r, 'supp_vitd', TODAY, '08:00', 'taken', NOW);
    r = markSupplement(r, 'supp_vitd', addLocalDays(TODAY, -1), '08:00', 'skipped', NOW);
    r = markSupplement(r, 'supp_drops', TODAY, 'any', 'taken', NOW);
    const [vitd, drops] = supplementSummary(r, TODAY, 14);
    // added on 20 Oct: 12 days through 31 Oct
    expect(vitd).toEqual({itemId: 'supp_vitd', planned: 12, taken: 1, skipped: 1, notLogged: 10, days: 14});
    expect(drops).toEqual({itemId: 'supp_drops', planned: 0, taken: 1, skipped: 0, notLogged: 0, days: 14});
  });
  test('reminders for the notification plan carry no name or dose', () => {
    let r = editSupplement(base(), 'supp_vitd', {name: 'Vitamin D', times: ['08:00', '20:00'], remind: true});
    r = markSupplement(r, 'supp_vitd', TODAY, '08:00', 'taken', NOW);
    const plan = supplementReminders(r, TODAY);
    expect(plan).toEqual([{id: 'supplement:supp_vitd:08:00', time: '08:00', weekdays: 127, doneToday: true}, {id: 'supplement:supp_vitd:20:00', time: '20:00', weekdays: 127, doneToday: false}]);
    expect(JSON.stringify(plan)).not.toMatch(/Vitamin|capsule/);
  });
  test('the Showcase log is labelled, valid and deterministic', () => {
    const a = showcaseSupplements(TODAY);
    expect(JSON.stringify(a)).toBe(JSON.stringify(showcaseSupplements(TODAY)));
    expect(a.items!.every(i => i.name.includes('(Showcase)') && i.note?.startsWith('SHOWCASE DATA'))).toBe(true);
    const summary = supplementSummary(a, TODAY, 14);
    expect(summary[0]).toMatchObject({taken: 12, notLogged: 2});
    expect(summary[1]).toMatchObject({skipped: 1, notLogged: 3});
  });
});
