import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {NOTE_LOOK_COLOURS, notesSchema} from './schema';
import {updateNote} from './store';
import {shownOf} from './lock';

/**
 * Session AV lane 2 (r5-notes; LEDGER #367, Craft's page look): a note's cover (one of its own photos) and page colour,
 * shown in the reading view only, as a light tint over the theme's own page.
 */
const AT = '2026-11-20T09:00:00.000Z';
const rec = notesSchema.parse({version: 1, voice: false, notes: [{id: 'n1', kind: 'topic', title: 'Fictional trip', body: 'Plans.', photoId: 'p-1', createdAt: AT}]});
const css = readFileSync(join(__dirname, '../../components/notes/notes.css'), 'utf8');

describe('a note’s look', () => {
  test('set and cleared on the loose note; nothing of a locked note’s look is shown', () => {
    const a = updateNote(rec, 'n1', {look: {cover: 'p-1', colour: 'sky'}}, AT, 'UTC');
    expect(a.notes[0]!.look).toEqual({cover: 'p-1', colour: 'sky'});
    expect(a.notes[0]!.body).toBe('Plans.');
    expect('look' in updateNote(a, 'n1', {look: {}}, AT, 'UTC').notes[0]!).toBe(false);
    expect(shownOf({...a.notes[0]!, locked: true}).look).toBeUndefined();
  });
  test('every colour has its tint; the words keep the theme’s own colour (no text colour is set)', () => {
    for (const c of NOTE_LOOK_COLOURS) expect(css, c).toMatch(new RegExp(`\\.note-page\\[data-look="${c}"\\][^{]*\\{ --look: #`));
    const rule = /\.note-page\[data-look\] \{([^}]*)\}/.exec(css)![1]!;
    expect(rule).toMatch(/color-mix\(in srgb, var\(--look\) 13%, transparent\)/);
    expect(rule).not.toMatch(/(^|;)\s*color:/);
  });
});
