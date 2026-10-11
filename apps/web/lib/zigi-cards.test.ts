import {describe, expect, it} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from './device-record';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {EVERYTHING_KEYS} from './export/everything';
import {MAX_REPLIES, ZIGI_CARDS, cardsSchema, keepCards, keptCards, type CardsRecord, type KeptCard} from './zigi-cards';
import {ZIGI_CARDS_KEY} from './z-device-keys';

// Session Z-Cloud Gate C, the persona round (ADR-019 C50): a card's outcome outlives the open panel, so a chat reopened
// from History never offers an added card again.
const cards = (entries: [string, KeptCard][]) => new Map(entries);
const empty: CardsRecord = {version: 1};

describe('keeping the outcomes of a reply\'s cards', () => {
  it('keeps and reads back each card\'s outcome and whether it was edited', () => {
    const record = keepCards(empty, 'turn-1', cards([['p1', {outcome: 'added', edited: true}], ['p2', {outcome: 'dismissed', edited: false}]]), 1000);
    expect(cardsSchema.parse(record)).toEqual(record);
    expect([...keptCards(record, 'turn-1')]).toEqual([['p1', {outcome: 'added', edited: true}], ['p2', {outcome: 'dismissed', edited: false}]]);
    expect(keptCards(record, 'turn-2').size).toBe(0);
  });
  it('a later outcome replaces the earlier one; the other cards of the reply stay', () => {
    let record = keepCards(empty, 'turn-1', cards([['p1', {outcome: 'added', edited: false}], ['p2', {outcome: 'added', edited: false}]]), 1000);
    record = keepCards(record, 'turn-1', cards([['p1', {outcome: 'undone', edited: false}]]), 2000);
    expect(Object.fromEntries(keptCards(record, 'turn-1'))).toEqual({p1: {outcome: 'undone', edited: false}, p2: {outcome: 'added', edited: false}});
  });
  it('nothing new is the same record, so nothing is written', () => {
    const record = keepCards(empty, 'turn-1', cards([['p1', {outcome: 'added', edited: false}]]), 1000);
    expect(keepCards(record, 'turn-1', cards([['p1', {outcome: 'added', edited: false}]]), 2000)).toBe(record);
    expect(keepCards(record, 'turn-1', cards([]), 2000)).toBe(record);
    expect(keepCards(record, '', cards([['p1', {outcome: 'added', edited: false}]]), 2000)).toBe(record);
    expect(keepCards(record, 'turn-1', cards([['not-a-card', {outcome: 'added', edited: false}]]), 2000)).toBe(record);
  });
  it('an outcome this build does not know reads as none; the card waits for the person again', () => {
    const record = cardsSchema.parse({version: 1, replies: {'turn-1': {at: 1, cards: {p1: {outcome: 'archived-later'}, p2: {outcome: 'auto'}}}}});
    expect([...keptCards(record, 'turn-1')]).toEqual([['p2', {outcome: 'auto', edited: false}]]);
  });
  it('keeps the 300 most recent replies', () => {
    let record = empty;
    for (let i = 0; i < MAX_REPLIES + 5; i++) record = keepCards(record, `turn-${i}`, cards([['p1', {outcome: 'added', edited: false}]]), 1000 + i);
    expect(Object.keys(record.replies!)).toHaveLength(MAX_REPLIES);
    expect(keptCards(record, 'turn-0').size).toBe(0);
    expect(keptCards(record, `turn-${MAX_REPLIES + 4}`).size).toBe(1);
    expect(cardsSchema.safeParse(record).success).toBe(true);
  });
});

describe('storage', () => {
  const memory = () => { const map = new Map<string, string>(); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), map}; };
  it('its own device key, read tolerantly: a later build\'s fields survive, unreadable bytes are left as they are', () => {
    const storage = memory();
    expect(ZIGI_CARDS.key).toBe(ZIGI_CARDS_KEY);
    expect(ZIGI_CARDS_KEY).toBe('zigoals:zigi-cards:v1');
    storage.setItem(ZIGI_CARDS_KEY, JSON.stringify({version: 1, later: {x: 1}, replies: {'turn-1': {at: 5, cards: {p1: {outcome: 'added', future: true}}, more: 1}}}));
    const next = updateDeviceRecord(storage, ZIGI_CARDS, r => keepCards(r, 'turn-1', cards([['p2', {outcome: 'dismissed', edited: false}]]), 10));
    expect(next).toMatchObject({later: {x: 1}, replies: {'turn-1': {at: 10, cards: {p1: {outcome: 'added', future: true}, p2: {outcome: 'dismissed'}}}}});
    storage.setItem(ZIGI_CARDS_KEY, '{not json');
    expect(readDeviceRecord(storage, ZIGI_CARDS)).toEqual({data: {version: 1}, unreadable: true});
    expect(storage.getItem(ZIGI_CARDS_KEY)).toBe('{not json');
  });
  it('holds no words: a display key (a device with only it is still new), and part of Export everything', () => {
    expect(NON_PERSONAL_KEYS).toContain(ZIGI_CARDS_KEY);
    expect(DEVICE_RECORD_KEYS).not.toContain(ZIGI_CARDS_KEY);
    const only = {length: 1, key: (i: number) => i === 0 ? ZIGI_CARDS_KEY : null};
    expect(noExistingData(only)).toBe(true);
    expect(EVERYTHING_KEYS).toContain(ZIGI_CARDS_KEY);
  });
});
