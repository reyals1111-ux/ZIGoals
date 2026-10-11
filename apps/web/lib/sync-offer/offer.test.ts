import {expect, test} from 'vitest';
import {SYNC_OFFER_KEY, deviceHoldsAccount, markSyncOfferLater, readSyncOffer, syncOfferState, type SyncOfferInput} from './offer';

const account = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const memory = (entries: Record<string, string> = {}) => {
  const data = new Map(Object.entries(entries));
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
  };
};
const base: SyncOfferInput = {account, manifest: null, opened: false, preparing: false, startedHere: false, later: false, deviceKnown: false, showcase: false};

test('the offer appears only for a signed-in account whose vault is known and not open here', () => {
  expect(syncOfferState(base)).toBe('offer-new');
  expect(syncOfferState({...base, manifest: {version: 1}})).toBe('offer-device');
  for (const hidden of [{account: null}, {opened: true}, {manifest: undefined}, {showcase: true}] as Partial<SyncOfferInput>[])
    expect(syncOfferState({...base, ...hidden})).toBe('hidden');
});

test('a returning device keeps only the usual unlock form', () => {
  expect(syncOfferState({...base, manifest: {version: 1}, deviceKnown: true})).toBe('hidden');
  expect(syncOfferState({...base, manifest: {version: 1}, deviceKnown: true, later: true})).toBe('hidden');
});

test('"Not now" turns either card into the reminder, until sync is on here', () => {
  expect(syncOfferState({...base, later: true})).toBe('reminder-new');
  expect(syncOfferState({...base, manifest: {version: 1}, later: true})).toBe('reminder-device');
  expect(syncOfferState({...base, later: true, opened: true})).toBe('hidden');
});

test('while the existing controls show a new recovery secret, only a card that started it stays, as the next step', () => {
  expect(syncOfferState({...base, preparing: true})).toBe('hidden');
  expect(syncOfferState({...base, preparing: true, startedHere: true})).toBe('next-step');
  expect(syncOfferState({...base, preparing: false, startedHere: true})).toBe('offer-new');
});

test('the flag is written only as the exact version-1 value and read back', () => {
  const storage = memory();
  expect(readSyncOffer(storage)).toBe('unanswered');
  expect(storage.data.size).toBe(0);
  expect(markSyncOfferLater(storage)).toBe(true);
  expect(storage.data.get(SYNC_OFFER_KEY)).toBe('{"version":1,"later":true}');
  expect(readSyncOffer(storage)).toBe('later');
});

test('a damaged or newer flag counts as answered and is never rewritten by reading', () => {
  for (const raw of ['{', 'null', '{"version":2,"later":true}', '{"version":1,"later":false}', '{"version":1,"later":true,"account":"x"}']) {
    const storage = memory({[SYNC_OFFER_KEY]: raw});
    expect(readSyncOffer(storage)).toBe('unreadable');
    expect(storage.data.get(SYNC_OFFER_KEY)).toBe(raw);
  }
});

test('storage that throws reads as unanswered and refuses the write honestly', () => {
  const broken = {getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); }};
  expect(readSyncOffer(broken)).toBe('unanswered');
  expect(markSyncOfferLater(broken)).toBe(false);
  expect(readSyncOffer(null)).toBe('unanswered');
  expect(markSyncOfferLater(null)).toBe(false);
});

test('a device knows an account only by that account\'s own namespaced keys', () => {
  expect(deviceHoldsAccount(memory({'zigoals:habits:v1': '{}', 'zigoals:account:v1:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb:zigoals:habits:v1': '{}'}), account)).toBe(false);
  expect(deviceHoldsAccount(memory({[`zigoals:account:v1:${account}:zigoals:settings:v1`]: '{}'}), account)).toBe(true);
  expect(deviceHoldsAccount({get length(): number { throw Error('denied'); }, key: () => null}, account)).toBe(false);
});
