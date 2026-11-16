import {describe, expect, it} from 'vitest';
import {formatDate, formatTime} from '../../visual-format';
import {noteRowName, noteRowWhen, notesPanel, recentNotes} from './lists';

/** Session AM-2 (the critic's Notes inbox): a row never shows raw ISO, and an untitled note has a name. */
const ISO = /\d{4}-\d{2}-\d{2}/;
describe('a note\'s row on NOVA: its name and when it was captured', () => {
  it('a daily note (titled with its day) reads as that date in the app\'s own format', () => {
    const name = noteRowName({kind: 'daily', title: '2026-11-11', body: 'Fictional words', day: '2026-11-11'});
    expect(name).toBe(formatDate('2026-11-11', {weekday: true}));
    expect(name).not.toMatch(ISO);
  });
  it('any other title that is only a day is written as a date too', () => {
    expect(noteRowName({kind: 'topic', title: '2026-11-11', body: ''})).toBe(formatDate('2026-11-11', {weekday: true}));
    expect(noteRowName({kind: 'topic', title: 'Plan for 2026-11-11', body: ''})).toBe('Plan for 2026-11-11');
  });
  it('an untitled note shows its first line, or "Untitled note"', () => {
    expect(noteRowName({kind: 'inbox', title: '', body: '\n# Fictional first line\nmore words'})).toBe('Fictional first line');
    expect(noteRowName({kind: 'topic', title: '  ', body: ''})).toBe('Untitled note');
    expect(noteRowName({kind: 'topic', title: 'Fictional title', body: 'words'})).toBe('Fictional title');
  });
  it('when: the time for a capture of today, else its date; never raw ISO', () => {
    const at = '2026-11-11T09:30:00.000Z';
    expect(noteRowWhen(at, '2026-11-11')).toBe(formatTime(at));
    expect(noteRowWhen(at, '2026-11-15')).toBe(formatDate(at, {year: false}));
    expect(noteRowWhen('2025-12-30T12:00:00.000Z', '2026-11-15')).toBe(formatDate('2025-12-30T12:00:00.000Z', {year: true}));
    for (const today of ['2026-11-11', '2026-11-15']) expect(noteRowWhen(at, today)).not.toMatch(ISO);
  });
  it('the newest captures carry the row\'s name', () => {
    const record = {version: 1, voice: false, notes: [
      {id: 'a', kind: 'daily', title: '2026-11-11', body: 'Fictional day', day: '2026-11-11', createdAt: '2026-11-11T08:00:00.000Z'},
      {id: 'b', kind: 'inbox', title: '', body: 'Fictional capture', createdAt: '2026-11-11T09:00:00.000Z'},
    ]} as unknown as Parameters<typeof recentNotes>[0];
    expect(recentNotes(record).recent.map(n => n.label)).toEqual(['Fictional capture', formatDate('2026-11-11', {weekday: true})]);
  });
  it('round 2: the panel\'s rows are the inbox, and "+N more" counts the inbox\'s notes not shown (never every other note)', () => {
    const note = (id: string, kind: string, at: string) => ({id, kind, title: kind === 'inbox' ? '' : `Fictional ${id}`, body: `Fictional ${id}`, createdAt: at});
    // Nine notes, two of them waiting in the inbox (the Showcase's shape: "2 in your inbox" over one row said "+7 more").
    const record = {version: 1, voice: false, notes: [
      ...Array.from({length: 7}, (_, i) => note(`t${i}`, 'topic', `2026-11-1${i}T10:00:00.000Z`)),
      note('older', 'inbox', '2026-11-11T08:00:00.000Z'), note('newer', 'inbox', '2026-11-12T08:00:00.000Z'),
    ]} as unknown as Parameters<typeof notesPanel>[0];
    const small = notesPanel(record, 2);
    expect(small).toMatchObject({of: 'inbox', inbox: 2, total: 9, more: 0});
    expect(small.rows.map(n => n.id)).toEqual(['newer', 'older']);
    // One row shown of the two rendered: the line says 1 (the rows not shown plus `more`), as the figure's 2 less the row in view.
    const shown = 1;
    expect(small.rows.length - shown + small.more).toBe(1);
    expect(notesPanel(record, 1)).toMatchObject({more: 1, rows: [{id: 'newer'}]});
    // An empty inbox: the newest notes of any kind, and the line counts the notes beyond them.
    const filed = {...record, notes: record.notes.filter(n => n.kind !== 'inbox')} as typeof record;
    expect(notesPanel(filed, 3)).toMatchObject({of: 'notes', inbox: 0, total: 7, more: 4});
    expect(notesPanel(filed, 3).rows.map(n => n.id)).toEqual(['t6', 't5', 't4']);
  });
});
