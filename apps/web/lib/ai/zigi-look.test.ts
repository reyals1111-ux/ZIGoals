import {expect, test} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {ZIGI_KEY} from './store/keys';
import {ZIGI, zigiPrefs} from './store/records';
import {DEFAULT_LOOK, readZigiLook} from './zigi-look';

// Session V Part 12: the launcher shell's tiny reader of ZIGi's look agrees with the full validated record, and anything
// unreadable reads as the defaults (Calm, right, medium, the edge tab on) without a write.
const store = (value: string | null) => { const writes: string[] = []; return {getItem: (k: string) => k === ZIGI_KEY ? value : null, setItem: (k: string) => { writes.push(k); }, removeItem: (k: string) => { writes.push(k); }, writes}; };
test('defaults: nothing stored, unreadable bytes, another version, or storage that refuses', () => {
  expect(DEFAULT_LOOK).toEqual({animation: 'calm', side: 'right', size: 'm', edgeTab: true});
  for (const raw of [null, '{', '[]', 'null', JSON.stringify({version: 2, animation: 'full'}), JSON.stringify({animation: 'full'})]) expect(readZigiLook(store(raw)), String(raw)).toEqual(DEFAULT_LOOK);
  expect(readZigiLook({getItem: () => { throw new Error('denied'); }})).toEqual(DEFAULT_LOOK);
});
test('each field falls back alone; the edge tab is off only when switched off', () => {
  expect(readZigiLook(store(JSON.stringify({version: 1, animation: 'full', side: 'up', size: 'xl', edgeTab: 'no'})))).toEqual({animation: 'full', side: 'right', size: 'm', edgeTab: true});
  expect(readZigiLook(store(JSON.stringify({version: 1, edgeTab: false, side: 'left', size: 's', animation: 'off'})))).toEqual({animation: 'off', side: 'left', size: 's', edgeTab: false});
});
test('the shell reads what the full record holds, for every valid choice, and a read never writes', () => {
  for (const animation of ['full', 'calm', 'off'] as const) for (const side of ['right', 'left'] as const) for (const size of ['s', 'm', 'l'] as const) for (const edgeTab of [true, false]) {
    const s = store(JSON.stringify({version: 1, animation, side, size, edgeTab, knock: {enabled: false}, someLaterField: 1}));
    const full = zigiPrefs(readDeviceRecord(s, ZIGI).data);
    expect(readZigiLook(s)).toEqual({animation: full.animation, side: full.side, size: full.size, edgeTab: full.edgeTab});
    expect(s.writes).toEqual([]);
  }
});
