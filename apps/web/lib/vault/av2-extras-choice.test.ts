import {describe, expect, test} from 'vitest';
import {createVault} from './crypto';
import {RevisionConflict} from './cloud-sync';
import {EXTRAS_HEADS_QUERY, REMOVED_ELSEWHERE_NOTE, SERVICE_UPDATE_NOTE, chosenSections, deleteExtrasCopies, deleteExtrasSection, extrasHeadsQuery, extrasHeadsSchema, openSection, readExtrasChoice, readExtrasSectionsChoice, sealSection, sectionText, syncExtras, writeExtrasChoice, writeExtrasSectionChoice, type ExtrasBase, type ExtrasOutcome, type ExtrasTransport} from './extras-sync';
import {ALL_EXTRAS_SECTIONS, EXTRAS_CHOICE_SECTION_LIST, EXTRAS_SECTIONS, JOURNAL_DEVICE_FIELDS} from './extras-sections';
import {EXTRAS_CHOICE_DEVICE_KEYS, EXTRAS_CHOICE_KEY, EXTRAS_CHOICE_SECTIONS, EXTRAS_DEVICE_KEYS, EXTRAS_OPTIONAL_SECTIONS, stopsExtras} from './extras-keys';
import {JOURNAL_KEY, journalSchema} from '../journal/schema';
import {MONEY_LOG_KEY} from '../money-log/schema';
import {BILLS_KEY} from '../bills/schema';
import {BUDGETS_KEY} from '../budgets/schema';
import {WORKOUTS_KEY, emptyWorkouts} from '../workouts/schema';
import {WORKOUT_SPLITS_KEY} from '../workouts/splits-schema';
import {privateAccountRequest} from '../server/private-account';

/**
 * Session AV lane 2 (sync; LEDGER #41 Day One, #134 YNAB, #209 Strong; TIER 3 (sync)): the journal, the money records and
 * the workout log in the encrypted extras sync, each only once chosen on the device. An in-memory cloud with the Worker's
 * rules (compare-and-swap on the revision, a deletion counting a generation, the optional sections listed only when the
 * service knows them and they are asked for) stands in for private sync. Fictional records only.
 */
type Head = {revision: number; generation: number; epoch: number | null; parts: unknown[]};
const ALL = ['goals', 'life', 'habits', 'health', 'checklist', 'nova', 'journal', 'money', 'workouts'];
/** `known`: the sections this service knows (the one deployed today knows the first six). */
function memoryCloud(known: string[] = ALL) {
  const sections: Record<string, Head> = Object.fromEntries(ALL.map(s => [s, {revision: 0, generation: 0, epoch: null, parts: []}]));
  const calls: string[] = [], state = {known};
  const transport: ExtrasTransport = {
    heads: async chosen => {
      calls.push(`heads${chosen?.length ? ':' + chosen.join(',') : ''}`);
      const listed = ['goals', 'life', 'habits', 'health', 'checklist', 'nova', ...(chosen ?? [])].filter(s => state.known.includes(s));
      return {protocol: 1, sections: Object.fromEntries(listed.map(k => [k, {revision: sections[k]!.revision, generation: sections[k]!.generation, epoch: sections[k]!.epoch, parts: sections[k]!.parts.length}]))};
    },
    read: async section => { calls.push(`read:${section}`); if (!state.known.includes(section)) throw Error('INVALID_EXTRAS_REQUEST'); const h = sections[section]!; return {protocol: 1, section, revision: h.revision, generation: h.generation, epoch: h.epoch, parts: h.parts}; },
    write: async (op: unknown) => {
      const o = op as {action: 'put' | 'delete'; section: string; base: number; generation: number; epoch: number; parts: unknown[]};
      calls.push(`${o.action}:${o.section}`); if (!state.known.includes(o.section)) throw Error('INVALID_EXTRAS_REQUEST'); const h = sections[o.section]!;
      if (o.generation !== h.generation) throw Error('EXTRAS_DELETED');
      if (o.base !== h.revision) throw new RevisionConflict();
      sections[o.section] = o.action === 'put' ? {revision: h.revision + 1, generation: h.generation, epoch: o.epoch, parts: o.parts} : {revision: h.revision + 1, generation: h.generation + 1, epoch: null, parts: []};
      return {revision: sections[o.section]!.revision, generation: sections[o.section]!.generation};
    },
  };
  return {sections, calls, transport, state};
}
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear(), m} as Storage & {m: Map<string, string>}; }
function memoryBases() { const m = new Map<string, ExtrasBase>(); return {get: async (s: string) => m.get(s) ?? null, put: async (s: string, b: ExtrasBase) => { m.set(s, structuredClone(b)); }, clear: async () => m.clear(), m}; }
async function account(known?: string[]) {
  const vault = await createVault(), cloud = memoryCloud(known);
  const device = () => {
    const storage = memoryStorage(), bases = memoryBases(), input = {transport: cloud.transport, key: vault.key, manifest: vault.manifest, storage, bases: bases as never, fence: () => {}};
    return {storage, bases, sync: (health = true) => syncExtras({...input, health}), remove: (name: 'journal' | 'money' | 'workouts') => deleteExtrasSection(input, name), removeAll: () => deleteExtrasCopies(input)};
  };
  const cloudRecords = async (section: string) => { const h = cloud.sections[section]!; const text = await openSection(vault.key, vault.manifest, {protocol: 1, section: section as never, revision: h.revision, generation: h.generation, epoch: h.epoch, parts: h.parts}); return text === null ? null : (JSON.parse(text) as {records: Record<string, Record<string, unknown>>}).records; };
  /** Another build's device writes a section directly (sealed as that device would). */
  const put = async (section: 'journal' | 'money' | 'workouts', records: Record<string, unknown>) => { const h = cloud.sections[section]!; cloud.sections[section] = {revision: h.revision + 1, generation: h.generation, epoch: vault.manifest.epoch, parts: await sealSection(vault.key, vault.manifest, section, h.revision + 1, sectionText(records))}; };
  return {vault, cloud, device, cloudRecords, put};
}
const byState = (o: ExtrasOutcome[]) => Object.fromEntries(o.map(x => [x.section, x.state]));
const read = (d: {storage: Storage}, key: string) => JSON.parse(d.storage.getItem(key) ?? 'null');
const at = (n: number) => new Date(Date.UTC(2026, 10, 20, 8, 0, n)).toISOString();
const entry = (id: string, text: string, n = 0, more: Record<string, unknown> = {}) => ({id, date: '2026-11-20', text, createdAt: at(n), ...more});
const journal = (entries: unknown[], more: Record<string, unknown> = {}) => JSON.stringify({version: 1, entries, shareWithAi: false, followUps: true, ...more});
const spend = (id: string, amount: string, n = 0) => ({id, kind: 'expense', amount, currency: 'EUR', category: 'Groceries', date: '2026-11-20', createdAt: at(n)});
const workout = (id: string, name: string, n = 0) => ({id, name, date: '2026-11-20', type: 'strength', startedAt: at(n), endedAt: at(n + 1), exercises: []});
const SIX = {goals: 'unchanged', life: 'unchanged', habits: 'unchanged', health: 'unchanged', checklist: 'unchanged', nova: 'unchanged'};

describe('what the chosen sections carry, pinned', () => {
  test('three sections after the six, never among them; the journal and the money under the account consent, the workout log under Health\'s', () => {
    expect(EXTRAS_CHOICE_SECTIONS).toEqual(['journal', 'money', 'workouts']);
    expect(EXTRAS_CHOICE_SECTION_LIST.map(s => [s.name, s.consent])).toEqual([['journal', 'account'], ['money', 'account'], ['workouts', 'health']]);
    expect(ALL_EXTRAS_SECTIONS.map(s => s.name)).toEqual(ALL);
    expect(EXTRAS_SECTIONS.map(s => s.name)).toEqual(['goals', 'life', 'habits', 'health', 'checklist', 'nova']);
    expect(EXTRAS_OPTIONAL_SECTIONS).toEqual(['checklist', 'nova']);
    expect(EXTRAS_HEADS_QUERY).toBe('&with=checklist&with=nova');
  });
  test('the records, each in one section only, the shell list equal to them, none in the six', () => {
    const keys = EXTRAS_CHOICE_SECTION_LIST.flatMap(s => s.records.map(r => r.spec.key));
    expect(EXTRAS_CHOICE_SECTION_LIST.map(s => [s.name, s.records.map(r => r.spec.key)])).toEqual([
      ['journal', [JOURNAL_KEY]],
      ['money', [MONEY_LOG_KEY, BUDGETS_KEY, 'zigoals:budget-periods:v1', BILLS_KEY, 'zigoals:money-rules:v1', 'zigoals:money-tags:v1', 'zigoals:money-review:v1']],
      ['workouts', [WORKOUTS_KEY, WORKOUT_SPLITS_KEY]],
    ]);
    expect([...EXTRAS_CHOICE_DEVICE_KEYS].sort()).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(EXTRAS_DEVICE_KEYS).not.toContain(key);
  });
  test('every record travels as stored and reads its empty value; of the journal, the AI permission, the earlier versions, the reminder and what Today shows stay on each device', () => {
    for (const section of EXTRAS_CHOICE_SECTION_LIST) for (const r of section.records) {
      expect(r.spec.schema.safeParse(r.spec.empty()).success, r.spec.key).toBe(true);
      expect([r.verbatim, r.syncFields, r.fit], r.spec.key).toEqual([true, undefined, undefined]);
    }
    expect(EXTRAS_CHOICE_SECTION_LIST.flatMap(s => s.records.flatMap(r => (r.deviceFields ?? []).map(f => `${r.spec.key}#${f}`)))).toEqual(['shareWithAi', 'versions', 'reminder', 'todayLines', 'affirmations', /* Session AW (#444, deliberate) */ 'morningReminder'].map(f => `${JOURNAL_KEY}#${f}`));
    // Session AW (#444, deliberate): the journal's morning reminder is device-only too, as its evening reminder is.
    expect(JOURNAL_DEVICE_FIELDS).toEqual(['shareWithAi', 'versions', 'reminder', 'todayLines', 'affirmations', 'morningReminder']);
    // Every one of them is a field the journal really has.
    for (const f of JOURNAL_DEVICE_FIELDS) expect(Object.keys(journalSchema.shape)).toContain(f);
  });
});

describe('the choice on this device', () => {
  test('off unless chosen; kept inside the extras\' own choice, which older builds read as before; written again by the extras\' choice it stays', () => {
    const s = memoryStorage();
    expect(readExtrasSectionsChoice(s)).toEqual({journal: false, money: false, workouts: false});
    writeExtrasSectionChoice(s, 'journal', true); writeExtrasSectionChoice(s, 'workouts', true);
    expect(JSON.parse(s.getItem(EXTRAS_CHOICE_KEY)!)).toEqual({version: 1, enabled: true, sections: {journal: true, workouts: true}});
    expect(chosenSections(s)).toEqual(['journal', 'workouts']);
    // The extras' choice reads exactly as before, and writing it keeps the sections.
    expect(readExtrasChoice(s)).toEqual({enabled: true, explained: false});
    writeExtrasChoice(s, {enabled: true, explained: true});
    expect(chosenSections(s)).toEqual(['journal', 'workouts']);
    writeExtrasSectionChoice(s, 'journal', false);
    expect(JSON.parse(s.getItem(EXTRAS_CHOICE_KEY)!)).toEqual({version: 1, enabled: true, explained: true, sections: {workouts: true}});
    // An older build writes the extras' choice without `sections`: none chosen (the safe side).
    s.setItem(EXTRAS_CHOICE_KEY, JSON.stringify({version: 1, enabled: true, explained: true}));
    expect(chosenSections(s)).toEqual([]);
    // Anything but `true` is not chosen; unreadable bytes are not chosen; a later build's name is kept.
    s.setItem(EXTRAS_CHOICE_KEY, JSON.stringify({version: 1, enabled: true, sections: {journal: 'yes', money: 1, later: true}}));
    expect(chosenSections(s)).toEqual([]);
    writeExtrasSectionChoice(s, 'money', true);
    expect(JSON.parse(s.getItem(EXTRAS_CHOICE_KEY)!).sections).toEqual({later: true, money: true});
    s.setItem(EXTRAS_CHOICE_KEY, '{not json');
    expect(chosenSections(s)).toEqual([]);
  });
});

describe('a device that chose none syncs exactly as before', () => {
  test('one heads request as before, no section named, no outcome for them, their records untouched', async () => {
    const {cloud, device} = await account();
    const a = device(), text = journal([entry('e1', 'Fictional walk')]);
    a.storage.setItem(JOURNAL_KEY, text);
    a.storage.setItem(MONEY_LOG_KEY, JSON.stringify({version: 1, entries: [spend('m1', '12.50')], weekStartsOn: 'monday'}));
    expect(byState(await a.sync())).toEqual(SIX);
    expect(cloud.calls).toEqual(['heads', 'read:goals', 'read:life', 'read:habits', 'read:health', 'read:checklist', 'read:nova']);
    cloud.calls.length = 0; await a.sync();
    expect(cloud.calls).toEqual(['heads']);
    expect(a.storage.getItem(JOURNAL_KEY)).toBe(text);
    expect(cloud.sections.journal!.parts).toEqual([]);
    expect([...a.bases.m.keys()].sort()).toEqual(['checklist', 'goals', 'habits', 'health', 'life', 'nova']);
  });
});

describe('two devices (round trip, conflicts)', () => {
  test('the journal chosen on both: entries, journals and templates travel; the AI permission, earlier versions, the reminder and Today\'s lines stay on each device', async () => {
    const {device, cloudRecords} = await account();
    const a = device(), b = device();
    for (const d of [a, b]) writeExtrasSectionChoice(d.storage, 'journal', true);
    a.storage.setItem(JOURNAL_KEY, journal([entry('e1', 'Fictional walk by the sea', 1, {tags: ['walk'], photos: ['m-photo0001'], journal: 'j-travel1'})], {
      journals: [{id: 'j-travel1', name: 'Fictional travel', theme: 'teal'}], templates: [{id: 'own-abc123def4', title: 'Fictional evening', headings: ['Best bit:']}], packs: ['sleep'],
      shareWithAi: true, versions: [{id: 'v-first001', entryId: 'e1', text: 'Fictional walk', savedAt: at(2)}], reminder: {on: true, time: '21:15', days: 31}, todayLines: true, affirmations: true}));
    b.storage.setItem(JOURNAL_KEY, journal([], {reminder: {on: true, time: '07:30', days: 127}}));
    expect(byState(await a.sync())).toEqual({...SIX, journal: 'pushed'});
    // B's own journal holds nothing that travels (its reminder stays on B), so this is a pull.
    expect(byState(await b.sync())).toEqual({...SIX, journal: 'pulled'});
    expect(byState(await a.sync()).journal).toBe('unchanged');
    const onB = read(b, JOURNAL_KEY);
    expect(onB.entries.map((e: {id: string; text: string; photos?: string[]}) => [e.id, e.text, e.photos])).toEqual([['e1', 'Fictional walk by the sea', ['m-photo0001']]]);
    expect(onB.journals[0].name).toBe('Fictional travel'); expect(onB.templates[0].title).toBe('Fictional evening'); expect(onB.packs).toEqual(['sleep']);
    expect([onB.shareWithAi, onB.versions, onB.reminder, onB.todayLines, onB.affirmations]).toEqual([false, undefined, {on: true, time: '07:30', days: 127}, undefined, undefined]);
    expect(journalSchema.safeParse(onB).success).toBe(true);
    // The cloud copy never holds them either.
    const cloud = (await cloudRecords('journal'))![JOURNAL_KEY]!;
    for (const f of JOURNAL_DEVICE_FIELDS) expect(Object.hasOwn(cloud, f), f).toBe(false);
    expect(read(a, JOURNAL_KEY).shareWithAi).toBe(true);
  });
  test('apart: an entry written on each device keeps both; one entry changed on both keeps the later change; a removal on one and an edit on the other keeps the edit', async () => {
    const {device} = await account();
    const a = device(), b = device();
    for (const d of [a, b]) writeExtrasSectionChoice(d.storage, 'journal', true);
    a.storage.setItem(JOURNAL_KEY, journal([entry('e1', 'Fictional first', 1), entry('e2', 'Fictional second', 2)]));
    await a.sync(); await b.sync();
    a.storage.setItem(JOURNAL_KEY, journal([entry('e1', 'Fictional first, changed on A', 1, {updatedAt: at(10)}), entry('e2', 'Fictional second, changed on A', 2, {updatedAt: at(11)}), entry('a3', 'Fictional from A', 3)]));
    b.storage.setItem(JOURNAL_KEY, journal([entry('e1', 'Fictional first, changed on B later', 1, {updatedAt: at(20)}), entry('b3', 'Fictional from B', 4)]));
    expect(byState(await a.sync()).journal).toBe('pushed');
    expect(byState(await b.sync()).journal).toBe('merged');
    expect(byState(await a.sync()).journal).toBe('pulled');
    const texts = (d: {storage: Storage}) => read(d, JOURNAL_KEY).entries.map((e: {id: string; text: string}) => `${e.id}: ${e.text}`).sort();
    expect(texts(a)).toEqual(['a3: Fictional from A', 'b3: Fictional from B', 'e1: Fictional first, changed on B later', 'e2: Fictional second, changed on A']);
    expect(texts(b)).toEqual(texts(a));
  });
  test('the money records travel together: a spending entry, a budget and a bill on the phone appear on the computer; both add spending apart and both are kept', async () => {
    const {device} = await account();
    const a = device(), b = device();
    for (const d of [a, b]) writeExtrasSectionChoice(d.storage, 'money', true);
    a.storage.setItem(MONEY_LOG_KEY, JSON.stringify({version: 1, entries: [spend('m1', '12.50', 1)], weekStartsOn: 'monday'}));
    a.storage.setItem(BUDGETS_KEY, JSON.stringify({version: 1, budgets: [{id: 'b1', category: 'Groceries', currency: 'EUR', monthly: '300', rollover: false, since: '2026-11'}]}));
    a.storage.setItem(BILLS_KEY, JSON.stringify({version: 1, bills: [{id: 'bill1', title: 'Fictional gym', amount: '30', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-01', origin: 'manual', createdAt: at(0)}], dismissed: []}));
    expect(byState(await a.sync()).money).toBe('pushed');
    expect(byState(await b.sync()).money).toBe('pulled');
    expect(read(b, BUDGETS_KEY).budgets[0].monthly).toBe('300'); expect(read(b, BILLS_KEY).bills[0].title).toBe('Fictional gym');
    a.storage.setItem(MONEY_LOG_KEY, JSON.stringify({...read(a, MONEY_LOG_KEY), entries: [...read(a, MONEY_LOG_KEY).entries, spend('m2', '4.10', 2)]}));
    b.storage.setItem(MONEY_LOG_KEY, JSON.stringify({...read(b, MONEY_LOG_KEY), entries: [...read(b, MONEY_LOG_KEY).entries, spend('m3', '9.99', 3)]}));
    await a.sync(); await b.sync(); await a.sync();
    expect(read(a, MONEY_LOG_KEY).entries.map((e: {id: string}) => e.id).sort()).toEqual(['m1', 'm2', 'm3']);
    expect(read(b, MONEY_LOG_KEY)).toEqual(read(a, MONEY_LOG_KEY));
  });
  test('the workout log travels only while Health sync is on; removed from the cloud (by itself or with Health) it stops on every device until ticked again there', async () => {
    const {device, cloud} = await account();
    const a = device(), b = device();
    for (const d of [a, b]) writeExtrasSectionChoice(d.storage, 'workouts', true);
    a.storage.setItem(WORKOUTS_KEY, JSON.stringify({...emptyWorkouts(), workouts: [workout('w1', 'Fictional legs', 1)]}));
    expect(byState(await a.sync(false)).workouts).toBe('skipped');
    expect(cloud.calls.filter(c => c.includes('workouts') && !c.startsWith('heads'))).toEqual([]);
    expect(byState(await a.sync()).workouts).toBe('pushed');
    expect(byState(await b.sync()).workouts).toBe('pulled');
    expect(read(b, WORKOUTS_KEY).workouts[0].name).toBe('Fictional legs');
    // Health deleted from the cloud (the service removes the workout log with it): it stops on the other device, which
    // keeps its log; nothing is sent again until the person ticks it again there.
    const h = cloud.sections.workouts!; cloud.sections.workouts = {revision: h.revision + 1, generation: h.generation + 1, epoch: null, parts: []};
    const deleted = (await b.sync()).find(o => o.section === 'workouts')!;
    expect(deleted).toEqual({section: 'workouts', state: 'deleted', message: REMOVED_ELSEWHERE_NOTE('workouts')});
    expect(REMOVED_ELSEWHERE_NOTE('workouts')).toBe('Your workouts and routines were removed from the cloud on another device (deleting Health from the cloud removes them too), so they stopped syncing here and stay on this device. Tick them again to upload this device\'s.');
    expect(stopsExtras(deleted)).toBe(false);
    expect(read(b, WORKOUTS_KEY).workouts).toHaveLength(1);
    cloud.calls.length = 0;
    for (let i = 0; i < 3; i++) expect((await b.sync()).find(o => o.section === 'workouts')).toBeUndefined();
    expect(cloud.calls.filter(c => c.includes('workouts'))).toEqual([]);
    expect(cloud.sections.workouts!.parts).toEqual([]);
    writeExtrasSectionChoice(b.storage, 'workouts', true);
    expect(byState(await b.sync()).workouts).toBe('pushed');
  });
});

describe('a later or older build beside this one', () => {
  test('a later build\'s record and fields in the journal section travel through this build untouched; a field this build reads as absent is still in the cloud after an edit here', async () => {
    const {device, put, cloudRecords} = await account();
    const a = device();
    writeExtrasSectionChoice(a.storage, 'journal', true);
    const later = {[JOURNAL_KEY]: {version: 1, followUps: true, entries: [{...entry('e1', 'Fictional later entry', 1), mood: 'calm', photos: 'a later shape'}], laterField: {x: 1}}, 'zigoals:journal-later:v2': {version: 2, list: [1, 2]}};
    await put('journal', later);
    expect(byState(await a.sync()).journal).toBe('pulled');
    // Stored as it travelled (checked, never rewritten): the later field and the value this build reads as absent are kept.
    expect(read(a, JOURNAL_KEY).entries[0]).toEqual(later[JOURNAL_KEY].entries[0]);
    expect(a.storage.getItem('zigoals:journal-later:v2')).toBeNull();
    a.storage.setItem(JOURNAL_KEY, JSON.stringify({...read(a, JOURNAL_KEY), entries: [...read(a, JOURNAL_KEY).entries, entry('e2', 'Fictional from this build', 2)]}));
    expect(byState(await a.sync()).journal).toBe('pushed');
    const cloud = (await cloudRecords('journal'))!;
    expect(cloud['zigoals:journal-later:v2']).toEqual({version: 2, list: [1, 2]});
    expect(cloud[JOURNAL_KEY]!.laterField).toEqual({x: 1});
    expect((cloud[JOURNAL_KEY]!.entries as unknown[])[0]).toEqual(later[JOURNAL_KEY].entries[0]);
  });
  test('a device of an earlier build (it never asks for these sections) and this build share the six as before; the earlier device\'s records stay its own', async () => {
    const {device, cloud, vault} = await account();
    const now = device(), earlier = device();
    writeExtrasSectionChoice(now.storage, 'journal', true);
    now.storage.setItem(JOURNAL_KEY, journal([entry('e1', 'Fictional from this build')]));
    earlier.storage.setItem(JOURNAL_KEY, journal([entry('o1', 'Fictional from the earlier build')]));
    await now.sync();
    const before = structuredClone(cloud.sections.journal);
    // The earlier build's sync: the heads request without names (as its transport sends it), the six only.
    const earlierTransport: ExtrasTransport = {...cloud.transport, heads: () => cloud.transport.heads()};
    expect(byState(await syncExtras({transport: earlierTransport, key: vault.key, manifest: vault.manifest, storage: earlier.storage, bases: earlier.bases as never, fence: () => {}, health: true}))).toEqual(SIX);
    expect(read(earlier, JOURNAL_KEY).entries.map((e: {id: string}) => e.id)).toEqual(['o1']);
    expect(cloud.sections.journal).toEqual(before);
    expect(byState(await now.sync())).toEqual({...SIX, journal: 'unchanged'});
    expect(read(now, JOURNAL_KEY).entries.map((e: {id: string}) => e.id)).toEqual(['e1']);
  });
});

describe('a sync service that does not list the chosen sections yet', () => {
  test('the six sync; a chosen section waits on the device in plain words and is never read or written; once listed it syncs', async () => {
    const {device, cloud} = await account(['goals', 'life', 'habits', 'health', 'checklist', 'nova']);
    const a = device(), text = journal([entry('e1', 'Fictional walk')]);
    writeExtrasSectionChoice(a.storage, 'journal', true); writeExtrasSectionChoice(a.storage, 'money', true);
    a.storage.setItem(JOURNAL_KEY, text);
    for (let i = 0; i < 3; i++) {
      const outcomes = await a.sync();
      expect(byState(outcomes)).toEqual({...SIX, journal: 'skipped', money: 'skipped'});
      expect(outcomes.find(o => o.section === 'journal')!.message).toBe(SERVICE_UPDATE_NOTE('journal'));
    }
    expect(SERVICE_UPDATE_NOTE('journal')).toBe('Your journal entries sync once the sync service is updated. Nothing was changed here.');
    expect(cloud.calls.filter(c => c.startsWith('heads'))).toEqual(['heads:journal,money', 'heads:journal,money', 'heads:journal,money']);
    expect(cloud.calls.filter(c => /journal|money/.test(c) && !c.startsWith('heads'))).toEqual([]);
    expect(a.storage.getItem(JOURNAL_KEY)).toBe(text);
    cloud.state.known = ALL;
    expect(byState(await a.sync()).journal).toBe('pushed');
  });
});

describe('removing a chosen section from the cloud', () => {
  test('on one device: the copy goes, every other device stops that section only and keeps its records; choosing it again uploads them', async () => {
    const {device, cloud} = await account();
    const a = device(), b = device();
    for (const d of [a, b]) writeExtrasSectionChoice(d.storage, 'journal', true);
    a.storage.setItem(JOURNAL_KEY, journal([entry('e1', 'Fictional walk')]));
    await a.sync(); await b.sync();
    await a.remove('journal');
    expect(cloud.sections.journal).toMatchObject({parts: [], generation: 1});
    expect(chosenSections(a.storage)).toEqual([]);
    const outcomes = await b.sync(), gone = outcomes.find(o => o.section === 'journal')!;
    expect(gone).toEqual({section: 'journal', state: 'deleted', message: REMOVED_ELSEWHERE_NOTE('journal')});
    expect(outcomes.some(stopsExtras)).toBe(false);
    expect(chosenSections(b.storage)).toEqual([]);
    expect(read(b, JOURNAL_KEY).entries).toHaveLength(1);
    // The next sync on either device does not name the journal; choosing it again on A uploads A's journal.
    expect(byState(await b.sync())).toEqual(SIX);
    writeExtrasSectionChoice(a.storage, 'journal', true);
    expect(byState(await a.sync()).journal).toBe('pushed');
  });
  test('"Remove the extras from the cloud" deletes the chosen sections\' copies too, and turns their choices off here', async () => {
    const {device, cloud} = await account();
    const a = device(), b = device();
    writeExtrasSectionChoice(b.storage, 'money', true);
    b.storage.setItem(MONEY_LOG_KEY, JSON.stringify({version: 1, entries: [spend('m1', '1.00')], weekStartsOn: 'monday'}));
    await b.sync();
    writeExtrasSectionChoice(a.storage, 'journal', true);
    await a.removeAll();
    expect(cloud.calls.filter(c => c.startsWith('delete:'))).toEqual(['delete:money']);
    expect(cloud.calls).toContain('heads:journal,money,workouts');
    expect(chosenSections(a.storage)).toEqual([]);
    expect(readExtrasChoice(a.storage).enabled).toBe(false);
  });
  test('the six removed elsewhere still stop the whole extras, as before; Health removed alone never does', () => {
    expect(stopsExtras({section: 'goals', state: 'deleted'})).toBe(true);
    expect(stopsExtras({section: 'nova', state: 'deleted'})).toBe(true);
    for (const section of ['health', 'journal', 'money', 'workouts']) expect(stopsExtras({section, state: 'deleted'}), section).toBe(false);
    expect(stopsExtras({section: 'goals', state: 'pulled'})).toBe(false);
  });
});

describe('the wire', () => {
  const config = {authOrigin: 'https://test.supabase.co', publicKey: 'public', syncOrigin: 'https://sync.example.workers.dev'};
  const id = '10000000-0000-4000-8000-000000000001', cookie = '__Host-zigoals_session=fixture-token';
  const get = async (query: string) => { const calls: string[] = []; const res = await privateAccountRequest(new Request(`https://app.test/api/private-account?action=extras${query}`, {headers: {cookie, 'x-zigoals-account': id}}), config, async url => { calls.push(String(url)); return Response.json({protocol: 1, sections: {}}); }); return {status: res.status, calls}; };
  test('the heads query: as before when none is chosen; the chosen ones after NOVA, one `with` each, in protocol order', () => {
    expect(extrasHeadsQuery()).toBe('&with=checklist&with=nova');
    expect(extrasHeadsQuery([])).toBe(EXTRAS_HEADS_QUERY);
    expect(extrasHeadsQuery(['workouts', 'journal'])).toBe('&with=checklist&with=nova&with=journal&with=workouts');
    expect(extrasHeadsQuery(['journal', 'money', 'workouts'])).toBe('&with=checklist&with=nova&with=journal&with=money&with=workouts');
  });
  test('the heads schema takes the chosen sections\' heads and nothing it does not know', () => {
    const head = {revision: 0, generation: 0, epoch: null, parts: 0}, six = {goals: head, life: head, habits: head, health: head, checklist: head, nova: head};
    for (const more of [{}, {journal: head}, {money: head, workouts: head}]) expect(extrasHeadsSchema.safeParse({protocol: 1, sections: {...six, ...more}}).success).toBe(true);
    expect(extrasHeadsSchema.safeParse({protocol: 1, sections: {...six, notes: head}}).success).toBe(false);
  });
  test('the relay forwards every form the app sends, the earlier forms as before, and refuses any other before a call', async () => {
    for (const chosen of [[], ['journal'], ['money'], ['workouts'], ['journal', 'money'], ['journal', 'workouts'], ['money', 'workouts'], ['journal', 'money', 'workouts']] as const) {
      const query = extrasHeadsQuery(chosen);
      expect(await get(query), query).toEqual({status: 200, calls: [config.syncOrigin + '/v1/extras?' + query.slice(1)]});
    }
    expect(await get('&with=checklist')).toEqual({status: 200, calls: [config.syncOrigin + '/v1/extras?with=checklist']});
    expect(await get('')).toEqual({status: 200, calls: [config.syncOrigin + '/v1/extras']});
    for (const section of ['journal', 'money', 'workouts']) expect(await get(`&section=${section}`)).toEqual({status: 200, calls: [`${config.syncOrigin}/v1/extras?section=${section}`]});
    for (const bad of ['&with=checklist&with=journal', '&with=journal', '&with=checklist&with=nova&with=workouts&with=journal', '&with=checklist&with=nova&with=journal&with=journal', '&with=checklist&with=nova&with=notes', '&with=checklist&with=nova&with=Journal', '&with=checklist&with=nova&with=', '&with=checklist&with=nova&with=journal,money', '&section=notes', '&section=Journal'])
      expect(await get(bad), bad).toEqual({status: 400, calls: []});
  });
});
