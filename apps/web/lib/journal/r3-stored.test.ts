import {describe, expect, test} from 'vitest';
import {JOURNAL_KEY, emptyJournal, journalSchema, type Journal} from './schema';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

/**
 * Session AV lane 2 (r3-notes; TIER 3 (stored format), additive and optional): the journal's round-3 fields — an entry's
 * `period` (LEDGER #269), `night` (#278) and `opensOn` (#279), and the record's `quotes` choice (#277) — read on their own
 * (a value this build cannot read is dropped, never failing the journal), older records read as before, and Export
 * everything → erase → Restore (Replace and Merge) gives every one back.
 */
const AT = '2026-11-20T09:00:00.000Z';
export const R3_JOURNAL: Journal = journalSchema.parse({
  version: 1, shareWithAi: false, followUps: true, quotes: true,
  entries: [
    {id: 'w1', date: '2026-11-22', text: 'What went well this week:\nFictional runs.', createdAt: AT, template: 'week-look-back', period: '2026-W47'},
    {id: 'm1', date: '2026-11-30', text: 'A fictional month.', createdAt: AT, period: '2026-11'},
    {id: 'y1', date: '2026-12-31', text: 'A fictional year.', createdAt: AT, period: '2026'},
    {id: 'd1', date: '2026-11-21', text: 'A fictional dream about the sea.', createdAt: AT, journal: 'j-dreams', night: '2026-11-21'},
    {id: 'l1', date: '2026-11-20', text: 'Dear future me, fictional words.', createdAt: AT, template: 'letter-future-you', opensOn: '2027-11-20'},
  ],
  journals: [{id: 'j-dreams', name: 'Dreams', theme: 'violet'}],
});

describe('the round-3 journal fields read on their own', () => {
  test('a full record keeps them', () => {
    expect(R3_JOURNAL.entries.map(e => e.period ?? null)).toEqual(['2026-W47', '2026-11', '2026', null, null]);
    expect(R3_JOURNAL.entries[3]!.night).toBe('2026-11-21');
    expect(R3_JOURNAL.entries[4]!.opensOn).toBe('2027-11-20');
    expect(R3_JOURNAL.quotes).toBe(true);
  });
  test('a value this build cannot read is dropped, never failing the journal', () => {
    const odd = journalSchema.parse({...R3_JOURNAL, quotes: 'yes', entries: [{...R3_JOURNAL.entries[0], period: '2026-W60'}, {...R3_JOURNAL.entries[1], period: 'november'}, {...R3_JOURNAL.entries[3], night: 'last night'}, {...R3_JOURNAL.entries[4], opensOn: 20271120}]});
    expect(odd.quotes).toBeUndefined();
    expect(odd.entries.map(e => [e.period, e.night, e.opensOn])).toEqual([[undefined, undefined, undefined], [undefined, undefined, undefined], [undefined, undefined, undefined], [undefined, undefined, undefined]]);
    expect(odd.entries.map(e => e.text)).toEqual([R3_JOURNAL.entries[0]!.text, R3_JOURNAL.entries[1]!.text, R3_JOURNAL.entries[3]!.text, R3_JOURNAL.entries[4]!.text]);
  });
  test('a record from an earlier release reads as before', () => {
    const old = journalSchema.parse({version: 1, entries: [{id: 'e1', date: '2026-11-01', text: 'Old.', createdAt: AT}], shareWithAi: false, followUps: true});
    expect(old.quotes).toBeUndefined();
    expect(old.entries[0]).toEqual({id: 'e1', date: '2026-11-01', text: 'Old.', createdAt: AT});
    expect(journalSchema.parse(emptyJournal())).toEqual(emptyJournal());
  });
});

describe('Export everything → erase → Restore keeps them', () => {
  const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  const value = (part: PlannedPart, mode: 'replace' | 'merge', current?: unknown) => { const next = nextValue(part, mode, current); if ('error' in next) throw Error(next.error); return next.value; };
  test('Replace on an erased device, and Merge into an empty journal', async () => {
    const zip = buildEverythingZip(collectEverything({[JOURNAL_KEY]: JSON.stringify(R3_JOURNAL)}, APP), {date: '2026-11-22', showcase: false, now: NOW});
    const parts = planParts((await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]))).json), part = parts.find(p => p.id === 'device:journal')!;
    expect(journalSchema.parse(value(part, 'replace'))).toEqual(R3_JOURNAL);
    const merged = journalSchema.parse(value(part, 'merge', emptyJournal()));
    expect(merged.entries).toEqual(R3_JOURNAL.entries);
    expect(merged.quotes).toBe(true);
  });
});
