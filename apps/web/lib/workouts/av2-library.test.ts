import {describe, expect, test} from 'vitest';
import {HOW_TOS, howToOf, MUSCLES} from './howto';
import {EXERCISES} from './library';
import {pinnedNoteOf, setPinnedNote, setRoutineNote} from './notes';
import {emptyWorkouts, type Workouts} from './schema';

/** Session AV lane 2 (body; LEDGER #116, #119): every built-in exercise has a written how-to in both languages; notes. */
describe('the written how-tos', () => {
  test('one for every built-in exercise, none for an unknown id', () => {
    expect(HOW_TOS.map(h => h.id).sort()).toEqual(EXERCISES.map(e => e.id).sort());
    expect(howToOf('custom-abc')).toBeNull();
  });
  test('three steps and a tip in English and Dutch, a primary muscle, every muscle known', () => {
    for (const h of HOW_TOS) {
      expect(h.steps.en, h.id).toHaveLength(3);
      expect(h.steps.nl, h.id).toHaveLength(3);
      expect(h.primary.length, h.id).toBeGreaterThan(0);
      for (const m of [...h.primary, ...h.secondary]) expect(MUSCLES, h.id).toContain(m);
      for (const t of [...h.steps.en, ...h.steps.nl, h.tip.en, h.tip.nl, h.needs.en, h.needs.nl]) expect(t.trim().length, h.id).toBeGreaterThan(3);
      expect(h.steps.nl.join(' '), h.id).not.toEqual(h.steps.en.join(' '));
    }
  });
});
describe('pinned and routine notes', () => {
  test('pin, change and remove a note; the log stays valid', () => {
    let w = setPinnedNote(emptyWorkouts(), 'squat', '  Bars at 6  ');
    expect(pinnedNoteOf(w, 'squat')).toBe('Bars at 6');
    w = setPinnedNote(w, 'squat', 'Bars at 5');
    expect(w.pinnedNotes).toEqual({squat: 'Bars at 5'});
    w = setPinnedNote(w, 'squat', '');
    expect(w.pinnedNotes).toBeUndefined();
  });
  test('a routine note is set and removed; an unknown routine says so', () => {
    const at = '2026-11-20T08:00:00.000Z';
    let w: Workouts = {...emptyWorkouts(), templates: [{id: 'r1', name: 'Push', type: 'strength', createdAt: at, exercises: []}]};
    w = setRoutineNote(w, 'r1', 'Light week');
    expect(w.templates[0]!.note).toBe('Light week');
    expect(setRoutineNote(w, 'r1', ' ').templates[0]!.note).toBeUndefined();
    expect(() => setRoutineNote(w, 'nope', 'x')).toThrow('no longer here');
  });
});
