import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {AM2_CATALOG_LABELS, AM2_DISPLAY_KEYS, AM2_ERASE_KEYS, AM2_EXPORT_KEYS, AM2_PERSONAL_KEYS, NOVA_AGENT_KEY_LITERAL, NOVA_OUTBOX_KEY_LITERAL} from './am2-device-keys';
import {NOVA_OUTBOX, NOVA_OUTBOX_KEY} from './nova/outbox/record';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {EXTRAS_SECTIONS} from './vault/extras-sections';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from './vault/backup-records';
import {backupFormatVersion} from './vault/backup';

// Session AM-2 (TIER 3 stored format): the outbox key is wired into every shared registry (the lib/am-device-keys.test.ts
// checks, for this session's module), and it never travels in encrypted sync.
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const all = [...AM2_PERSONAL_KEYS, ...AM2_DISPLAY_KEYS];
const record = {version: 1, entries: [{at: '2026-11-15T09:05:00.000Z', kind: 'tool', what: 'search_notes', target: '127.0.0.1:8765', ok: true}, {at: '2026-11-15T09:00:00.000Z', kind: 'handoff', what: 'Email draft', target: 'fictional@example.com', ok: true}]};

describe('Session AM-2 device keys', () => {
  test('the literal equals its owner\'s constant', () => {
    expect(NOVA_OUTBOX_KEY_LITERAL).toBe(NOVA_OUTBOX_KEY);
    expect(NOVA_OUTBOX.key).toBe(NOVA_OUTBOX_KEY_LITERAL);
    expect(NOVA_OUTBOX_KEY).toBe('zigoals:nova-outbox:v1');
  });
  test('a versioned, personal key: a device holding it is not new', () => {
    // Step 4c (deliberate, additive): the own-agent record joined this session's keys; its own checks are in lib/am2-agent-keys.test.ts.
    expect(all).toEqual([NOVA_OUTBOX_KEY_LITERAL, NOVA_AGENT_KEY_LITERAL]);
    for (const key of all) expect(key).toMatch(/^zigoals:[a-z-]+:v\d+$/);
    for (const key of AM2_PERSONAL_KEYS) {
      expect(DEVICE_RECORD_KEYS).toContain(key); expect(NON_PERSONAL_KEYS).not.toContain(key);
      const {storage} = memory(); storage.setItem(key, JSON.stringify({version: 1}));
      expect(noExistingData(storage), key).toBe(false);
    }
  });
  test('in Export everything under its own name, never a synced module key', () => {
    expect(Object.values(AM2_EXPORT_KEYS).sort()).toEqual([...all].sort());
    for (const [name, key] of Object.entries(AM2_EXPORT_KEYS)) {
      expect((DEVICE_KEYS as Record<string, string>)[name]).toBe(key);
      expect(EVERYTHING_KEYS).toContain(key);
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
    }
  });
  test('the data catalog lists it once, on this device only; no encrypted sync section carries it', () => {
    expect(Object.keys(AM2_CATALOG_LABELS).sort()).toEqual(Object.keys(AM2_EXPORT_KEYS).sort());
    const [label, area] = AM2_CATALOG_LABELS.novaOutbox;
    expect(DEVICE_ONLY.filter(entry => entry.key === NOVA_OUTBOX_KEY)).toEqual([{key: NOVA_OUTBOX_KEY, label, home: 'device', area}]);
    expect(SYNCED.map(entry => entry.key)).not.toContain(NOVA_OUTBOX_KEY);
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key))).not.toContain(NOVA_OUTBOX_KEY);
  });
  test('the account erase removes it and leaves other records alone', () => {
    expect([...AM2_ERASE_KEYS].sort()).toEqual([...all].sort());
    const {m, storage} = memory();
    for (const key of all) storage.setItem(key, JSON.stringify(record));
    storage.setItem('zigoals:unrelated-am2-test:v1', '{}');
    forgetAaDeviceRecords(storage);
    for (const key of all) expect(m.has(key), key).toBe(false);
    expect(m.has('zigoals:unrelated-am2-test:v1')).toBe(true);
  });
  test('a restore brings it back with its own reader, in Today and Life, outside the Health choice', () => {
    const parts = DEVICE_PARTS.filter(part => part.key === NOVA_OUTBOX_KEY);
    expect(parts.map(part => ({id: part.id, name: part.name, label: part.label, group: part.group, health: part.health}))).toEqual([{id: 'device:novaOutbox', name: 'novaOutbox', label: 'NOVA sent-out history', group: 'Today and Life', health: false}]);
    expect(parts[0]!.schema).toBe(NOVA_OUTBOX.schema);
    expect(AM2_EXPORT_KEYS.novaOutbox).toBe(NOVA_OUTBOX_KEY);
    expect(sectionOf(parts[0]!)).toBe('lifeRecords');
    // A crafted file: an entry this build cannot read is left out, a version it does not know is refused.
    expect(parts[0]!.schema.parse({version: 1, entries: [{at: 'never', kind: 'handoff', what: 'x', target: '', ok: true}, record.entries[1]]})).toEqual({version: 1, entries: [record.entries[1]]});
    expect(parts[0]!.schema.safeParse({version: 2, entries: []}).success).toBe(false);
  });
  test('the encrypted backup carries it in its Today and Life section, still format 4; a fresh device gets it back whole', () => {
    const here = memory();
    here.storage.setItem(NOVA_OUTBOX_KEY, JSON.stringify(record));
    const {sections, warnings} = exportRecordSections(here.storage, {health: false});
    expect(warnings).toEqual([]);
    expect(Object.keys(sections)).toEqual(['lifeRecords']);
    expect(backupFormatVersion(Object.keys(sections))).toBe(4);
    expect((JSON.parse(sections.lifeRecords!) as {records: Record<string, unknown>}).records).toEqual({'device:novaOutbox': record});
    const fresh = memory();
    expect(restoreRecordSection(fresh.storage, 'lifeRecords', sections.lifeRecords!)).toEqual({restored: ['NOVA sent-out history'], skipped: 0});
    expect(JSON.parse(fresh.m.get(NOVA_OUTBOX_KEY)!)).toEqual(record);
    // A record that is only its empty value is not carried.
    const empty = memory();
    empty.storage.setItem(NOVA_OUTBOX_KEY, JSON.stringify(NOVA_OUTBOX.empty()));
    expect(exportRecordSections(empty.storage, {health: false}).sections).toEqual({});
  });
  test('PRIVACY.md names the key, what it holds and never holds, the hand-offs and the weather proxy with who sees what', () => {
    const privacy = readFileSync(join(__dirname, '../../../docs/PRIVACY.md'), 'utf8').replace(/\s+/g, ' ');
    for (const key of AM2_ERASE_KEYS) expect(privacy).toContain(`\`${key}\``);
    for (const words of [
      'when, what kind (for example "Email draft"), the address or site the card showed, and whether it went through',
      'Never the subject, the text, a note, a link\'s path or a tool\'s arguments or result.', 'At most 200 lines, on this device only: never synced',
      'NOVA never sends anything by itself', 'does nothing until you press its button', 'you send it there; ZIGoals makes no SMTP or API call and never sees a mailbox, a password or a token',
      'Nothing goes through a ZIGoals server.', 'the model can only ask for a card (the `hand_off` lookup returns nothing of yours to it) and can never press it',
      'Text that looks like recovery words, a private key, a password or a card number is never put on a card.',
      'only while NOVA\'s Health permission and this device\'s Health switch are both on',
      'build setting `NEXT_PUBLIC_WEATHER_PROXY_URL`', 'No build has it until then, and without it nothing above changes.',
      '**The proxy sees your network (IP) address and the place rounded to two decimals (about 1 km)**', '**MET Norway sees the proxy\'s address, the proxy\'s own User-Agent and that rounded place, never yours.**',
      'your browser never asks MET Norway directly instead', 'Sunrise and sunset are worked out on your device in such a build',
    ]) expect(privacy, words).toContain(words);
  });
});
