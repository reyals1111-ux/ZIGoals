import {describe, expect, test} from 'vitest';
import {emptyHabitExtras, habitExtrasSchema} from '../habits-extras/schema';
import {CHECKLIST_MAX_ITEMS, checklistLine, checklistToday, habitChecklist, setChecklistSteps, stepsFromLines, tickStep} from './checklist';

const D1 = '2026-11-08', D2 = '2026-11-09', H = 'habit-1';

describe('AL-COMPETITOR-GAP-105: a checklist inside a habit', () => {
  test('steps come from lines: blanks, bullets and repeats out; the limit is said', () => {
    expect(stepsFromLines('- Make the bed\n\n2) Stretch\n• glass of water\nstretch\n')).toEqual(['Make the bed', 'Stretch', 'glass of water']);
    expect(() => stepsFromLines(Array.from({length: CHECKLIST_MAX_ITEMS + 1}, (_, i) => `Step ${i}`).join('\n'))).toThrow(`at most ${CHECKLIST_MAX_ITEMS} steps; this list has ${CHECKLIST_MAX_ITEMS + 1}`);
  });
  test('ticks belong to today only; the last tick reads as all done', () => {
    let r = setChecklistSteps(emptyHabitExtras(), H, ['Make the bed', 'Stretch'], D1);
    const [a, b] = habitChecklist(r, H)!.items;
    r = tickStep(r, H, a!.id, D1, true);
    expect(checklistLine(checklistToday(r, H, D1)!)).toBe('1 of 2 steps today');
    r = tickStep(r, H, b!.id, D1, true);
    expect(checklistToday(r, H, D1)).toMatchObject({done: 2, total: 2, all: true});
    expect(checklistLine(checklistToday(r, H, D1)!)).toBe('All 2 steps done today');
    // The next day starts with every step open.
    expect(checklistToday(r, H, D2)).toMatchObject({done: 0, all: false});
    r = tickStep(r, H, a!.id, D1, false);
    expect(checklistToday(r, H, D1)!.done).toBe(1);
    expect(() => tickStep(r, H, 'nope', D1, true)).toThrow('no longer in the habit');
  });
  test('editing keeps a kept step’s id and tick; removing all steps removes the checklist', () => {
    let r = setChecklistSteps(emptyHabitExtras(), H, ['Make the bed', 'Stretch'], D1);
    const bed = habitChecklist(r, H)!.items[0]!;
    r = tickStep(r, H, bed.id, D1, true);
    r = setChecklistSteps(r, H, ['Stretch', 'make the bed', 'Water'], D1);
    const items = habitChecklist(r, H)!.items;
    expect(items.map(i => i.text)).toEqual(['Stretch', 'make the bed', 'Water']);
    expect(items[1]!.id).toBe(bed.id);
    expect(checklistToday(r, H, D1)!.ticked.has(bed.id)).toBe(true);
    r = setChecklistSteps(r, H, [], D1);
    expect(habitChecklist(r, H)).toBeNull();
    expect('checklists' in r).toBe(false);
  });
  test('stored format: additive and loose; an odd entry is left out, never making the record unreadable', () => {
    const stored = habitExtrasSchema.parse({version: 1, checklists: {[H]: {items: [{id: 's1', text: 'Stretch', later: 1}], day: D1, ticked: ['s1'], future: true}, odd: {items: 'nope'}}, laterField: 1});
    expect(stored).toMatchObject({laterField: 1});
    expect(habitChecklist(stored, 'odd')).toBeNull();
    expect(checklistToday(stored, H, D1)).toMatchObject({done: 1, all: true});
    // A write on one habit keeps a later build's fields of another entry, and prunes habits the journal no longer has.
    const next = setChecklistSteps(stored, 'habit-2', ['Read'], D1, new Set([H, 'habit-2']));
    expect(Object.keys(next.checklists as object).sort()).toEqual([H, 'habit-2']);
    expect((next.checklists as Record<string, {future?: boolean}>)[H]!.future).toBe(true);
  });
});
