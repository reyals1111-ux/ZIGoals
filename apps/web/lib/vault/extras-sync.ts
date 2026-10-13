import * as z from 'zod';
import {openRecord, sealRecord, type EncryptedEnvelope, type VaultManifest} from './crypto';
import {RevisionConflict} from './cloud-sync';
import {canonical, mergeExtras, same} from './extras-merge';
import {EXTRAS_SECTIONS, type ExtrasSection, type ExtrasSectionName} from './extras-sections';
import {EXTRAS_CHOICE_KEY} from './extras-keys';
import {ZIGI_STORE_EVENT} from '../ai/store/keys';

/**
 * Session AB-Cloud Part 2 ([TIER 3] (sync), ADR-023 C1–C5, C11): the encrypted extras sections. Each section is one
 * snapshot in its own keyspace of the account's vault (workers/private-sync/extras.mjs): the canonical text of
 * `{version: 1, records: {<device key>: value}}`, cut into parts of at most EXTRAS_PART_CHARS, each sealed with the vault
 * key for its own place (the `extras` label, a fixed object per section and index, the snapshot's revision, the active
 * epoch) and saying how many parts there are, so a part cannot be dropped, reordered, moved to another section or replayed
 * from another revision unnoticed.
 *
 * The base: what this device last synced of each section (revision, deletion generation, digest and text), in this
 * device's IndexedDB beside the account's sync journal (a plaintext copy of the device's own records, like the journal's
 * base). Nothing about it is sent. Each sync is three-way per section against that base (lib/vault/extras-merge.ts); the
 * device keys stay what every page reads and writes (C2): the merge is written back into them, compare-before-write, and
 * the merged snapshot is uploaded only when it differs from the cloud's.
 */
export const EXTRAS_PART_CHARS = 48_000, EXTRAS_MAX_PARTS = 14, EXTRAS_SEALED_MAX = 1_000_000;
const SECTION_INDEX: Record<ExtrasSectionName, number> = {goals: 0, life: 1, habits: 2, health: 3};
// Fixed objects, distinct from every vault record (random v4 ids) and from the Portfolio's (0x100 + index).
const partObject = (section: ExtrasSectionName, index: number) => `00000000-0000-4000-8000-${(0x400 + SECTION_INDEX[section] * 0x20 + index).toString(16).padStart(12, '0')}`;
const sectionName = z.enum(['goals', 'life', 'habits', 'health']);
const partSchema = z.object({version: z.literal(1), section: sectionName, index: z.number().int().min(0), count: z.number().int().min(1).max(EXTRAS_MAX_PARTS), text: z.string().max(EXTRAS_PART_CHARS)}).strict();
const headSchema = z.object({revision: z.number().int().min(0), generation: z.number().int().min(0), epoch: z.number().int().min(1).nullable(), parts: z.number().int().min(0).max(16)}).strict();
export const extrasHeadsSchema = z.object({protocol: z.literal(1), sections: z.object({goals: headSchema, life: headSchema, habits: headSchema, health: headSchema}).strict()}).strict();
export const extrasSectionCloudSchema = z.object({protocol: z.literal(1), section: sectionName, revision: z.number().int().min(0), generation: z.number().int().min(0), epoch: z.number().int().min(1).nullable(), parts: z.array(z.unknown()).max(16)}).strict();
export type ExtrasHeads = z.infer<typeof extrasHeadsSchema>;
export type ExtrasSectionCloud = z.infer<typeof extrasSectionCloudSchema>;
/** A section's plaintext: the device records it carries, by key; loose, so a later build's records survive here. */
const payloadSchema = z.looseObject({version: z.literal(1), records: z.record(z.string().min(1).max(120), z.unknown())});
type Records = Record<string, unknown>;
const sha = z.string().regex(/^[0-9a-f]{64}$/);
export const extrasBaseSchema = z.object({version: z.literal(1), vault: z.uuid(), revision: z.number().int().min(0), generation: z.number().int().min(0), digest: sha.nullable(), text: z.string().nullable(),
  /** An upload whose answer has not arrived: recognised on the next sync by its digest. */
  pending: z.object({digest: sha, text: z.string()}).strict().optional()}).strict();
export type ExtrasBase = z.infer<typeof extrasBaseSchema>;
export class ExtrasTooLarge extends Error { constructor(section: string) { super(`Your ${SECTION_LABEL[section as ExtrasSectionName] ?? section} are larger than their encrypted copy can hold (about 1 MB). They stay on this device; nothing was uploaded.`); } }
export const SECTION_LABEL: Record<ExtrasSectionName, string> = {goals: 'goal extras', life: 'calculator, Life review and Today extras', habits: 'habit extras', health: 'Health extras'};

/** The canonical text a section is sealed and compared as (sorted keys, so key order never reads as a change). */
export const sectionText = (records: Records) => canonical({version: 1, records});
export async function digestOf(text: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(v => v.toString(16).padStart(2, '0')).join(''); }
const context = (manifest: VaultManifest, section: ExtrasSectionName, index: number, revision: number) => ({vault: manifest.vault, domain: 'extras' as const, object: partObject(section, index), revision, epoch: manifest.epoch});

export async function sealSection(key: CryptoKey, manifest: VaultManifest, section: ExtrasSectionName, revision: number, text: string): Promise<EncryptedEnvelope[]> {
  const count = Math.max(1, Math.ceil(text.length / EXTRAS_PART_CHARS));
  if (count > EXTRAS_MAX_PARTS) throw new ExtrasTooLarge(section);
  const parts = await Promise.all(Array.from({length: count}, (_, index) => sealRecord(key, context(manifest, section, index, revision), {version: 1, section, index, count, text: text.slice(index * EXTRAS_PART_CHARS, (index + 1) * EXTRAS_PART_CHARS)})));
  if (parts.reduce((n, part) => n + JSON.stringify(part).length, 0) > EXTRAS_SEALED_MAX) throw new ExtrasTooLarge(section);
  return parts;
}
/** The cloud snapshot's text, checked part by part and as a whole; null when the cloud holds none. */
export async function openSection(key: CryptoKey, manifest: VaultManifest, cloud: ExtrasSectionCloud): Promise<string | null> {
  if (!cloud.parts.length) return null;
  if (cloud.epoch !== manifest.epoch) throw Error('These extras were sealed with an earlier vault key.');
  const parts = await Promise.all(cloud.parts.map(async (envelope, index) => partSchema.parse(await openRecord(key, context(manifest, cloud.section, index, cloud.revision), envelope))));
  if (parts.some((part, index) => part.index !== index || part.count !== parts.length || part.section !== cloud.section)) throw Error('An encrypted extras copy is incomplete. Nothing was changed.');
  const text = parts.map(part => part.text).join(''), parsed = payloadSchema.parse(JSON.parse(text));
  if (sectionText(parsed.records) !== text) throw Error('An encrypted extras copy is not in its expected form. Nothing was changed.');
  return text;
}

/** Where this device keeps its bases (IndexedDB in the app; a map in tests). */
export type ExtrasBases = {get: (section: ExtrasSectionName) => Promise<ExtrasBase | null>; put: (section: ExtrasSectionName, base: ExtrasBase) => Promise<void>; clear: () => Promise<void>};
export type ExtrasTransport = {heads: () => Promise<unknown>; read: (section: ExtrasSectionName) => Promise<unknown>; write: (operation: unknown) => Promise<unknown>};

/** The person's choice on this device (kept in the account's storage). Owner decision 2026-10-13: on unless turned off. */
export type ExtrasChoice = {enabled: boolean; explained: boolean};
export function readExtrasChoice(storage: Pick<Storage, 'getItem'>): ExtrasChoice {
  try { const raw = storage.getItem(EXTRAS_CHOICE_KEY); if (raw === null) return {enabled: true, explained: false}; const v = JSON.parse(raw); return {enabled: v?.enabled !== false, explained: v?.explained === true}; } catch { return {enabled: true, explained: false}; }
}
export function writeExtrasChoice(storage: Pick<Storage, 'setItem'>, choice: ExtrasChoice) { storage.setItem(EXTRAS_CHOICE_KEY, JSON.stringify({version: 1, enabled: choice.enabled, ...(choice.explained ? {explained: true} : {})})); }

/** What this device's keys hold for a section, without the fields that stay on each device. */
export function collectSection(storage: Pick<Storage, 'getItem'>, section: ExtrasSection): {records: Records; raw: Record<string, string | null>; unreadable: string[]} {
  const records: Records = {}, raw: Record<string, string | null> = {}, unreadable: string[] = [];
  for (const r of section.records) {
    const key = r.spec.key, text = storage.getItem(key);
    raw[key] = text;
    if (text === null) continue;
    let parsed: z.ZodSafeParseResult<unknown>;
    try { parsed = r.spec.schema.safeParse(JSON.parse(text)); } catch { unreadable.push(key); continue; }
    if (!parsed.success) { unreadable.push(key); continue; }
    const value = {...(parsed.data as Records)};
    for (const field of r.deviceFields ?? []) delete value[field];
    records[key] = value;
  }
  return {records, raw, unreadable};
}
/**
 * The three-way merge of a section's records. A record this build does not know (a later build's) is carried as the
 * cloud holds it; this build never reads, changes or removes it.
 */
export function mergeSection(section: ExtrasSection, base: Records | undefined, local: Records, remote: Records): Records {
  const known = new Set(section.records.map(r => r.spec.key)), out: Records = {};
  for (const key of new Set([...Object.keys(base ?? {}), ...Object.keys(local), ...Object.keys(remote)])) {
    const value = known.has(key) ? mergeExtras(base === undefined ? undefined : base[key], local[key], remote[key]) : remote[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}
/**
 * Writes a merge into the device keys: every changed record validated by its own schema first (one refusal changes
 * nothing), then written only while its key still holds the bytes collected (an edit made meanwhile is never
 * overwritten: the sync stops and runs again). The fields that stay on each device are kept from this device.
 */
export function applySection(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, section: ExtrasSection, collected: ReturnType<typeof collectSection>, merged: Records): string[] {
  const writes: {key: string; text: string | null}[] = [];
  for (const r of section.records) {
    const key = r.spec.key, target = merged[key], current = collected.records[key];
    if (target === undefined ? current === undefined : current !== undefined && same(target, current)) continue;
    if (target === undefined) { writes.push({key, text: null}); continue; }
    const held = collected.raw[key] === null ? {} : JSON.parse(collected.raw[key]!) as Records, kept: Records = {};
    for (const field of r.deviceFields ?? []) if (held[field] !== undefined) kept[field] = held[field];
    const parsed = r.spec.schema.safeParse({...(target as Records), ...kept});
    if (!parsed.success) throw Error(`Your ${SECTION_LABEL[section.name]} from another device could not be combined with this device's. Nothing was changed on this device.`);
    writes.push({key, text: JSON.stringify(parsed.data)});
  }
  if (writes.some(w => storage.getItem(w.key) !== collected.raw[w.key])) throw new ExtrasChangedDuringSync();
  for (const w of writes) { if (w.text === null) storage.removeItem(w.key); else storage.setItem(w.key, w.text); }
  if (typeof window !== 'undefined') for (const w of writes) window.dispatchEvent(new CustomEvent(ZIGI_STORE_EVENT, {detail: w.key}));
  return writes.map(w => w.key);
}
export class ExtrasChangedDuringSync extends Error { constructor() { super('Your extras changed during sync. Nothing was overwritten; they sync again next.'); this.name = 'ExtrasChangedDuringSync'; } }

export type ExtrasOutcome = {section: ExtrasSectionName; state: 'unchanged' | 'pushed' | 'pulled' | 'merged' | 'deleted' | 'skipped' | 'unreadable' | 'error'; message?: string};
type SyncInput = {transport: ExtrasTransport; key: CryptoKey; manifest: VaultManifest; storage: Storage; bases: ExtrasBases; fence: () => void};

/** One section's sync against the head the cloud reported. */
export async function syncSection(input: SyncInput, section: ExtrasSection, head: z.infer<typeof headSchema>): Promise<ExtrasOutcome> {
  const {transport, key, manifest, storage, bases, fence} = input, name = section.name;
  const stored = await bases.get(name), base = stored && stored.vault === manifest.vault ? stored : null;
  fence();
  // An older copy than this device already synced (a lower generation, or a lower revision in the same one): refused
  // before anything is read or sent (FIX_PLAN B3 for the extras).
  if (base && (head.generation < base.generation || head.generation === base.generation && head.revision < base.revision)) throw Error(`An older or altered encrypted copy of your ${SECTION_LABEL[name]} was refused. Nothing was changed.`);
  const collected = collectSection(storage, section);
  if (collected.unreadable.length) return {section: name, state: 'unreadable', message: `Some of your ${SECTION_LABEL[name]} on this device could not be read, so they were not synced. They were not changed.`};
  const localText = sectionText(collected.records), localDigest = await digestOf(localText);
  const record = (next: Omit<ExtrasBase, 'version' | 'vault'>) => bases.put(name, extrasBaseSchema.parse({version: 1, vault: manifest.vault, ...next}));
  // The cloud copy was removed since this device last synced.
  if (base && head.generation !== base.generation) {
    await record({revision: head.revision, generation: head.generation, digest: null, text: null});
    return {section: name, state: 'deleted'};
  }
  // Unchanged in the cloud since this device's last sync: upload this device's change, if any.
  let remoteText: string | null | undefined, remoteRevision = head.revision;
  const stale = head.parts > 0 && head.epoch !== manifest.epoch;
  if (base && head.revision === base.revision && !stale) {
    if (localDigest === base.digest) return {section: name, state: 'unchanged'};
    remoteText = base.text;
  } else if (!stale) {
    const cloud = extrasSectionCloudSchema.parse(await transport.read(name)); fence();
    if (cloud.section !== name || cloud.generation !== head.generation) throw new RevisionConflict();
    remoteText = await openSection(key, manifest, cloud); remoteRevision = cloud.revision; fence();
  }
  // A lost answer: the cloud holds exactly what this device sent last time.
  const baseText = base?.pending && remoteText !== undefined && remoteText !== null && await digestOf(remoteText) === base.pending.digest ? base.pending.text : base?.text ?? null;
  const baseRecords = base ? (baseText === null ? {} : payloadSchema.parse(JSON.parse(baseText)).records) : undefined;
  // A copy sealed before a key rotation cannot be read: this device's merge with its own base is uploaded again.
  const remoteRecords = remoteText === undefined ? (baseRecords ?? {}) : remoteText === null ? {} : payloadSchema.parse(JSON.parse(remoteText)).records;
  const merged = mergeSection(section, baseRecords, collected.records, remoteRecords), mergedText = sectionText(merged), mergedDigest = await digestOf(mergedText);
  // Pulled: another device's change reached a key on this one (a later build's record is carried, never written here).
  const pulled = applySection(storage, section, collected, merged).length > 0; fence();
  if (remoteText !== undefined && mergedText === (remoteText ?? sectionText({}))) {
    await record({revision: remoteRevision, generation: head.generation, digest: mergedDigest, text: mergedText});
    return {section: name, state: pulled ? 'pulled' : 'unchanged'};
  }
  const parts = await sealSection(key, manifest, name, remoteRevision + 1, mergedText); fence();
  // Written before the upload: if its answer is lost, the next sync recognises the cloud copy as this one.
  await record({revision: remoteRevision, generation: head.generation, digest: base?.digest ?? null, text: baseText, pending: {digest: mergedDigest, text: mergedText}});
  const answer = z.object({revision: z.number().int(), generation: z.number().int()}).passthrough().parse(await transport.write({protocol: 1, action: 'put', vault: manifest.vault, operation: crypto.randomUUID(), section: name, base: remoteRevision, generation: head.generation, epoch: manifest.epoch, parts}));
  fence();
  await record({revision: answer.revision, generation: answer.generation, digest: mergedDigest, text: mergedText});
  return {section: name, state: pulled ? 'merged' : 'pushed'};
}

/**
 * Every section this device may sync, after the account's own sections and under the same lock: the `health` section only
 * while `health` is true (this tab's Health consent, and Health not held after a cloud deletion). A section's failure is
 * its own outcome and never stops the others or the account sync; a revision conflict (another device wrote between the
 * heads and the upload) retries that section once.
 */
export async function syncExtras(input: SyncInput & {health: boolean}): Promise<ExtrasOutcome[]> {
  const heads = extrasHeadsSchema.parse(await input.transport.heads()); input.fence();
  const outcomes: ExtrasOutcome[] = [];
  for (const section of EXTRAS_SECTIONS) {
    if (section.consent === 'health' && !input.health) { outcomes.push({section: section.name, state: 'skipped'}); continue; }
    try {
      try { outcomes.push(await syncSection(input, section, heads.sections[section.name])); }
      catch (error) {
        if (!(error instanceof RevisionConflict)) throw error;
        const again = extrasHeadsSchema.parse(await input.transport.heads()); input.fence();
        outcomes.push(await syncSection(input, section, again.sections[section.name]));
      }
    } catch (error) {
      input.fence();
      if (error instanceof ExtrasChangedDuringSync) throw error;
      outcomes.push({section: section.name, state: 'error', message: error instanceof Error ? error.message : 'Extras sync was not confirmed. Your records on this device were preserved.'});
    }
  }
  return outcomes;
}

/** "Remove from the cloud": deletes every extras section (each counts a deletion); this device stops syncing them. */
export async function deleteExtrasCopies({transport, manifest, storage, bases, fence}: Omit<SyncInput, 'key'>) {
  const heads = extrasHeadsSchema.parse(await transport.heads()); fence();
  for (const section of EXTRAS_SECTIONS) {
    const head = heads.sections[section.name];
    if (!head.parts && head.revision === 0) continue;
    await transport.write({protocol: 1, action: 'delete', vault: manifest.vault, operation: crypto.randomUUID(), section: section.name, base: head.revision, generation: head.generation}); fence();
  }
  writeExtrasChoice(storage, {...readExtrasChoice(storage), enabled: false});
  await bases.clear();
}

/** The relay's extras calls (lib/server/private-account.ts), with the vault transport's errors. */
export function extrasTransport(account: string, fence: () => void): ExtrasTransport {
  async function request(query: string | null, operation?: unknown) {
    fence();
    const response = await fetch('/api/private-account' + (operation ? '' : `?action=extras${query ? `&section=${query}` : ''}`), {method: operation ? 'POST' : 'GET', headers: {'X-Zigoals-Account': account, ...(operation ? {'Content-Type': 'application/json'} : {})}, ...(operation ? {body: JSON.stringify({action: 'extras', operation})} : {}), cache: 'no-store', signal: AbortSignal.timeout(20000)});
    const text = await response.text(); if (text.length > (operation ? 32768 : 1_100_000)) throw Error('Sync response exceeds capacity.'); fence();
    const data = JSON.parse(text);
    if (!response.ok) {
      if (response.status === 409 && data.error === 'REVISION_CONFLICT') throw new RevisionConflict();
      throw Error(data.error === 'ROTATION_IN_PROGRESS' ? 'A key rotation is in progress. Your extras sync after it.' : data.error === 'EXTRAS_CAPACITY' ? 'These extras are too large to sync. They stay on this device.' : data.error === 'EXTRAS_DELETED' ? 'Your extras were removed from the cloud on another device.' : 'Extras sync was not confirmed. Your records on this device were preserved.');
    }
    return data;
  }
  return {heads: () => request(null), read: section => request(section), write: operation => request(null, operation)};
}

/** This device's bases in IndexedDB (`zigoals-extras-sync-v1`), per account. */
const DB = 'zigoals-extras-sync-v1';
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('bases')) r.result.createObjectStore('bases'); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}
export function indexedDbBases(account: string): ExtrasBases {
  z.uuid().parse(account);
  const id = (section: ExtrasSectionName) => `${account}:${section}`;
  const run = async <T,>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> => {
    const db = await database();
    try { return await new Promise<T | undefined>((resolve, reject) => { const t = db.transaction('bases', mode), r = work(t.objectStore('bases')); t.oncomplete = () => resolve(r ? r.result : undefined); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error); }); }
    finally { db.close(); }
  };
  return {
    get: async section => { const value = await run('readonly', store => store.get(id(section))); const parsed = extrasBaseSchema.safeParse(value); return parsed.success ? parsed.data : null; },
    put: async (section, base) => { await run('readwrite', store => { store.put(extrasBaseSchema.parse(base), id(section)); }); },
    clear: async () => { await run('readwrite', store => { store.delete(IDBKeyRange.bound(`${account}:`, `${account}:￿`)); }); },
  };
}
/** Forgets every account's bases on this device (the account erase). Never throws. */
export async function forgetExtrasBases(): Promise<void> {
  try { if (typeof indexedDB !== 'undefined') await new Promise<void>(resolve => { const r = indexedDB.deleteDatabase(DB); r.onsuccess = r.onerror = r.onblocked = () => resolve(); }); } catch { /* nothing stored */ }
}
