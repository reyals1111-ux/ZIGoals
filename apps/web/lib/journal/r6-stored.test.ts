import {describe, expect, test} from 'vitest';
import {JOURNAL_KEY, MAX_PEOPLE, emptyJournal, journalSchema, type Journal} from './schema';
import {JOURNAL_DISPLAY_KEY, emptyJournalDisplay, journalDisplaySchema} from '../on-this-day/store';
import {NOTES_KEY, emptyNotes, notesSchema, type Notes} from '../notes/schema';
import {updateNote} from '../notes/store';
import {shownOf} from '../notes/lock';
import {journalExportFiles} from './export';
import {applyJournalImport, planJournalImport} from './import';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

/**
 * Session AV lane 2 (r6-notes; TIER 3 (stored format), additive and optional): a daily note's `readBack` (LEDGER #402),
 * the journal's `wordGoal` (#400), an entry's `people` (#401), the import sources `journey` and `csv` (#410), and the
 * "On this day" record's `sky` place (#409) — each read on its own (a value this build cannot read is dropped, never
 * failing the record), older records read as before, Export everything → erase → Restore gives each back, and the
 * journal's own ZIP carries the people out and back in.
 */
const AT = '2026-11-20T09:00:00.000Z';
export const R6_JOURNAL: Journal = journalSchema.parse({
  version: 1, shareWithAi: false, followUps: true, wordGoal: 200,
  entries: [
    {id: 'p1', date: '2026-11-20', text: 'A fictional walk by the river.', createdAt: AT, people: ['Fictional Anna', 'Fictional Bram']},
    {id: 'j1', date: '2026-11-21', text: 'A fictional imported day.', createdAt: AT, imported: 'journey'},
    {id: 'c1', date: '2026-11-22', text: 'A fictional row of a table.', createdAt: AT, imported: 'csv'},
  ],
});
export const R6_DISPLAY = journalDisplaySchema.parse({version: 1, sky: {lat: 52.37, lon: 4.9, name: 'Fictional town'}});
export const R6_NOTES: Notes = notesSchema.parse({version: 1, voice: false, notes: [{id: 'd1', kind: 'daily', title: '2026-11-20', day: '2026-11-20', body: 'A fictional day.', readBack: '2026-11-22', createdAt: AT}]});

describe('the round-6 fields read on their own', () => {
  test('a full record keeps them', () => {
    expect(R6_JOURNAL.wordGoal).toBe(200);
    expect(R6_JOURNAL.entries.map(e => [e.people ?? null, e.imported ?? null])).toEqual([[['Fictional Anna', 'Fictional Bram'], null], [null, 'journey'], [null, 'csv']]);
    expect(R6_DISPLAY.sky).toEqual({lat: 52.37, lon: 4.9, name: 'Fictional town'});
    expect(R6_NOTES.notes[0]!.readBack).toBe('2026-11-22');
  });
  test('a value this build cannot read is dropped, never failing the record', () => {
    const odd = journalSchema.parse({...R6_JOURNAL, wordGoal: 3, entries: [{...R6_JOURNAL.entries[0], people: ['  Fictional  Anna ', 7, '', 'x'.repeat(41), ...Array.from({length: 12}, (_, i) => `P${i}`)]}, {...R6_JOURNAL.entries[1], imported: 'somewhere'}, {...R6_JOURNAL.entries[2], people: 'Anna'}]});
    expect(odd.wordGoal).toBeUndefined();
    expect(odd.entries[0]!.people).toHaveLength(MAX_PEOPLE);
    expect(odd.entries[0]!.people![0]).toBe('Fictional Anna');
    expect(odd.entries[1]!.imported).toBeUndefined();
    expect(odd.entries[2]!.people).toBeUndefined();
    expect(journalSchema.parse({...R6_JOURNAL, wordGoal: 99999}).wordGoal).toBeUndefined();
    expect(journalDisplaySchema.parse({version: 1, sky: {lat: 200, lon: 'east', city: 'Amsterdam!'}}).sky).toEqual({});
    expect(journalDisplaySchema.parse({version: 1, sky: 'here'}).sky).toBeUndefined();
    expect(notesSchema.parse({...R6_NOTES, notes: [{...R6_NOTES.notes[0], readBack: 'yesterday'}]}).notes[0]!.readBack).toBeUndefined();
  });
  test('records from earlier releases read as before; clearing a read back takes it off; a locked note keeps only its mark', () => {
    const old = journalSchema.parse({version: 1, entries: [{id: 'e1', date: '2026-11-01', text: 'Old.', createdAt: AT, imported: 'dayone'}], shareWithAi: false, followUps: true});
    expect(old.entries[0]).toEqual({id: 'e1', date: '2026-11-01', text: 'Old.', createdAt: AT, imported: 'dayone'});
    expect(old.wordGoal).toBeUndefined();
    expect(journalSchema.parse(emptyJournal())).toEqual(emptyJournal());
    expect(journalDisplaySchema.parse(emptyJournalDisplay())).toEqual(emptyJournalDisplay());
    expect(notesSchema.parse(emptyNotes())).toEqual(emptyNotes());
    expect('readBack' in updateNote(R6_NOTES, 'd1', {readBack: undefined}, AT, 'UTC').notes[0]!).toBe(false);
    const locked = shownOf({...R6_NOTES.notes[0]!, locked: true});
    expect(locked.readBack).toBe('2026-11-22'); expect(locked.body).toBe('');
  });
});
describe('Export everything → erase → Restore keeps them', () => {
  const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  const value = (part: PlannedPart, mode: 'replace' | 'merge', current?: unknown) => { const next = nextValue(part, mode, current); if ('error' in next) throw Error(next.error); return next.value; };
  test('Replace on an erased device, and Merge into empty records', async () => {
    const zip = buildEverythingZip(collectEverything({[JOURNAL_KEY]: JSON.stringify(R6_JOURNAL), [JOURNAL_DISPLAY_KEY]: JSON.stringify(R6_DISPLAY), [NOTES_KEY]: JSON.stringify(R6_NOTES)}, APP), {date: '2026-11-22', showcase: false, now: NOW});
    const parts = planParts((await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]))).json);
    const journal = parts.find(p => p.id === 'device:journal')!, shown = parts.find(p => p.id === 'device:journalDisplay')!, notes = parts.find(p => p.id === 'device:notes')!;
    expect(journalSchema.parse(value(journal, 'replace'))).toEqual(R6_JOURNAL);
    expect(journalSchema.parse(value(journal, 'merge', emptyJournal())).entries).toEqual(R6_JOURNAL.entries);
    expect(journalDisplaySchema.parse(value(shown, 'replace'))).toEqual(R6_DISPLAY);
    expect(notesSchema.parse(value(notes, 'replace'))).toEqual(R6_NOTES);
    expect(notesSchema.parse(value(notes, 'merge', emptyNotes())).notes).toEqual(R6_NOTES.notes);
  });
});
describe('the journal’s own ZIP carries who was there', () => {
  test('out in journal.json and Markdown, and back in', () => {
    const files = journalExportFiles(R6_JOURNAL, new Map(), {now: new Date(AT)});
    const json = JSON.parse(files.find(f => f.name === 'journal.json')!.data as string) as {entries: {zigoals: {people?: string[]}}[]};
    expect(json.entries[0]!.zigoals.people).toEqual(['Fictional Anna', 'Fictional Bram']);
    const md = files.filter(f => f.name.startsWith('Markdown/')).map(f => ({name: f.name, text: f.data as string}));
    expect(md.find(f => f.text.includes('river'))!.text).toContain('people: ["Fictional Anna", "Fictional Bram"]');
    for (const set of [[{name: 'journal.json', text: files[0]!.data as string}], md]) {
      const plan = planJournalImport(emptyJournal(), set, {today: '2026-11-22', zone: 'UTC'});
      const out = applyJournalImport(emptyJournal(), plan, new Map(), (() => { let n = 0; return () => `imp-${n++}`; })()).journal;
      expect(out.entries.find(e => e.text.includes('river'))!.people).toEqual(['Fictional Anna', 'Fictional Bram']);
    }
  });
});
