import {describe, expect, test} from 'vitest';
import {HOW_TOS, howToOf, MUSCLES} from './howto';
import {EXERCISES} from './library';
import {pinnedNoteOf, setPinnedNote, setRoutineNote} from './notes';
import {emptyWorkouts, templateSchema, type Workouts} from './schema';
import {GUIDES, guideLine, guideOf, guideRoutine, routineLang} from './routine-library';
import {folderNames, routineGroups, saveGuide, setRoutineFolder} from './routines';

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

describe('the ready-made routines (LEDGER #112, #115)', () => {
  const now = new Date('2026-11-20T08:00:00.000Z');
  test('every routine names built-in exercises, in both languages, and becomes a valid routine', () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(12);
    for (const g of GUIDES) {
      for (const x of g.exercises) { expect(howToOf(x.exerciseId), `${g.id}: ${x.exerciseId}`).not.toBeNull(); expect(x.cue.nl).not.toEqual(x.cue.en); }
      for (const lang of ['en', 'nl'] as const) expect(() => templateSchema.parse({...guideRoutine(g, lang), id: 'routine-x', createdAt: now.toISOString()}), g.id).not.toThrow();
    }
  });
  test('saving one copies it into a folder once per language; it starts like any routine', () => {
    const g = guideOf('full-body-a')!;
    const first = saveGuide(emptyWorkouts(), g, 'en', now), again = saveGuide(first.workouts, g, 'en', now), nl = saveGuide(again.workouts, g, 'nl', now);
    expect(first.added).toBe(true); expect(again.added).toBe(false); expect(nl.added).toBe(true);
    expect(first.routine).toMatchObject({name: 'Full body A', folder: 'Gym', guideId: 'full-body-a', progression: {kind: 'double', minReps: 8, maxReps: 12}});
    expect(nl.routine).toMatchObject({name: 'Heel lichaam A', folder: 'Sportschool'});
    expect(first.routine.exercises[0]).toMatchObject({exerciseId: 'squat', restSeconds: 120, sets: [{reps: 8}, {reps: 8}, {reps: 8}]});
    expect(first.routine.exercises[3]!.sets[0]).toMatchObject({seconds: 30});
    expect(guideLine(g.exercises[0]!, 'en')).toBe('3 × 8 · rest 2:00');
    expect(guideLine(g.exercises[3]!, 'nl')).toBe('3 × 30 s · rust 1:00');
    expect(routineLang(g, 'Heel lichaam A')).toBe('nl');
  });
  test('folders: the same name typed another way is one folder; routines grouped, no folder last', () => {
    let w = saveGuide(emptyWorkouts(), guideOf('core-ten')!, 'en', now).workouts;
    w = saveGuide(w, guideOf('full-body-a')!, 'en', now).workouts;
    const core = w.templates.find(t => t.guideId === 'core-ten')!;
    w = setRoutineFolder(w, core.id, ' gym ');
    expect(w.templates.find(t => t.id === core.id)!.folder).toBe('Gym');
    expect(folderNames(w)).toEqual(['Gym']);
    w = setRoutineFolder(w, core.id, '');
    expect(routineGroups(w).map(g => [g.folder, g.routines.length])).toEqual([['Gym', 1], [null, 1]]);
  });
});
