import {describe, expect, test} from 'vitest';
import {saveGroundingLine} from './grounding-save';
import {JOURNAL, JOURNAL_KEY} from '../journal/schema';
import {readDeviceRecord} from '../device-record';

/** Review B6P-1 (Session AV lane 2, r6-body; LEDGER #414): the grounding journal line never writes over an unreadable journal. */
const store = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, raw: (k: string) => m.get(k) ?? null}; };
const AT = new Date('2026-11-22T21:00:00.000Z'), LINE = 'Five, four, three, two, one — See: lamp';
const entry = {id: 'e-1', date: '2026-11-20', text: 'An earlier entry', createdAt: '2026-11-20T20:00:00.000Z'};
describe('B6P-1: Save these words as a journal line', () => {
  test('a readable journal (or none yet) gets one more line, the earlier entries kept', () => {
    const s = store({[JOURNAL_KEY]: JSON.stringify({version: 1, entries: [entry], shareWithAi: false, followUps: true})});
    expect(saveGroundingLine(s, LINE, '2026-11-22', AT, 'g-1')).toBe('saved');
    expect(readDeviceRecord(s, JOURNAL).data.entries.map(e => [e.id, e.date, e.text])).toEqual([['e-1', '2026-11-20', 'An earlier entry'], ['g-1', '2026-11-22', LINE]]);
    const none = store();
    expect(saveGroundingLine(none, LINE, '2026-11-22', AT, 'g-2')).toBe('saved');
    expect(readDeviceRecord(none, JOURNAL).data.entries).toHaveLength(1);
  });
  test('a journal that cannot be read (one bad entry, a newer version, bytes that do not parse) is left exactly as it is', () => {
    for (const raw of [JSON.stringify({version: 1, entries: [entry, {text: 'no id'}], shareWithAi: false, followUps: true}), JSON.stringify({version: 2, entries: [entry]}), '{not json']) {
      const s = store({[JOURNAL_KEY]: raw});
      expect(saveGroundingLine(s, LINE, '2026-11-22', AT, 'g-3')).toBe('unreadable');
      expect(s.raw(JOURNAL_KEY)).toBe(raw);
    }
  });
});
