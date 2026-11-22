import {describe, expect, test} from 'vitest';
import {buildReport} from './build';
import type {Symptoms} from '../symptoms/schema';

/** Session AV lane 2 (body; q3 #48, Bearable's report charts symptoms over time): the daily levels behind the report's chart. */
const symptoms = {version: 1, items: [{id: 'headache', name: 'Fictional headache', kind: 'symptom', createdAt: '2026-10-01T10:00:00.000Z'}, {id: 'coffee', name: 'Fictional coffee', kind: 'factor', createdAt: '2026-10-01T10:00:00.000Z'}, {id: 'tired', name: 'Fictional tiredness', kind: 'symptom', createdAt: '2026-10-01T10:00:00.000Z'}],
  days: {'2026-11-10': {headache: 3, tired: 1}, '2026-11-11': {headache: 0, coffee: 2}, '2026-11-12': {headache: 1}, '2026-10-01': {headache: 3}}} as Symptoms;
const input = {from: '2026-11-08', to: '2026-11-14', today: '2026-11-14', health: null, habits: null, energy: null, symptoms, supplements: null};
describe('the symptom chart', () => {
  test('one line per symptom (factors left out), each day\'s level or a gap; the most rated first', () => {
    const r = buildReport({...input, sections: ['symptoms']});
    expect(r.symptoms!.chart).toEqual({dates: ['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14'],
      lines: [{name: 'Fictional headache', values: [null, null, 3, 0, 1, null, null]}, {name: 'Fictional tiredness', values: [null, null, 1, null, null, null, null]}]});
  });
  test('no symptom rated in the range: no chart (the table says so)', () => {
    expect(buildReport({...input, from: '2026-11-13', to: '2026-11-14', sections: ['symptoms']}).symptoms!.chart).toBeUndefined();
  });
});
