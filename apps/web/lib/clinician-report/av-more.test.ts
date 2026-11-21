import {describe, expect, it} from 'vitest';
import {buildReport, sectionHasData, REPORT_SECTIONS} from './build';
import type {Symptoms} from '../symptoms/schema';
import type {Supplements} from '../supplements/schema';

/** Session AV (owner follow-up 1, F-REPORT-MORE; Bearable): symptoms and supplements in the visit report. */
const symptoms: Symptoms = {version: 1, items: [{id: 'headache', name: 'Fictional headache', kind: 'symptom', createdAt: '2026-10-01T10:00:00.000Z'}, {id: 'coffee', name: 'Fictional coffee', kind: 'factor', createdAt: '2026-10-01T10:00:00.000Z'}],
  days: {'2026-11-10': {headache: 3}, '2026-11-11': {headache: 0, coffee: 2}, '2026-11-12': {headache: 1}, '2026-10-01': {headache: 3}}} as Symptoms;
const supplements: Supplements = {version: 1, items: [{id: 'supp_fictional-d', name: 'Fictional vitamin D', dose: '1 tablet', kind: 'supplement', times: ['08:00'], weekdays: 127, createdAt: '2026-11-08T10:00:00.000Z'}, {id: 'supp_fictional-p', name: 'Fictional pain relief', kind: 'medication', times: [], weekdays: 127, createdAt: '2026-11-01T10:00:00.000Z'}],
  log: [{itemId: 'supp_fictional-d', date: '2026-11-10', slot: '08:00', status: 'taken', at: '2026-11-10T08:00:00.000Z'}, {itemId: 'supp_fictional-d', date: '2026-11-11', slot: '08:00', status: 'skipped', at: '2026-11-11T08:00:00.000Z'}, {itemId: 'supp_fictional-p', date: '2026-11-10', slot: 'any', status: 'taken', at: '2026-11-10T09:00:00.000Z'}]} as Supplements;
const input = {from: '2026-11-08', to: '2026-11-14', today: '2026-11-14', health: null, habits: null, energy: null, symptoms, supplements};
describe('Session AV (F-REPORT-MORE)', () => {
  it('lists each symptom or factor rated in the range, as rated', () => {
    expect(REPORT_SECTIONS).toContain('symptoms');
    const r = buildReport({...input, sections: ['symptoms']});
    expect(r.symptoms!.rows).toEqual([{name: 'Fictional headache', kind: 'symptom', rated: 3, noted: 2, strong: 1, average: 1.3, averageWord: 'Mild'}, {name: 'Fictional coffee', kind: 'factor', rated: 1, noted: 1, strong: 0, average: 2, averageWord: 'Moderate'}]);
    expect(sectionHasData(input, 'symptoms')).toBe(true);
    expect(sectionHasData({...input, from: '2026-11-20', to: '2026-11-21', today: '2026-11-21'}, 'symptoms')).toBe(false);
  });
  it('counts planned doses from the day an item was added; "as needed" has none planned', () => {
    const r = buildReport({...input, sections: ['supplements']});
    expect(r.supplements!.rows).toEqual([{name: 'Fictional vitamin D', dose: '1 tablet', kind: 'supplement', planned: 7, taken: 1, skipped: 1, notLogged: 5}, {name: 'Fictional pain relief', dose: null, kind: 'medication', planned: null, taken: 1, skipped: 0, notLogged: null}]);
  });
  it('q3 #48: planned doses start on the local day the item was added, not its UTC day', () => {
    const tz = process.env.TZ;
    process.env.TZ = 'Europe/Amsterdam';
    try {
      // 23:30 UTC on 9 Nov is 00:30 on 10 Nov in Amsterdam: five planned days (10–14 Nov), not six.
      const late = {...supplements, items: [{...supplements.items![0]!, createdAt: '2026-11-09T23:30:00.000Z'}], log: []} as Supplements;
      expect(buildReport({...input, supplements: late, sections: ['supplements']}).supplements!.rows[0]!.planned).toBe(5);
    } finally { if (tz === undefined) delete process.env.TZ; else process.env.TZ = tz; }
  });
});
