import {describe, expect, test} from 'vitest';
import {emptyNotes, notesSchema} from './schema';
import {ensureEventNote, eventKeyOf, eventNoteOf, EVENT_PROP} from './event-notes';
import {backlinks, linkIndex} from './links';
import {ensureDaily, removeNote} from './store';

/** Session AV lane 2 (r5-notes; LEDGER #364, Craft): a note for one day of an imported event, made once, under its day. */
const NOW = '2026-11-04T09:00:00.000Z';
describe('a note for a calendar event', () => {
  test('the key of one day of an event', () => {
    expect(eventKeyOf('event:cal-1:swim-1:2026-11-04')).toBe('cal-1:swim-1:2026-11-04');
    expect(eventKeyOf('event:cal-1:trip:2026-11-06:2')).toBe('cal-1:trip:2026-11-06');
  });
  test('made once, named after the event and its day, linking the day; a second tap finds it', () => {
    const key = 'cal-1:swim-1:2026-11-04';
    const a = ensureEventNote(ensureDaily(emptyNotes(), '2026-11-04', NOW).record, {key, title: 'Fictional [[swim]]', day: '2026-11-04', now: NOW});
    expect(a.made).toBe(true);
    expect(a.record.notes[1]).toMatchObject({kind: 'topic', title: 'Fictional swim · 2026-11-04', body: '[[2026-11-04]]\n\n', props: [{k: EVENT_PROP, t: 'text', v: key}]});
    const b = ensureEventNote(a.record, {key, title: 'Fictional swim', day: '2026-11-04', now: NOW});
    expect(b.made).toBe(false); expect(b.note.id).toBe(a.note.id);
    const day = a.record.notes[0]!, idx = linkIndex({notes: a.record.notes});
    expect(backlinks(a.record.notes, {kind: 'note', id: day.id}, idx).map(n => n.title)).toEqual(['Fictional swim · 2026-11-04']);
    expect(eventNoteOf(removeNote(a.record, a.note.id).record, key)).toBeNull();
    const other = ensureEventNote(notesSchema.parse({...a.record}), {key: 'cal-1:swim-2:2026-11-04', title: 'Fictional swim', day: '2026-11-04', now: NOW});
    expect(other.note.title).toBe('Fictional swim · 2026-11-04 (2)');
  });
});
