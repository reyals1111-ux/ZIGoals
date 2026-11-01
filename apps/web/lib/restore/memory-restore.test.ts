// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer';
import {afterEach, beforeEach, describe, expect, test} from 'vitest';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {AI_MEMORY_KEY} from '../ai/store/keys';
import {aiMemorySchema} from '../ai/store/records';
import {DEVICE_PARTS, MERGE_REFUSED_MESSAGE, NEVER_RESTORED, nextValue, planParts, summarizePart, type PlannedPart} from './plan';
import {openBackup} from './read-backup';
import {RESTORE_KEYS, applyRestore, forgetRestoreUndo, undoRestore} from './apply';

/**
 * Session AK WA (owner follow-up 2 N7; WIRING_AUDIT_2 N7): ZIGi's and NOVA's one memory (`zigoals:ai-memory:v1`) was in
 * Export everything and erased, but never restored. It restores now as two parts: the memory (Today and Life) and its
 * notes about health and diet (Health: only with the Health choice), each with Leave, Merge and Replace, and Undo.
 */
const NOW = new Date('2026-11-01T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
/**
 * FROZEN fixture (do not edit): `zigoals:ai-memory:v1` as builds wrote it — a Session V note (no kind), a Session AI note
 * with `paused`, a Session AF consent, and Session AK NOVA notes with kind, pin, who proposed it and the day it is about.
 */
const FROZEN_MEMORY = Object.freeze({version: 1, consent: {given: true, at: '2026-09-01T08:00:00.000Z'}, notes: [
  {id: 'note_v1', text: 'Prefers short answers', category: 'preferences', source: 'person', createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z'},
  {id: 'note_ai1', text: 'Training for a 10 km run in spring', category: 'goals', source: 'zigi', paused: true, createdAt: '2026-09-02T08:00:00.000Z', updatedAt: '2026-09-03T08:00:00.000Z'},
  {id: 'note_ak1', text: 'Sam is my running partner', category: 'other', source: 'zigi', kind: 'person', pinned: true, from: {by: 'nova', label: 'NOVA chat'}, about: '2026-10-20', createdAt: '2026-10-20T08:00:00.000Z', updatedAt: '2026-10-20T08:00:00.000Z'},
  {id: 'note_h1', text: 'Allergic to peanuts', category: 'health', source: 'person', kind: 'context', createdAt: '2026-10-21T08:00:00.000Z', updatedAt: '2026-10-21T08:00:00.000Z'},
  {id: 'note_d1', text: 'Eats vegetarian on weekdays', category: 'diet', source: 'person', createdAt: '2026-10-22T08:00:00.000Z', updatedAt: '2026-10-22T08:00:00.000Z'},
]});
const ids = (v: unknown) => aiMemorySchema.parse(v).notes!.map(n => n.id).sort();
const backup = async (memory: unknown = FROZEN_MEMORY) => {
  const zip = buildEverythingZip(collectEverything({[AI_MEMORY_KEY]: JSON.stringify(memory)}, APP), {date: '2026-11-01', showcase: false, now: NOW});
  return openBackup(new NodeBlob([zip.bytes]) as unknown as Blob);
};
const byId = (parts: PlannedPart[], id: string) => parts.find(p => p.id === id)!;
Object.defineProperty(navigator, 'locks', {configurable: true, value: {request: async (_key: string, work: () => unknown) => work()}});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });
afterEach(() => { localStorage.clear(); sessionStorage.clear(); forgetRestoreUndo(); });

describe('ZIGi\'s and NOVA\'s memory in Restore', () => {
  test('the frozen record still reads, and the file offers two parts: the memory, and its health and diet notes under Health', async () => {
    expect(aiMemorySchema.safeParse(FROZEN_MEMORY).success).toBe(true);
    const opened = await backup(), parts = planParts(opened.json);
    const life = byId(parts, 'device:aiMemory'), health = byId(parts, 'device:aiMemoryHealth');
    expect(life).toMatchObject({group: 'Today and Life', health: false, key: AI_MEMORY_KEY});
    expect(health).toMatchObject({group: 'Health', health: true, key: AI_MEMORY_KEY, label: 'Memory notes about health and diet (ZIGi and NOVA)'});
    expect(ids(life.value)).toEqual(['note_ai1', 'note_ak1', 'note_v1']);
    expect(ids(health.value)).toEqual(['note_d1', 'note_h1']);
    expect((life.value as {consent?: unknown}).consent).toEqual(FROZEN_MEMORY.consent);
    expect((health.value as {consent?: unknown}).consent).toBeUndefined();
    expect(life.summary!.counts).toBe('3 records'); expect(health.summary!.counts).toBe('2 records');
    expect(summarizePart(health, {version: 1, notes: [FROZEN_MEMORY.notes[0]]})).toEqual({counts: 'No notes', from: null, through: null});
    expect(RESTORE_KEYS).toContain(AI_MEMORY_KEY);
    expect(NEVER_RESTORED).not.toMatch(/ZIGi’s settings, notes/);
    expect(DEVICE_PARTS.filter(p => p.key === AI_MEMORY_KEY).map(p => p.id)).toEqual(['device:aiMemory', 'device:aiMemoryHealth']);
  });
  test('a file with no health note offers no Health part; an empty memory offers nothing', async () => {
    const noHealth = {version: 1, notes: FROZEN_MEMORY.notes.slice(0, 2)};
    expect(planParts((await backup(noHealth)).json).map(p => p.id)).toEqual(['device:aiMemory']);
    expect(planParts((await backup({version: 1})).json).map(p => p.id)).toEqual([]);
  });
  test('Merge adds only the notes this device lacks; a note this device holds keeps its own words; health only through its own part', async () => {
    const parts = planParts((await backup()).json), life = byId(parts, 'device:aiMemory'), health = byId(parts, 'device:aiMemoryHealth');
    const device = {version: 1, consent: {given: false, at: '2026-10-30T08:00:00.000Z'}, notes: [{...FROZEN_MEMORY.notes[0], text: 'Prefers very short answers'}, {id: 'note_new', text: 'Mornings are best', category: 'schedule', source: 'person', createdAt: '2026-10-30T08:00:00.000Z', updatedAt: '2026-10-30T08:00:00.000Z'}]};
    const merged = nextValue(life, 'merge', device) as {value: {notes: {id: string; text: string}[]; consent: unknown}};
    expect(ids(merged.value)).toEqual(['note_ai1', 'note_ak1', 'note_new', 'note_v1']);
    expect(merged.value.notes.find(n => n.id === 'note_v1')!.text).toBe('Prefers very short answers');
    expect(merged.value.consent).toEqual(device.consent);
    const withHealth = nextValue(health, 'merge', merged.value) as {value: unknown};
    expect(ids(withHealth.value)).toEqual(['note_ai1', 'note_ak1', 'note_d1', 'note_h1', 'note_new', 'note_v1']);
    expect(nextValue(health, 'merge', undefined)).toEqual({value: {version: 1, notes: [FROZEN_MEMORY.notes[3], FROZEN_MEMORY.notes[4]]}});
  });
  test('Replace takes the backup\'s share and leaves the other share of this device exactly as it is', async () => {
    const parts = planParts((await backup()).json), life = byId(parts, 'device:aiMemory'), health = byId(parts, 'device:aiMemoryHealth');
    const mine = {id: 'note_mine_h', text: 'Sleeps badly after late coffee', category: 'health', source: 'person', createdAt: '2026-10-31T08:00:00.000Z', updatedAt: '2026-10-31T08:00:00.000Z'};
    const other = {id: 'note_mine', text: 'Works Tuesdays from home', category: 'schedule', source: 'person', createdAt: '2026-10-31T08:00:00.000Z', updatedAt: '2026-10-31T08:00:00.000Z'};
    const device = {version: 1, notes: [mine, other]};
    expect(ids((nextValue(life, 'replace', device) as {value: unknown}).value)).toEqual(['note_ai1', 'note_ak1', 'note_mine_h', 'note_v1']);
    expect(ids((nextValue(health, 'replace', device) as {value: unknown}).value)).toEqual(['note_d1', 'note_h1', 'note_mine']);
    // Over the 100 notes ZIGi keeps: refused, nothing written.
    const full = {version: 1, notes: Array.from({length: 99}, (_, i) => ({...other, id: `n${i}`, text: `Note ${i}`}))};
    expect(nextValue(life, 'merge', full)).toEqual({error: MERGE_REFUSED_MESSAGE});
  });
  test('applied without the Health choice, no health note comes back; Undo puts back exactly what was there', async () => {
    const opened = await backup(), parts = planParts(opened.json);
    const before = JSON.stringify({version: 1, notes: [{id: 'note_here', text: 'Likes walks', category: 'preferences', source: 'person', createdAt: '2026-10-31T08:00:00.000Z', updatedAt: '2026-10-31T08:00:00.000Z'}]});
    localStorage.setItem(AI_MEMORY_KEY, before);
    const outcome = await applyRestore(opened, [{part: byId(parts, 'device:aiMemory'), mode: 'merge'}], {vision: false, progress: false});
    expect(outcome).toMatchObject({restored: ['Memory for ZIGi and NOVA'], failed: [], health: false});
    const now = JSON.parse(localStorage.getItem(AI_MEMORY_KEY)!);
    expect(ids(now)).toEqual(['note_ai1', 'note_ak1', 'note_here', 'note_v1']);
    expect(JSON.stringify(now)).not.toMatch(/peanuts|vegetarian/);
    // With the Health choice too: both parts, the same key, two steps; Undo goes back newest first, to the exact bytes.
    forgetRestoreUndo(); localStorage.setItem(AI_MEMORY_KEY, before);
    const both = await applyRestore(opened, [{part: byId(parts, 'device:aiMemory'), mode: 'replace'}, {part: byId(parts, 'device:aiMemoryHealth'), mode: 'merge'}], {vision: false, progress: false});
    expect(both).toMatchObject({restored: ['Memory for ZIGi and NOVA', 'Memory notes about health and diet (ZIGi and NOVA)'], failed: [], health: true});
    expect(ids(JSON.parse(localStorage.getItem(AI_MEMORY_KEY)!))).toEqual(['note_ai1', 'note_ak1', 'note_d1', 'note_h1', 'note_v1']);
    expect(await undoRestore()).toEqual({failed: [], kept: [], missing: []});
    expect(localStorage.getItem(AI_MEMORY_KEY)).toBe(before);
  });
});
