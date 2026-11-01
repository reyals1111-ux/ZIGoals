import {expect, test} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {AI_MEMORY, aiMemorySchema, type AiMemory} from './store/records';
import {AI_MEMORY_KEY} from './store/keys';
import {HEALTH_HELD, SECRET_REFUSAL, addMemory, addNote, editMemory, memoryExport, memoryGroups, memoryKind, memorySource, notesForAi, pinnedFirst, setPinned} from './memory';

// Session AK (owner follow-up 2, N7): NOVA's long-term memory as optional fields of ZIGi's one memory.
const T0 = new Date('2026-10-01T08:00:00Z'), T1 = new Date('2026-10-02T08:00:00Z'), T2 = new Date('2026-10-03T08:00:00Z');
const OLD_NOTE = {id: 'note_a', text: 'I prefer short answers', category: 'preferences', source: 'person', createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z'};
const store = (value: unknown) => { const map = new Map([[AI_MEMORY_KEY, JSON.stringify(value)]]); return {getItem: (k: string) => map.get(k) ?? null}; };

test('backward compatible: a record from before NOVA reads unchanged; a NOVA note keeps every old field an older build needs', () => {
  const before = readDeviceRecord(store({version: 1, notes: [OLD_NOTE], consent: {given: true, at: '2026-09-01T08:00:00.000Z'}}), AI_MEMORY);
  expect(before.unreadable).toBe(false); expect(before.data.notes).toEqual([OLD_NOTE]);
  expect(memoryKind(before.data.notes![0]!)).toBe('preference');
  const added = addMemory(before.data, {text: 'Sam is my running partner', kind: 'person', source: 'zigi', by: 'nova', label: 'NOVA chat', about: '2026-10-01'}, T0, false, 'note_b');
  const note = added.notes!.find(n => n.id === 'note_b')!;
  // The old strict parts an older build checks: category in its list, source person|zigi, the two stamps.
  expect(note).toMatchObject({category: 'other', source: 'zigi', createdAt: T0.toISOString(), kind: 'person', from: {by: 'nova', label: 'NOVA chat'}, about: '2026-10-01'});
  // An older build's schema is the same loose note: it reads the new note and keeps the new fields on its write.
  const older = aiMemorySchema.parse(JSON.parse(JSON.stringify(added)));
  expect(older.notes!.find(n => n.id === 'note_b')).toMatchObject({kind: 'person', from: {by: 'nova'}});
  // A value this build cannot read is dropped, never the note or the record.
  const odd = readDeviceRecord(store({version: 1, notes: [{...OLD_NOTE, kind: 'pet', pinned: 'yes', from: {by: 'robot'}, about: 'soon', later: 1}]}), AI_MEMORY);
  expect(odd.unreadable).toBe(false);
  expect(odd.data.notes![0]).toMatchObject({id: 'note_a', later: 1}); expect(odd.data.notes![0]!.kind).toBeUndefined(); expect(odd.data.notes![0]!.pinned).toBeUndefined();
});
test('accepted only: the note rules hold; nothing about health is kept from a proposal while Health is not shared', () => {
  const empty: AiMemory = {version: 1};
  expect(() => addMemory(empty, {text: 'my password is hunter2', kind: 'context', source: 'person', by: 'person'}, T0, true)).toThrow(SECRET_REFUSAL);
  expect(() => addMemory(empty, {text: 'I take blood pressure medication', kind: 'context', source: 'zigi', by: 'nova'}, T0, false)).toThrow(HEALTH_HELD);
  expect(() => addMemory(empty, {text: 'Keep my diet low carb', kind: 'preference', source: 'zigi', by: 'zigi', category: 'diet'}, T0, false)).toThrow(HEALTH_HELD);
  // With Health shared, a proposal about health is kept, filed under Health (so it still travels only through the gate).
  const shared = addMemory(empty, {text: 'I take blood pressure medication', kind: 'context', source: 'zigi', by: 'nova'}, T0, true);
  expect(shared.notes![0]!.category).toBe('health');
  // The person's own note is always theirs; one that reads like health is filed under Health.
  const own = addMemory(empty, {text: 'I sleep badly after late coffee', kind: 'context', source: 'person', by: 'person'}, T0, false);
  expect(own.notes![0]!.category).toBe('health');
  expect(notesForAi({version: 1}, own)).toEqual([{text: 'I sleep badly after late coffee', category: 'health'}]);
  expect(() => addMemory(own, {text: 'i sleep  badly after late coffee', kind: 'context', source: 'person', by: 'person'}, T1, true)).toThrow(/already/);
});
test('edit, pin and the order: pinned first in the panel and to the AI; newest first otherwise, exactly as before', () => {
  let m = addNote({version: 1}, {text: 'First', category: 'preferences', source: 'person'}, T0, 'n1');
  m = addNote(m, {text: 'Second', category: 'goals', source: 'person'}, T1, 'n2');
  m = addNote(m, {text: 'Third', category: 'other', source: 'person'}, T2, 'n3');
  expect(notesForAi({version: 1}, m)!.map(n => n.text)).toEqual(['Third', 'Second', 'First']);
  m = setPinned(m, 'n1', true, new Date('2026-10-04T08:00:00Z'));
  expect(pinnedFirst(m.notes!).map(n => n.id)).toEqual(['n1', 'n3', 'n2']);
  expect(notesForAi({version: 1}, m)!.map(n => n.text)).toEqual(['First', 'Third', 'Second']);
  m = editMemory(m, 'n2', {text: 'Second, decided', kind: 'decision', about: '2026-10-02'}, new Date('2026-10-05T08:00:00Z'));
  expect(m.notes!.find(n => n.id === 'n2')).toMatchObject({text: 'Second, decided', kind: 'decision', category: 'goals', about: '2026-10-02'});
  m = editMemory(m, 'n2', {text: 'Second, decided', kind: 'person', about: null}, new Date('2026-10-06T08:00:00Z'));
  expect(m.notes!.find(n => n.id === 'n2')!.about).toBeUndefined(); expect(m.notes!.find(n => n.id === 'n2')!.category).toBe('other');
  expect(memoryGroups(m.notes!).map(g => [g.id, g.notes.map(n => n.id)])).toEqual([['pinned', ['n1']], ['person', ['n2']], ['context', ['n3']]]);
  expect(() => setPinned(m, 'gone', true, T2)).toThrow(/no longer/);
});
test('sources in words, and the export holds the person\'s words with kind, pin, source and dates only', () => {
  expect(memorySource({source: 'person'})).toBe('Written by you');
  expect(memorySource({source: 'zigi'})).toBe('Proposed by ZIGi, accepted by you');
  expect(memorySource({source: 'zigi', from: {by: 'nova', label: 'Workflow: Review my week'}})).toBe('Proposed by NOVA, accepted by you · Workflow: Review my week');
  const m = setPinned(addMemory({version: 1}, {text: 'Weekly review on Sundays', kind: 'decision', source: 'zigi', by: 'nova', about: '2026-10-01'}, T0, false, 'n1'), 'n1', true, T1);
  const file = JSON.parse(memoryExport(m, T2));
  expect(file).toEqual({format: 'zigoals-memory', version: 1, exportedAt: T2.toISOString(), notes: [{text: 'Weekly review on Sundays', kind: 'decision', category: 'goals', pinned: true, paused: false, source: 'Proposed by NOVA, accepted by you', about: '2026-10-01', createdAt: T0.toISOString(), updatedAt: T1.toISOString()}]});
  expect(JSON.stringify(file)).not.toMatch(/note_|"id"/);
});
