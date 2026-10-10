import {describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, habitDataSchema, logHabitValue, type HabitData} from './habits';
import {scheduleHabitState} from './habit-actions';
import {DELETED_HABIT_MARK, isDeletedHabit, withoutDeletedHabits} from './habit-delete';
import {deleteHabitForGood, undoDeleteHabit} from './habit-delete-write';
import {validateData} from './vault/account-data';
import {mergePrivateData} from './vault/cloud-sync';

// Session Z-Cloud Part 4.6 (ADR-019 C25): "Delete for good" leaves a nameless shell every reader accepts.
const A = '2f0c8d6e-1a2b-4c3d-8e9f-0a1b2c3d4e5f', B = '7b6a5c4d-3e2f-4a1b-9c8d-7e6f5a4b3c2d';
const T0 = new Date('2026-09-01T09:00:00.000Z'), T1 = new Date('2026-09-20T09:00:00.000Z'), T2 = new Date('2026-09-25T09:00:00.000Z');
function journal(): HabitData {
  let data = createHabit(emptyHabitData(), {title: 'Smoke-free evenings', category: 'Health', description: 'Private reason', notes: 'Very private notes', type: 'quit', measurement: {kind: 'count', unit: 'cigarettes'}, target: 0, schedule: {kind: 'daily'}, goalLink: {chainId: 'private', owner: 'local', goalId: '7'}}, T0, A);
  data = createHabit(data, {title: 'Read', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, stackAfterId: A}, T0, B);
  data = logHabitValue(data, A, '2026-09-02', 0, {note: 'a hard day'}, T1);
  return scheduleHabitState(data, A, 'archived', '2026-09-21', T1);
}

describe('Delete for good', () => {
  it('keeps a nameless archived shell: the name, notes, check-ins, links and stacking go; the rule history stays', () => {
    const before = journal(), {data: after} = deleteHabitForGood(before, A, T2);
    const shell = after.habits.find(h => h.id === A)!, original = before.habits.find(h => h.id === A)!;
    expect(isDeletedHabit(shell)).toBe(true);
    expect(shell).toMatchObject({title: 'Deleted habit', category: 'Deleted', description: '', entries: [], timeOfDay: 'anytime', createdAt: original.createdAt, startDate: original.startDate});
    expect(shell.notes.startsWith(DELETED_HABIT_MARK)).toBe(true);
    expect(JSON.stringify(shell)).not.toMatch(/Smoke-free|Private reason|Very private|a hard day/);
    expect(shell.goalLink).toBeUndefined();
    expect(shell.ruleRevisions).toEqual(original.ruleRevisions);
    expect(after.habits.find(h => h.id === B)!.stackAfterId).toBeUndefined();
    expect(withoutDeletedHabits(after).habits.map(h => h.id)).toEqual([B]);
    expect(habitDataSchema.parse(after)).toEqual(after);
  });
  it('sync accepts the shell where it refuses a removed habit (accepted rule revisions are append-only)', () => {
    const before = journal(), {data: after} = deleteHabitForGood(before, A, T2);
    expect(() => validateData({habits: JSON.stringify(after)}, {habits: JSON.stringify(before)})).not.toThrow();
    // Removing it instead (with its stack cleared, so the record itself is valid) is refused by every reader's sync.
    const removed = {...before, habits: before.habits.filter(h => h.id !== A).map(h => { const rest = {...h}; delete rest.stackAfterId; return rest; })};
    expect(() => validateData({habits: JSON.stringify(removed)}, {habits: JSON.stringify(before)})).toThrow(/append-only/);
  });
  it('the merge carries a deletion to a device that did not touch the habit, and an edit on the other side is a conflict to review', () => {
    const base = journal(), {data: deleted} = deleteHabitForGood(base, A, new Date('2026-09-25T09:01:00.000Z'));
    const merged = mergePrivateData({habits: JSON.stringify(base)}, {habits: JSON.stringify(base)}, {habits: JSON.stringify(deleted)});
    expect(isDeletedHabit(JSON.parse(merged.habits!).habits.find((h: {id: string}) => h.id === A))).toBe(true);
    const edited = scheduleHabitState(base, A, 'active', '2026-09-26', T2);
    expect(() => mergePrivateData({habits: JSON.stringify(base)}, {habits: JSON.stringify(edited)}, {habits: JSON.stringify(deleted)})).toThrow(/Conflicting/);
  });
  it('only an archived habit can be deleted, once', () => {
    const data = journal();
    expect(() => deleteHabitForGood(data, B, T2)).toThrow(/Archive the habit first/);
    const {data: after} = deleteHabitForGood(data, A, T2);
    expect(() => deleteHabitForGood(after, A, T2)).toThrow(/no longer available/);
  });
  it('Undo puts the habit and its stack back while nothing changed since; afterwards it refuses', () => {
    const before = journal(), {data: after, deleted} = deleteHabitForGood(before, A, T2);
    expect(undoDeleteHabit(after, deleted)).toEqual(habitDataSchema.parse({...before, habits: before.habits.map(h => h.id === B ? {...h, updatedAt: after.habits.find(x => x.id === B)!.updatedAt} : h)}));
    const touched = {...after, habits: after.habits.map(h => h.id === A ? {...h, updatedAt: '2026-09-26T09:00:00.000Z'} : h)};
    expect(() => undoDeleteHabit(touched, deleted)).toThrow(/changed since/);
  });
  it('a habit a person named "Deleted habit" is never taken for a shell', () => {
    const data = createHabit(emptyHabitData(), {title: 'Deleted habit', category: 'Deleted', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, T0, A);
    expect(isDeletedHabit(data.habits[0]!)).toBe(false);
    expect(withoutDeletedHabits(data)).toBe(data);
  });
});
