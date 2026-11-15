import {describe, expect, it} from 'vitest';
import {formatDate, formatTime} from '../../visual-format';
import {noteRowName, noteRowWhen, recentNotes} from './lists';

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
});
