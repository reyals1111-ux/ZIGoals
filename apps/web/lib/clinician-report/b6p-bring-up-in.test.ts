import {describe, expect, test} from 'vitest';
import {addBringUpIn, BRING_UP, BRING_UP_KEY, takeBackBringUpIn} from './bring-up';
import {readDeviceRecord} from '../device-record';

/** Review B6P-4 (Session AV lane 2, r6-body; LEDGER #417): one tap never writes over a list this device cannot read. */
const store = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, raw: (k: string) => m.get(k) ?? null}; };
const AT = new Date('2026-11-22T09:00:00.000Z');
const kept = {id: 'bu-0001-abcd', text: 'Ask about the headaches', from: 'typed', createdAt: '2026-11-20T09:00:00.000Z'};
describe('B6P-4: Bring this up at my next visit', () => {
  test('a readable list (or none yet) gets the line, and its Undo takes exactly that line back', () => {
    const s = store({[BRING_UP_KEY]: JSON.stringify({version: 1, items: [kept]})});
    expect(addBringUpIn(s, {text: 'Felt tense', from: 'checkin', day: '2026-11-21'}, 'bu-0002-abcd', AT)?.items.map(x => x.id)).toEqual(['bu-0001-abcd', 'bu-0002-abcd']);
    expect(takeBackBringUpIn(s, 'bu-0002-abcd')?.items.map(x => x.id)).toEqual(['bu-0001-abcd']);
    expect(readDeviceRecord(s, BRING_UP).data.items.map(x => x.id)).toEqual(['bu-0001-abcd']);
    const none = store();
    expect(addBringUpIn(none, {text: 'Felt tense', from: 'journal'}, 'bu-0003-abcd', AT)?.items).toHaveLength(1);
  });
  test('a list from a newer version, of another shape or not parsing is left exactly as it is, in the add and in the Undo', () => {
    for (const raw of [JSON.stringify({version: 2, items: [kept]}), JSON.stringify({items: 'x'}), '{nope']) {
      const s = store({[BRING_UP_KEY]: raw});
      expect(addBringUpIn(s, {text: 'Felt tense', from: 'checkin'}, 'bu-0004-abcd', AT)).toBeNull();
      expect(takeBackBringUpIn(s, 'bu-0004-abcd')).toBeNull();
      expect(s.raw(BRING_UP_KEY)).toBe(raw);
    }
  });
});
