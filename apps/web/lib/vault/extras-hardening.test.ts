import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {createVault} from './crypto';
import {HEALTH_HELD_NOTE, releaseHealthHold, sealSection, sectionText, syncExtras, type ExtrasBase, type ExtrasTransport} from './extras-sync';
import {setGoalReasons, emptyGoalExtras} from '../goal-extras/store';

// Session AB-Cloud Part 3 ([TIER 3] (sync), ADR-023 C15–C19): Session Q's FIX_PLAN B3–B7, already enforced for the four
// synced modules since Session Y, proven for the extras sections. An in-memory cloud with the Worker's rules
// (workers/private-sync/extras.mjs: compare-and-swap per section, generations) stands in for it; the Worker's own
// refusals are proven in scripts/run11/extras-keyspace.test.mjs.
type Head = {revision: number; generation: number; epoch: number | null; parts: unknown[]};
function memoryCloud() {
  const sections: Record<string, Head> = Object.fromEntries(['goals', 'life', 'habits', 'health'].map(s => [s, {revision: 0, generation: 0, epoch: null, parts: []}]));
  const calls: string[] = [];
  const transport: ExtrasTransport = {
    heads: async () => { calls.push('heads'); return {protocol: 1, sections: Object.fromEntries(Object.entries(sections).map(([k, h]) => [k, {revision: h.revision, generation: h.generation, epoch: h.epoch, parts: h.parts.length}]))}; },
    read: async section => { calls.push(`read:${section}`); const h = sections[section]!; return {protocol: 1, section, revision: h.revision, generation: h.generation, epoch: h.epoch, parts: h.parts}; },
    write: async (op: unknown) => {
      const o = op as {section: string; base: number; generation: number; epoch: number; parts: unknown[]};
      calls.push(`write:${o.section}`); const h = sections[o.section]!;
      if (o.base !== h.revision || o.generation !== h.generation) throw Error('REVISION_CONFLICT');
      sections[o.section] = {revision: h.revision + 1, generation: h.generation, epoch: o.epoch, parts: o.parts};
      return {revision: h.revision + 1, generation: h.generation};
    },
  };
  return {sections, calls, transport};
}
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear(), m} as Storage & {m: Map<string, string>}; }
function memoryBases() { const m = new Map<string, ExtrasBase>(); return {get: async (s: string) => m.get(s) ?? null, put: async (s: string, b: ExtrasBase) => { m.set(s, structuredClone(b)); }, clear: async () => m.clear(), m}; }
const GOALS = 'zigoals:goal-extras:v1', MICRO = 'zigoals:micro-targets:v1', at = '2026-10-13T08:00:00.000Z';
async function device() {
  const vault = await createVault(), cloud = memoryCloud(), storage = memoryStorage(), bases = memoryBases();
  const sync = (health = true) => syncExtras({transport: cloud.transport, key: vault.key, manifest: vault.manifest, storage, bases: bases as never, fence: () => {}, health});
  return {vault, cloud, storage, bases, sync};
}
const byState = (o: {section: string; state: string; message?: string}[]) => Object.fromEntries(o.map(x => [x.section, x.state]));

describe('FIX_PLAN B3 for the extras: an older copy is refused, never applied', () => {
  test('a section whose cloud revision went back (a server restored from an earlier copy) is refused; nothing is written or uploaded', async () => {
    const d = await device();
    d.storage.setItem(GOALS, JSON.stringify(setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'Mine'}, at)));
    await d.sync(); await d.sync();
    const before = new Map(d.storage.m);
    d.cloud.sections.goals = {revision: 0, generation: 0, epoch: null, parts: []};
    d.cloud.calls.length = 0;
    const out = await d.sync();
    expect(byState(out).goals).toBe('error');
    expect(out.find(o => o.section === 'goals')!.message).toMatch(/older or altered encrypted copy/);
    expect(d.cloud.calls.filter(c => c.endsWith(':goals'))).toEqual([]);
    expect(d.storage.m).toEqual(before);
  });
  test('a lower deletion generation is refused the same way', async () => {
    const d = await device();
    d.storage.setItem(GOALS, JSON.stringify(setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'Mine'}, at)));
    await d.sync();
    d.bases.m.set('goals', {...d.bases.m.get('goals')!, generation: 2});
    // A local edit waits, so a sync that was not refused would write it.
    d.storage.setItem(GOALS, JSON.stringify(setGoalReasons(JSON.parse(d.storage.getItem(GOALS)!), 'private:1', {why: 'Edited'}, '2026-10-13T09:00:00.000Z')));
    const before = new Map(d.storage.m);
    d.cloud.calls.length = 0;
    expect(byState(await d.sync()).goals).toBe('error');
    // Gate C test audit: as above, nothing is written to the cloud and nothing changes on the device.
    expect(d.cloud.calls.filter(c => c.startsWith('write') && c.endsWith(':goals'))).toEqual([]);
    expect(d.storage.m).toEqual(before);
  });
});

describe('FIX_PLAN B4 for the extras: Health\'s extras never travel without Health\'s consent', () => {
  test('with the consent off nothing of the Health section is read or sent, even with Health extras changed here', async () => {
    const d = await device();
    d.storage.setItem(MICRO, JSON.stringify({version: 1, targets: {ironMg: 15}}));
    const out = await d.sync(false);
    expect(byState(out).health).toBe('skipped');
    expect(d.cloud.calls.some(c => c.endsWith(':health'))).toBe(false);
    expect(d.cloud.sections.health!.parts).toEqual([]);
  });
});

describe('FIX_PLAN B5 for the extras: no plaintext queue, a bounded base', () => {
  test('the extras sync keeps no outbox: it never imports the local database, and a sync writes only the records it merged', async () => {
    const source = readFileSync(new URL('./extras-sync.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from '\.\/database'|from '\.\/local'|outbox/);
    const d = await device();
    d.storage.setItem(GOALS, JSON.stringify(setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'Mine'}, at)));
    const keys = [...d.storage.m.keys()];
    await d.sync();
    expect([...d.storage.m.keys()]).toEqual(keys);
    // One base per section at most, replaced on every sync (never a growing history).
    await d.sync(); d.storage.setItem(GOALS, JSON.stringify(setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'Changed'}, at))); await d.sync();
    expect([...d.bases.m.keys()].sort()).toEqual(['goals', 'habits', 'health', 'life']);
  });
});

describe('FIX_PLAN B6 for the extras: no vault in the cloud is not a fresh start', () => {
  test('a cloud that answers with nothing while this device synced before is refused, not filled again', async () => {
    const d = await device();
    d.storage.setItem(GOALS, JSON.stringify(setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'Mine'}, at)));
    await d.sync();
    for (const s of Object.keys(d.cloud.sections)) d.cloud.sections[s] = {revision: 0, generation: 0, epoch: null, parts: []};
    d.cloud.calls.length = 0;
    expect(byState(await d.sync()).goals).toBe('error');
    expect(d.cloud.calls.some(c => c.startsWith('write:'))).toBe(false);
  });
});

describe('FIX_PLAN B7 for the extras: one spelling per sealed value', () => {
  test('a part whose ciphertext has a spare bit set is refused and nothing is applied', async () => {
    const d = await device();
    // AES-GCM output lengths that are not a multiple of 3 bytes leave spare bits in the last character: pad until they do.
    let pad = '', parts = await sealSection(d.vault.key, d.vault.manifest, 'goals', 1, sectionText({[GOALS]: setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'From the cloud'}, at)}));
    while ((parts[0] as {ciphertext: string}).ciphertext.length % 4 === 0) { pad += 'x'; parts = await sealSection(d.vault.key, d.vault.manifest, 'goals', 1, sectionText({[GOALS]: setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'From the cloud' + pad}, at)})); }
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const part = parts[0] as {ciphertext: string}, flipped = part.ciphertext.slice(0, -1) + ALPHABET[ALPHABET.indexOf(part.ciphertext.at(-1)!) ^ 1];
    expect(flipped).not.toBe(part.ciphertext);
    d.cloud.sections.goals = {revision: 1, generation: 0, epoch: d.vault.manifest.epoch, parts: [{...part, ciphertext: flipped}]};
    const out = await d.sync();
    expect(byState(out).goals).toBe('error'); expect(d.storage.getItem(GOALS)).toBeNull();
    // The canonical part opens and is applied.
    d.cloud.sections.goals = {revision: 1, generation: 0, epoch: d.vault.manifest.epoch, parts};
    expect(byState(await d.sync()).goals).toBe('pulled');
    expect(JSON.parse(d.storage.getItem(GOALS)!).goals['private:1'].why).toBe('From the cloud' + pad);
  });
});

// Gate B (the independent security read of every Tier 3 commit, ADR-023 C28): its three extras findings, each reproduced
// first (the reviewer's proofs of concept) and now refused.
describe('Gate B: replays, a key change and a Health deletion', () => {
  test('finding 1: heads that claim a newer revision while serving an older copy are refused; nothing is written', async () => {
    const d = await device();
    d.storage.setItem(GOALS, JSON.stringify(setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'OLD'}, at)));
    await d.sync();
    const oldCopy = structuredClone(d.cloud.sections.goals!);
    d.storage.setItem(GOALS, JSON.stringify(setGoalReasons(JSON.parse(d.storage.getItem(GOALS)!), 'private:1', {why: 'NEW'}, '2026-10-13T09:00:00.000Z')));
    await d.sync();
    const before = new Map(d.storage.m), real = d.cloud.transport.read;
    // The heads say revision 3; the read serves the genuine revision-1 parts.
    d.cloud.sections.goals = {...d.cloud.sections.goals!, revision: 3};
    d.cloud.transport.read = async section => section === 'goals' ? {protocol: 1, section, revision: oldCopy.revision, generation: oldCopy.generation, epoch: oldCopy.epoch, parts: oldCopy.parts} : real(section);
    const out = await d.sync();
    expect(byState(out).goals).toBe('error');
    expect(out.find(o => o.section === 'goals')!.message).toMatch(/older or altered encrypted copy/);
    expect(d.storage.m).toEqual(before);
    // A faked deletion (a new generation with a lower revision) is refused the same way.
    d.cloud.transport.read = real;
    d.cloud.sections.goals = {revision: 1, generation: 1, epoch: null, parts: []};
    expect(byState(await d.sync()).goals).toBe('error');
    expect(d.storage.m).toEqual(before);
  });
  test('finding 2: after a key change, only the device that synced the copy last re-uploads it; another device waits and loses nothing', async () => {
    const a = await device();
    const b = {storage: memoryStorage(), bases: memoryBases()};
    let vault = a.vault;
    const sync = (d: {storage: Storage; bases: unknown}) => syncExtras({transport: a.cloud.transport, key: vault.key, manifest: vault.manifest, storage: d.storage, bases: d.bases as never, fence: () => {}, health: false});
    a.storage.setItem(GOALS, JSON.stringify(setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'A-original'}, at)));
    await sync(a); await sync(b);
    b.storage.setItem(GOALS, JSON.stringify(setGoalReasons(JSON.parse(b.storage.getItem(GOALS)!), 'private:1', {why: 'B-edit'}, '2026-10-13T09:00:00.000Z')));
    await sync(b);
    vault = await createVault(vault.manifest.vault, vault.manifest.epoch + 1);
    const out = await sync(a);
    expect(byState(out).goals).toBe('waiting');
    expect(out.find(o => o.section === 'goals')!.message).toMatch(/wait for the device that synced them last/);
    expect(a.storage.getItem(GOALS)).toContain('A-original');
    expect(byState(await sync(b)).goals).toBe('pushed');
    await sync(b);
    expect(b.storage.getItem(GOALS)).toContain('B-edit');
    // A now reads B's copy under the new key and takes the edit.
    expect(byState(await sync(a)).goals).toBe('pulled');
    expect(a.storage.getItem(GOALS)).toContain('B-edit');
  });
  test('finding 6: after a Health deletion the Health extras are held here until Health sync is turned on again', async () => {
    const d = await device();
    d.storage.setItem(MICRO, JSON.stringify({version: 1, targets: {}}));
    await d.sync();
    const h = d.cloud.sections.health!;
    d.cloud.sections.health = {revision: h.revision + 1, generation: h.generation + 1, epoch: null, parts: []};
    expect(byState(await d.sync()).health).toBe('deleted');
    d.cloud.calls.length = 0;
    const held = await d.sync();
    expect(held.find(o => o.section === 'health')).toEqual({section: 'health', state: 'skipped', message: HEALTH_HELD_NOTE});
    expect(d.cloud.calls.filter(c => c.endsWith(':health'))).toEqual([]);
    await releaseHealthHold(d.bases as never);
    expect(byState(await d.sync()).health).toBe('pushed');
  });
});
