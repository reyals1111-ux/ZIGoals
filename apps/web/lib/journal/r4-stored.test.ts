import {describe, expect, test} from 'vitest';
import {JOURNAL_KEY, MAX_ENTRY_PHOTOS_ALL, emptyJournal, journalSchema, type Journal} from './schema';
import {JOURNAL_DISPLAY_KEY, emptyJournalDisplay, journalDisplaySchema} from '../on-this-day/store';
import {namedMedia} from './media';
import {journalExportFiles, type MediaFile} from './export';
import {applyJournalImport, planJournalImport} from './import';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

/**
 * Session AV lane 2 (r4-mind; TIER 3 (stored format), additive and optional): an entry's `star` (LEDGER #310) and
 * `morePhotos` (#317), and the "On this day" record's `memoryNotify` (#309) — read on their own (a value this build
 * cannot read is dropped, never failing the record), older records read as before, Export everything → erase → Restore
 * gives each back, the 30-day media sweep keeps photos five to twelve, and the journal's own ZIP (Day One's shape) carries
 * the star and all twelve photos back in.
 */
const AT = '2026-11-20T09:00:00.000Z';
const ids = (n: number, from = 0) => Array.from({length: n}, (_, i) => `m-photo${String(i + from).padStart(3, '0')}`);
export const R4_JOURNAL: Journal = journalSchema.parse({
  version: 1, shareWithAi: false, followUps: true,
  entries: [
    {id: 's1', date: '2026-11-20', text: 'A fictional favourite day.', createdAt: AT, star: true},
    {id: 'p1', date: '2026-11-21', text: 'A fictional walk with many photos.', createdAt: AT, photos: ids(4), morePhotos: ids(8, 4)},
    {id: 'o1', date: '2026-11-22', text: 'A fictional plain day.', createdAt: AT},
  ],
});
describe('the round-4 journal fields read on their own', () => {
  test('a full record keeps them', () => {
    expect(R4_JOURNAL.entries.map(e => e.star ?? null)).toEqual([true, null, null]);
    expect(R4_JOURNAL.entries[1]!.morePhotos).toHaveLength(8);
    expect(journalDisplaySchema.parse({version: 1, memoryNotify: true}).memoryNotify).toBe(true);
  });
  test('a value this build cannot read is dropped, never failing the record', () => {
    const odd = journalSchema.parse({...R4_JOURNAL, entries: [{...R4_JOURNAL.entries[0], star: 'yes'}, {...R4_JOURNAL.entries[1], morePhotos: ids(9, 4)}, {...R4_JOURNAL.entries[2], morePhotos: ['not an id']}]});
    expect(odd.entries.map(e => [e.star, e.morePhotos])).toEqual([[undefined, undefined], [undefined, undefined], [undefined, undefined]]);
    expect(odd.entries[1]!.photos).toEqual(ids(4));
    expect(journalDisplaySchema.parse({version: 1, memoryNotify: 'on', hidden: ['a']})).toEqual({version: 1, hidden: ['a']});
  });
  test('records from earlier releases read as before; `photos` never holds more than four', () => {
    const old = journalSchema.parse({version: 1, entries: [{id: 'e1', date: '2026-11-01', text: 'Old.', createdAt: AT, photos: ids(4)}], shareWithAi: false, followUps: true});
    expect(old.entries[0]).toEqual({id: 'e1', date: '2026-11-01', text: 'Old.', createdAt: AT, photos: ids(4)});
    expect(journalSchema.parse(emptyJournal())).toEqual(emptyJournal());
    expect(journalDisplaySchema.parse(emptyJournalDisplay())).toEqual(emptyJournalDisplay());
    expect(MAX_ENTRY_PHOTOS_ALL).toBe(12);
  });
  test('the media sweep and Export everything name photos five to twelve', () => {
    expect(namedMedia(R4_JOURNAL.entries)).toEqual(ids(12));
  });
});
describe('Export everything → erase → Restore keeps them', () => {
  const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  const value = (part: PlannedPart, mode: 'replace' | 'merge', current?: unknown) => { const next = nextValue(part, mode, current); if ('error' in next) throw Error(next.error); return next.value; };
  test('Replace on an erased device, and Merge into an empty journal', async () => {
    const display = {version: 1, memoryNotify: true};
    const zip = buildEverythingZip(collectEverything({[JOURNAL_KEY]: JSON.stringify(R4_JOURNAL), [JOURNAL_DISPLAY_KEY]: JSON.stringify(display)}, APP), {date: '2026-11-22', showcase: false, now: NOW});
    const parts = planParts((await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]))).json);
    const journal = parts.find(p => p.id === 'device:journal')!, shown = parts.find(p => p.id === 'device:journalDisplay')!;
    expect(journalSchema.parse(value(journal, 'replace'))).toEqual(R4_JOURNAL);
    expect(journalSchema.parse(value(journal, 'merge', emptyJournal())).entries).toEqual(R4_JOURNAL.entries);
    expect(journalDisplaySchema.parse(value(shown, 'replace'))).toEqual(display);
  });
});
describe('the journal’s own ZIP (Day One’s shape)', () => {
  test('a starred entry and twelve photos go out and come back in', () => {
    const media = new Map<string, MediaFile>(ids(12).map(id => [id, {data: new Uint8Array([1, 2, 3]), type: 'image/jpeg'}]));
    const files = journalExportFiles(R4_JOURNAL, media, {now: new Date(AT)});
    const json = JSON.parse(files.find(f => f.name === 'journal.json')!.data as string) as {entries: {starred?: boolean; photos?: unknown[]}[]};
    expect(json.entries.map(e => e.starred ?? false)).toEqual([true, false, false]);
    expect(json.entries[1]!.photos).toHaveLength(12);
    expect(files.filter(f => f.name.startsWith('Markdown/')).map(f => f.data as string).find(t => t.includes('favourite'))).toContain('starred: true');
    const plan = planJournalImport(emptyJournal(), [{name: 'journal.json', text: files[0]!.data as string}], {today: '2026-11-22', zone: 'UTC'});
    const kept = new Map(plan.entries.flatMap(e => e.photos).map((f, i) => [f, `m-kept${String(i).padStart(4, '0')}`]));
    const out = applyJournalImport(emptyJournal(), plan, kept, (() => { let n = 0; return () => `imp-${n++}`; })()).journal;
    expect(out.entries.map(e => e.star ?? null)).toEqual([true, null, null]);
    const walk = out.entries.find(e => e.text.startsWith('A fictional walk'))!;
    expect(walk.photos).toHaveLength(4);
    expect(walk.morePhotos).toHaveLength(8);
  });
  test('a starred entry in a Markdown file from ZIGoals comes back starred', () => {
    const files = journalExportFiles(R4_JOURNAL, new Map(), {now: new Date(AT)}).filter(f => f.name.startsWith('Markdown/')).map(f => ({name: f.name, data: f.data as string}));
    const plan = planJournalImport(emptyJournal(), files.map(f => ({name: f.name, text: f.data})), {today: '2026-11-22', zone: 'UTC'});
    expect(plan.entries.map(e => e.extra?.star ?? null).sort()).toEqual([null, null, true].sort());
  });
});
