import {describe, expect, test} from 'vitest';
import {AM2_CATALOG_LABELS, AM2_ERASE_KEYS, AM2_EXPORT_KEYS, AM2_PERSONAL_KEYS, NOVA_AGENT_KEY_LITERAL} from './am2-device-keys';
import {askCount, NOVA_AGENT, NOVA_AGENT_KEY, NOVA_AGENT_RESTORE, novaAgentRestoreSchema} from './nova/agent-bridge/record';
import {DEVICE_RECORD_KEYS, NON_PERSONAL_KEYS, noExistingData} from './onboarding';
import {DEVICE_KEYS, EVERYTHING_KEYS, MODULE_KEYS} from './export/everything';
import {DEVICE_ONLY, SYNCED} from './data-health/catalog';
import {EXTRAS_SECTIONS} from './vault/extras-sections';
import {forgetAaDeviceRecords} from './aa-device-forget';
import {DEVICE_PARTS} from './restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from './vault/backup-records';
import {backupFormatVersion} from './vault/backup';

// Session AM-2 (step 4c, item 8; TIER 3 stored format): `zigoals:nova-agent:v1` is wired into every shared registry the
// way AM's `zigoals:nova-world:v1` is (lib/am-device-keys.test.ts): additive, device only, exported, restored through a
// reader that never brings a switch, erased, in the catalog, never synced.
const memory = () => {
  const m = new Map<string, string>();
  const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
  return {m, storage};
};
const full = {version: 1, servers: [{id: 'srv00001', address: 'http://127.0.0.1:8765/mcp', label: 'Fictional tools', addedAt: '2026-11-15T09:00:00.000Z', ask: ['search_notes', 'send_mail']}], agent: {address: 'http://127.0.0.1:8000', model: 'fictional-agent', checkedAt: '2026-11-15T09:00:00.000Z', localConfirmed: true}};
const addressesOnly = {version: 1, servers: [{id: 'srv00001', address: 'http://127.0.0.1:8765/mcp', label: 'Fictional tools', addedAt: '2026-11-15T09:00:00.000Z'}], agent: {address: 'http://127.0.0.1:8000', model: 'fictional-agent'}};

describe('zigoals:nova-agent:v1 in the shared registries', () => {
  test('the literal equals its owner\'s constant; a versioned, personal key: a device holding it is not new', () => {
    expect(NOVA_AGENT_KEY_LITERAL).toBe(NOVA_AGENT_KEY); expect(NOVA_AGENT.key).toBe(NOVA_AGENT_KEY_LITERAL); expect(NOVA_AGENT_KEY).toBe('zigoals:nova-agent:v1');
    expect(NOVA_AGENT_KEY).toMatch(/^zigoals:[a-z-]+:v\d+$/);
    expect(AM2_PERSONAL_KEYS).toContain(NOVA_AGENT_KEY); expect(DEVICE_RECORD_KEYS).toContain(NOVA_AGENT_KEY); expect(NON_PERSONAL_KEYS).not.toContain(NOVA_AGENT_KEY);
    const {storage} = memory(); storage.setItem(NOVA_AGENT_KEY, JSON.stringify({version: 1}));
    expect(noExistingData(storage)).toBe(false);
  });
  test('in Export everything under its own name, never a synced module key', () => {
    expect(AM2_EXPORT_KEYS.novaAgent).toBe(NOVA_AGENT_KEY);
    expect((DEVICE_KEYS as Record<string, string>).novaAgent).toBe(NOVA_AGENT_KEY);
    expect(EVERYTHING_KEYS).toContain(NOVA_AGENT_KEY); expect(Object.values(MODULE_KEYS)).not.toContain(NOVA_AGENT_KEY);
  });
  test('the data catalog lists it once, on this device only; no encrypted sync section carries it', () => {
    const [label, area] = AM2_CATALOG_LABELS.novaAgent;
    expect(label).toMatch(/never a token/); expect(area).toBe('NOVA');
    expect(DEVICE_ONLY.filter(entry => entry.key === NOVA_AGENT_KEY)).toEqual([{key: NOVA_AGENT_KEY, label, home: 'device', area}]);
    expect(SYNCED.map(entry => entry.key)).not.toContain(NOVA_AGENT_KEY);
    expect(EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key))).not.toContain(NOVA_AGENT_KEY);
  });
  test('the account erase removes it and leaves other records alone', () => {
    expect(AM2_ERASE_KEYS).toContain(NOVA_AGENT_KEY);
    const {m, storage} = memory();
    storage.setItem(NOVA_AGENT_KEY, JSON.stringify(full)); storage.setItem('zigoals:unrelated-am2-agent-test:v1', '{}');
    forgetAaDeviceRecords(storage);
    expect(m.has(NOVA_AGENT_KEY)).toBe(false); expect(m.has('zigoals:unrelated-am2-agent-test:v1')).toBe(true);
  });
  test('a restore brings it back through the reader that never brings a switch, in Today and Life, outside the Health choice', () => {
    const parts = DEVICE_PARTS.filter(part => part.key === NOVA_AGENT_KEY);
    expect(parts.map(part => ({id: part.id, name: part.name, label: part.label, group: part.group, health: part.health}))).toEqual([{id: 'device:novaAgent', name: 'novaAgent', label: 'NOVA own agent and tool server addresses', group: 'Today and Life', health: false}]);
    expect(parts[0]!.schema).toBe(NOVA_AGENT_RESTORE.schema); expect(NOVA_AGENT_RESTORE.schema).toBe(novaAgentRestoreSchema); expect(parts[0]!.schema).not.toBe(NOVA_AGENT.schema);
    expect(sectionOf(parts[0]!)).toBe('lifeRecords');
    expect(JSON.parse(JSON.stringify(parts[0]!.schema.parse(full)))).toEqual(addressesOnly);
    // A crafted file: no spelling of "on" arrives, another host's row is left out, a version this build does not know is refused.
    const crafted = {version: 1, servers: [{id: 'evil0001', address: 'https://evil.example/mcp', label: 'x', ask: ['run']}, {id: 'srv00002', address: 'http://localhost:9000/mcp', label: 'y', ask: ['a'], always: ['a'], mode: 'always', allow: true}]};
    const read = parts[0]!.schema.parse(crafted) as Parameters<typeof askCount>[0];
    expect(askCount(read)).toBe(0); expect(read.servers!.map(s => s.address)).toEqual(['http://localhost:9000/mcp']);
    expect(parts[0]!.schema.safeParse({version: 2, servers: []}).success).toBe(false);
  });
  test('the encrypted backup carries the addresses in its Today and Life section, still format 4; a fresh device gets them with every tool Off', () => {
    const here = memory();
    here.storage.setItem(NOVA_AGENT_KEY, JSON.stringify(full));
    const {sections, warnings} = exportRecordSections(here.storage, {health: false});
    expect(warnings).toEqual([]); expect(Object.keys(sections)).toEqual(['lifeRecords']); expect(backupFormatVersion(Object.keys(sections))).toBe(4);
    // The backup itself holds no switch and no confirmation.
    expect((JSON.parse(sections.lifeRecords!) as {records: Record<string, unknown>}).records).toEqual({'device:novaAgent': addressesOnly});
    // Making the backup changes nothing on this device: its switches stay.
    expect(JSON.parse(here.m.get(NOVA_AGENT_KEY)!)).toEqual(full);
    const fresh = memory();
    expect(restoreRecordSection(fresh.storage, 'lifeRecords', sections.lifeRecords!)).toEqual({restored: ['NOVA own agent and tool server addresses'], skipped: 0});
    expect(JSON.parse(fresh.m.get(NOVA_AGENT_KEY)!)).toEqual(addressesOnly);
    // A backup made by hand (or crafted) that carries switches: the addresses arrive, the switches do not.
    const older = JSON.stringify({format: 'zigoals-device-records-backup', version: 1, records: {'device:novaAgent': full}});
    const other = memory();
    expect(restoreRecordSection(other.storage, 'lifeRecords', older)).toEqual({restored: ['NOVA own agent and tool server addresses'], skipped: 0});
    expect(JSON.parse(other.m.get(NOVA_AGENT_KEY)!)).toEqual(addressesOnly);
    // A record that is only its empty value is not carried.
    const empty = memory(); empty.storage.setItem(NOVA_AGENT_KEY, JSON.stringify(NOVA_AGENT.empty()));
    expect(exportRecordSections(empty.storage, {health: false}).sections).toEqual({});
  });
});
