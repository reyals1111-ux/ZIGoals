import {afterEach, describe, expect, test, vi} from 'vitest';
import {createVault} from './crypto';
import {EXTRAS_HEADS_QUERY, SERVICE_UPDATE_NOTE, applySection, collectSection, extrasHeadsSchema, extrasTransport, mergeSection, openSection, sealSection, sectionText, syncExtras, type ExtrasBase, type ExtrasTransport} from './extras-sync';
import {EXTRAS_SECTIONS} from './extras-sections';
import {EXTRAS_OPTIONAL_SECTIONS} from './extras-keys';
import {NOVA_DEVICE_FIELDS, NOVA_STAGE_DEVICE_FIELDS, NOVA_SYNC_FIELDS, fitNovaArrangement, fitNovaStage} from './extras-nova';
import {MAX_WIDGETS, NOVA_KEY, NOVA_STORE, novaRecordSchema, widgetsFor} from '../nova/store';
import {MAX_ASKS, NOVA_STAGE, NOVA_STAGE_KEY, asksOf, novaStageSchema} from '../nova/stage/record';
import {NOVA_WORLD_KEY} from '../nova/world/record';
import {setGoalReasons, emptyGoalExtras} from '../goal-extras/store';

// Session AM (ADR-038 O2, D18, D19, A6; TIER 3 (sync)): the `nova` extras section. Of `zigoals:nova:v1` exactly the
// layout and the pinned widgets travel, by allow-list; the stage record travels but for its three per-device choices
// (security review AM-S11: keep, proactive, gentle). An in-memory cloud with the
// Worker's rules stands in for private sync (the Worker itself, deployed and new, is proven in
// scripts/run11/extras-nova-a6.test.mjs). Fictional records only.
const nova = EXTRAS_SECTIONS.find(s => s.name === 'nova')!;
type Head = {revision: number; generation: number; epoch: number | null; parts: unknown[]};
/** `listed`: the sections this service names in its heads (a service from before NOVA lists the four and the Checklist). */
function memoryCloud(listed: string[] = ['goals', 'life', 'habits', 'health', 'checklist', 'nova']) {
  const sections: Record<string, Head> = Object.fromEntries(['goals', 'life', 'habits', 'health', 'checklist', 'nova'].map(s => [s, {revision: 0, generation: 0, epoch: null, parts: []}]));
  const calls: string[] = [], state = {listed};
  const transport: ExtrasTransport = {
    heads: async () => { calls.push('heads'); return {protocol: 1, sections: Object.fromEntries(state.listed.map(k => [k, {revision: sections[k]!.revision, generation: sections[k]!.generation, epoch: sections[k]!.epoch, parts: sections[k]!.parts.length}]))}; },
    read: async section => { calls.push(`read:${section}`); if (!state.listed.includes(section)) throw Error('INVALID_EXTRAS_REQUEST'); const h = sections[section]!; return {protocol: 1, section, revision: h.revision, generation: h.generation, epoch: h.epoch, parts: h.parts}; },
    write: async (op: unknown) => {
      const o = op as {section: string; base: number; generation: number; epoch: number; parts: unknown[]};
      calls.push(`write:${o.section}`); if (!state.listed.includes(o.section)) throw Error('INVALID_EXTRAS_REQUEST'); const h = sections[o.section]!;
      if (o.base !== h.revision || o.generation !== h.generation) throw Error('REVISION_CONFLICT');
      sections[o.section] = {revision: h.revision + 1, generation: h.generation, epoch: o.epoch, parts: o.parts};
      return {revision: h.revision + 1, generation: h.generation};
    },
  };
  return {sections, calls, transport, state};
}
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear(), m} as Storage & {m: Map<string, string>}; }
function memoryBases() { const m = new Map<string, ExtrasBase>(); return {get: async (s: string) => m.get(s) ?? null, put: async (s: string, b: ExtrasBase) => { m.set(s, structuredClone(b)); }, clear: async () => m.clear(), m}; }
async function account(listed?: string[]) {
  const vault = await createVault(), cloud = memoryCloud(listed);
  const device = () => { const storage = memoryStorage(), bases = memoryBases(); return {storage, bases, sync: () => syncExtras({transport: cloud.transport, key: vault.key, manifest: vault.manifest, storage, bases: bases as never, fence: () => {}, health: true})}; };
  /** What the cloud holds of the NOVA section, opened with the vault key. */
  const cloudNova = async () => { const h = cloud.sections.nova!; const text = await openSection(vault.key, vault.manifest, {protocol: 1, section: 'nova', revision: h.revision, generation: h.generation, epoch: h.epoch, parts: h.parts}); return text === null ? null : (JSON.parse(text) as {records: Record<string, Record<string, unknown>>}).records; };
  /** Another build's device writes the NOVA section directly (sealed as that device would). */
  const putNova = async (records: Record<string, unknown>) => { const h = cloud.sections.nova!; cloud.sections.nova = {revision: h.revision + 1, generation: h.generation, epoch: vault.manifest.epoch, parts: await sealSection(vault.key, vault.manifest, 'nova', h.revision + 1, sectionText(records))}; };
  return {vault, cloud, device, cloudNova, putNova};
}
const byState = (o: {section: string; state: string}[]) => Object.fromEntries(o.map(x => [x.section, x.state]));
const read = (d: {storage: Storage}, key: string) => JSON.parse(d.storage.getItem(key) ?? 'null');
const at = (n: number) => new Date(Date.UTC(2026, 10, 11, 8, 0, n)).toISOString();
const ask = (id: string, n: number, device: 'phone' | 'computer' = 'computer', widgets: string[] = []) => ({id, at: at(n), text: `Fictional request ${id}`, ...(widgets.length ? {widgets} : {}), device, by: 'device'});
/** Every field NOVA's own record has today, each with a value its schema accepts. */
const FULL = {version: 1, openingSeen: true, layout: 'bento', widgets: [{id: 'orbit', size: 'M', slot: 0}, {id: 'water', size: 'S', slot: 1}], dock: {order: ['today', 'goals'], hidden: ['wealth']}, persona: {name: 'Fictional Ava', avatar: 'zigi'}, accent: 'cyan', customInstructions: 'Fictional: be brief.', shortcuts: false, yourName: 'Fictional Rey', panels: {left: 'rail', right: 'open', folded: ['usage']}, routing: 'fictional-model', wake: true, startOnNova: true};

describe('what travels, pinned (D18)', () => {
  // Session AM (AM-S11, deliberate): the stage record no longer travels whole (was: `deviceFields` undefined). Its three
  // per-device choices stay on each device by deny-list, exactly these three; no allow-list, still written as stored.
  test('the section: the stage record but for its three per-device choices, and of NOVA\'s own record the layout and the pinned widgets by allow-list; account consent', () => {
    expect(nova.consent).toBe('account');
    expect(nova.records.map(r => r.spec)).toEqual([NOVA_STAGE, NOVA_STORE]);
    const [stage, own] = nova.records;
    expect([stage!.deviceFields, stage!.syncFields, stage!.verbatim]).toEqual([['keep', 'proactive', 'gentle'], undefined, true]);
    expect(stage!.deviceFields).toBe(NOVA_STAGE_DEVICE_FIELDS);
    expect([own!.syncFields, own!.deviceFields, own!.verbatim]).toEqual([['layout', 'widgets'], NOVA_DEVICE_FIELDS, true]);
    expect(NOVA_SYNC_FIELDS).toEqual(['layout', 'widgets']);
    // No other section uses the allow-list, the as-stored rule or a fit: the sections before Session AM behave as they did.
    for (const s of EXTRAS_SECTIONS.filter(x => x.name !== 'nova')) for (const r of s.records) expect([r.syncFields, r.verbatim, r.fit], r.spec.key).toEqual([undefined, undefined, undefined]);
  });
  test('every field of zigoals:nova:v1 is decided: version, the two that travel, or one named as staying on the device', () => {
    const fields = Object.keys(novaRecordSchema.shape);
    expect([...fields].sort()).toEqual(['version', ...NOVA_SYNC_FIELDS, ...NOVA_DEVICE_FIELDS].sort());
    expect(NOVA_DEVICE_FIELDS).toEqual(['openingSeen', 'dock', 'persona', 'accent', 'customInstructions', 'shortcuts', 'yourName', 'panels', 'routing', 'wake', 'startOnNova']);
    expect(NOVA_SYNC_FIELDS.filter(f => NOVA_DEVICE_FIELDS.includes(f))).toEqual([]);
    // The example below really holds every one of them, so the checks that follow cover the whole record.
    expect(Object.keys(FULL).sort()).toEqual([...fields].sort());
    expect(novaRecordSchema.safeParse(FULL).success).toBe(true);
  });
  test('zigoals:nova-world:v1 and every other NOVA key are in no section', () => {
    const keys = EXTRAS_SECTIONS.flatMap(s => s.records.map(r => r.spec.key));
    expect(keys.filter(k => k.includes('nova')).sort()).toEqual([NOVA_STAGE_KEY, NOVA_KEY].sort());
    for (const key of [NOVA_WORLD_KEY, 'zigoals:nova-bridge:v1', 'zigoals:nova-briefs:v1', 'zigoals:nova-workflows:v1', 'zigoals:nova-setup:v1', 'zigoals:nova-hermes:v1', 'zigoals:nova-hud:v1']) expect(keys).not.toContain(key);
  });
  test('collected for sync: exactly the layout and the widgets; no other field, and not a field a later build adds', () => {
    const storage = memoryStorage();
    storage.setItem(NOVA_KEY, JSON.stringify({...FULL, laterBuildField: {secret: 'Fictional later value'}, theme: 'later-theme'}));
    const collected = collectSection(storage, nova);
    expect(collected.unreadable).toEqual([]);
    expect(collected.records[NOVA_KEY]).toEqual({layout: 'bento', widgets: FULL.widgets});
    const text = sectionText(collected.records);
    for (const field of [...NOVA_DEVICE_FIELDS, 'laterBuildField', 'theme', 'version']) expect(Object.keys(collected.records[NOVA_KEY] as object), field).not.toContain(field);
    for (const words of ['Fictional Ava', 'be brief', 'Fictional Rey', 'fictional-model', 'Fictional later value', 'later-theme', 'cyan', 'rail', 'usage', 'wealth']) expect(text, words).not.toContain(words);
    // Each device field alone, on a record with nothing that travels: nothing of it is collected.
    for (const field of NOVA_DEVICE_FIELDS) {
      const one = memoryStorage(); one.setItem(NOVA_KEY, JSON.stringify({version: 1, [field]: (FULL as Record<string, unknown>)[field]}));
      expect(collectSection(one, nova).records[NOVA_KEY], field).toEqual({});
    }
  });
  test('written from another device: only the two fields; everything else the key holds stays byte for byte, a later build\'s field included; the record is never removed', () => {
    const mine = {version: 1, openingSeen: true, widgets: [{id: 'sleep', size: 'S', slot: 0}], persona: {name: 'Fictional Bee'}, panels: {left: 'open', folded: ['memory']}, yourName: 'Fictional Bo', laterBuildField: {keep: [1, 2, 3]}};
    const target = {[NOVA_KEY]: {layout: 'focus', widgets: [{id: 'orbit', size: 'L', slot: 0}], theme: 'a-later-build-travels-this'}};
    const storage = memoryStorage(); storage.setItem(NOVA_KEY, JSON.stringify(mine));
    expect(applySection(storage, nova, collectSection(storage, nova), target)).toEqual([NOVA_KEY]);
    const after = read({storage}, NOVA_KEY);
    expect(after).toEqual({...mine, layout: 'focus', widgets: [{id: 'orbit', size: 'L', slot: 0}]});
    expect(after.theme).toBeUndefined();
    for (const field of ['openingSeen', 'persona', 'panels', 'yourName', 'laterBuildField']) expect(JSON.stringify(after[field]), field).toBe(JSON.stringify((mine as Record<string, unknown>)[field]));
    // The same again changes nothing (compare before write).
    expect(applySection(storage, nova, collectSection(storage, nova), target)).toEqual([]);
    // The other devices no longer hold an arrangement: the two fields are cleared here, the rest stays, the key stays.
    expect(applySection(storage, nova, collectSection(storage, nova), {})).toEqual([NOVA_KEY]);
    expect(read({storage}, NOVA_KEY)).toEqual({version: 1, openingSeen: true, persona: {name: 'Fictional Bee'}, panels: {left: 'open', folded: ['memory']}, yourName: 'Fictional Bo', laterBuildField: {keep: [1, 2, 3]}});
    expect(applySection(storage, nova, collectSection(storage, nova), {})).toEqual([]);
    // A device with no NOVA record yet gets one that holds the arrangement and nothing else.
    const fresh = memoryStorage();
    expect(applySection(fresh, nova, collectSection(fresh, nova), target)).toEqual([NOVA_KEY]);
    expect(read({storage: fresh}, NOVA_KEY)).toEqual({version: 1, layout: 'focus', widgets: [{id: 'orbit', size: 'L', slot: 0}]});
    // An arrangement this build's schema refuses changes nothing.
    const before = storage.getItem(NOVA_KEY);
    expect(() => applySection(storage, nova, collectSection(storage, nova), {[NOVA_KEY]: {widgets: [{id: 'Not An Id', size: 'M', slot: 0}]}})).toThrow(/could not be combined/);
    expect(storage.getItem(NOVA_KEY)).toBe(before);
  });
  test('a field of zigoals:nova:v1 that a later build lets travel is carried in the cloud copy as it is, and never merged, read or dropped here', () => {
    const remote = {[NOVA_KEY]: {layout: 'bento', widgets: FULL.widgets, theme: {later: true}}, 'zigoals:nova-later-record:v3': {version: 3, list: [1, 2]}};
    const merged = mergeSection(nova, remote, {[NOVA_KEY]: {layout: 'focus', widgets: FULL.widgets}}, remote);
    expect(merged).toEqual({[NOVA_KEY]: {layout: 'focus', widgets: FULL.widgets, theme: {later: true}}, 'zigoals:nova-later-record:v3': {version: 3, list: [1, 2]}});
    // Nothing changed here: the merge is the cloud copy, so nothing is uploaded.
    expect(sectionText(mergeSection(nova, remote, {[NOVA_KEY]: {layout: 'bento', widgets: FULL.widgets}}, remote))).toBe(sectionText(remote));
    // This device holds no NOVA record: the later build's field alone is still carried.
    expect(mergeSection(nova, undefined, {}, {[NOVA_KEY]: {theme: {later: true}}})).toEqual({[NOVA_KEY]: {theme: {later: true}}});
  });
});

describe('two devices (D18, D19)', () => {
  test('a request asked on the phone and the widgets pinned there appear on the computer; the computer\'s side bars, persona and names stay its own', async () => {
    const {device, cloudNova} = await account();
    const phone = device(), computer = device();
    phone.storage.setItem(NOVA_KEY, JSON.stringify({...FULL, layout: 'focus', widgets: [{id: 'weight', size: 'M', slot: 0}, {id: 'steps', size: 'S', slot: 1}]}));
    phone.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, made: [{id: 'habit-week', at: at(5)}], hidden: ['steps'], params: {weight: {range: 'month'}}, asks: [ask('a-phone-1', 5, 'phone', ['habit-week'])], keep: true}));
    const own = {version: 1, openingSeen: false, persona: {name: 'Fictional Desk', avatar: 'orb'}, panels: {left: 'open', right: 'hidden'}, accent: 'gold', yourName: 'Fictional Dee', customInstructions: 'Fictional: the computer\'s own.', startOnNova: false};
    computer.storage.setItem(NOVA_KEY, JSON.stringify(own));
    computer.storage.setItem(NOVA_WORLD_KEY, JSON.stringify({version: 1, on: true}));
    expect(byState(await phone.sync()).nova).toBe('pushed');
    expect(byState(await computer.sync()).nova).toBe('pulled');
    // D19: the phone's request, with its widgets and where it was asked.
    expect(asksOf(novaStageSchema.parse(read(computer, NOVA_STAGE_KEY)))).toEqual([{id: 'a-phone-1', at: at(5), text: 'Fictional request a-phone-1', widgets: ['habit-week'], device: 'phone', by: 'device'}]);
    // Session AM (AM-S11, deliberate): was "the computer's stage record equals the phone's". The phone's "keep until I
    // close" is the phone's own choice: every other field arrives exactly as the phone holds it, that one does not, and
    // the phone still has it.
    const {keep: phoneKeeps, ...travelled} = read(phone, NOVA_STAGE_KEY);
    expect(phoneKeeps).toBe(true);
    expect(read(computer, NOVA_STAGE_KEY)).toEqual(travelled);
    expect(read(computer, NOVA_STAGE_KEY)).toEqual({version: 1, made: [{id: 'habit-week', at: at(5)}], hidden: ['steps'], params: {weight: {range: 'month'}}, asks: [ask('a-phone-1', 5, 'phone', ['habit-week'])]});
    // The pinned widgets and the layout.
    expect(widgetsFor(novaRecordSchema.parse(read(computer, NOVA_KEY))).map(w => w.id)).toEqual(['weight', 'steps']);
    expect(read(computer, NOVA_KEY)).toEqual({...own, layout: 'focus', widgets: [{id: 'weight', size: 'M', slot: 0}, {id: 'steps', size: 'S', slot: 1}]});
    // The phone's own fields did not move, in either direction.
    expect(read(phone, NOVA_KEY).persona).toEqual(FULL.persona);
    expect(read(phone, NOVA_KEY).panels).toEqual(FULL.panels);
    // What the cloud holds: the stage record, and of NOVA's own record the two fields only. The weather record is not there.
    const held = (await cloudNova())!;
    expect(Object.keys(held).sort()).toEqual([NOVA_STAGE_KEY, NOVA_KEY].sort());
    expect(held[NOVA_KEY]).toEqual({layout: 'focus', widgets: [{id: 'weight', size: 'M', slot: 0}, {id: 'steps', size: 'S', slot: 1}]});
    expect(held[NOVA_STAGE_KEY]).toEqual(travelled); // AM-S11: the sealed copy holds no "keep" either
    expect(computer.storage.getItem(NOVA_WORLD_KEY)).toBe('{"version":1,"on":true}');
    expect(phone.storage.getItem(NOVA_WORLD_KEY)).toBeNull();
    // Settled: nothing more to send from either side.
    expect(byState(await phone.sync()).nova).toBe('unchanged');
    expect(byState(await computer.sync()).nova).toBe('unchanged');
    // The computer folds a side bar and renames NOVA: device fields, so nothing is sent and the phone is not touched.
    computer.storage.setItem(NOVA_KEY, JSON.stringify({...read(computer, NOVA_KEY), panels: {left: 'hidden'}, persona: {name: 'Fictional Renamed'}}));
    expect(byState(await computer.sync()).nova).toBe('unchanged');
    expect(byState(await phone.sync()).nova).toBe('unchanged');
    expect(read(phone, NOVA_KEY).persona).toEqual(FULL.persona);
  });
  // Security review AM-S11: whether made widgets are kept, whether gentle cards are on and which this device showed today.
  test('AM-S11: every field of the stage record is decided: version, the four that travel, or one of the three that stay on the device', () => {
    expect(NOVA_STAGE_DEVICE_FIELDS).toEqual(['keep', 'proactive', 'gentle']);
    expect(Object.keys(novaStageSchema.shape).sort()).toEqual(['version', 'made', 'hidden', 'params', 'asks', ...NOVA_STAGE_DEVICE_FIELDS].sort());
    // Collected for sync: everything but the three, a later build's field included; each of the three alone is nothing to send.
    const full = {version: 1, made: [{id: 'weight', at: at(1)}], hidden: ['steps'], params: {weight: {range: 'month'}}, asks: [ask('a1', 1, 'phone', ['weight'])], keep: true, proactive: true, gentle: {day: '2026-11-11', shown: ['weight']}, laterTop: {a: 1}};
    expect(novaStageSchema.safeParse(full).success).toBe(true);
    const storage = memoryStorage(); storage.setItem(NOVA_STAGE_KEY, JSON.stringify(full));
    const {keep, proactive, gentle, ...travels} = full;
    expect([keep, proactive, gentle]).toEqual([true, true, {day: '2026-11-11', shown: ['weight']}]);
    expect(collectSection(storage, nova).records[NOVA_STAGE_KEY]).toEqual(travels);
    expect(sectionText(collectSection(storage, nova).records)).not.toMatch(/"keep"|"proactive"|"gentle"/);
    for (const field of NOVA_STAGE_DEVICE_FIELDS) {
      const one = memoryStorage(); one.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, [field]: (full as Record<string, unknown>)[field]}));
      expect(collectSection(one, nova).records[NOVA_STAGE_KEY], field).toEqual({version: 1});
    }
    // Written from another device: what travels is taken, this device's three choices stay byte for byte.
    const mine = {version: 1, asks: [ask('m1', 2)], keep: true, proactive: true, gentle: {day: '2026-11-10', shown: ['sleep']}};
    const here = memoryStorage(); here.setItem(NOVA_STAGE_KEY, JSON.stringify(mine));
    expect(applySection(here, nova, collectSection(here, nova), {[NOVA_STAGE_KEY]: travels})).toEqual([NOVA_STAGE_KEY]);
    expect(read({storage: here}, NOVA_STAGE_KEY)).toEqual({...travels, keep: true, proactive: true, gentle: {day: '2026-11-10', shown: ['sleep']}});
    // The same again changes nothing (compare before write).
    expect(applySection(here, nova, collectSection(here, nova), {[NOVA_STAGE_KEY]: travels})).toEqual([]);
  });
  test('AM-S11: a device\'s keep, gentle cards and today\'s shown cards never reach the other device or the cloud; changing only them sends nothing', async () => {
    const {device, cloud, cloudNova} = await account();
    const phone = device(), computer = device();
    const phoneOwn = {keep: true, proactive: true, gentle: {day: '2026-11-11', shown: ['weight', 'sleep']}}, computerOwn = {gentle: {day: '2026-11-10', shown: ['tasks']}};
    phone.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, made: [{id: 'weight', at: at(5)}], asks: [ask('a-phone-1', 5, 'phone', ['weight'])], ...phoneOwn}));
    computer.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, ...computerOwn}));
    expect(byState(await phone.sync()).nova).toBe('pushed');
    await computer.sync(); await phone.sync(); await computer.sync();
    const travels = {version: 1, made: [{id: 'weight', at: at(5)}], asks: [ask('a-phone-1', 5, 'phone', ['weight'])]};
    expect((await cloudNova())![NOVA_STAGE_KEY]).toEqual(travels);
    expect(read(phone, NOVA_STAGE_KEY)).toEqual({...travels, ...phoneOwn});
    expect(read(computer, NOVA_STAGE_KEY)).toEqual({...travels, ...computerOwn});
    expect([read(computer, NOVA_STAGE_KEY).keep, read(computer, NOVA_STAGE_KEY).proactive]).toEqual([undefined, undefined]);
    // The computer turns its own gentle cards on and the phone turns "keep" off: nothing is written to the cloud, neither device changes the other.
    cloud.calls.length = 0;
    computer.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({...read(computer, NOVA_STAGE_KEY), proactive: true}));
    const phoneWithout = read(phone, NOVA_STAGE_KEY); delete phoneWithout.keep;
    phone.storage.setItem(NOVA_STAGE_KEY, JSON.stringify(phoneWithout));
    expect([byState(await computer.sync()).nova, byState(await phone.sync()).nova, byState(await computer.sync()).nova]).toEqual(['unchanged', 'unchanged', 'unchanged']);
    expect(cloud.calls.filter(c => c.startsWith('write'))).toEqual([]);
    expect((await cloudNova())![NOVA_STAGE_KEY]).toEqual(travels);
    expect(read(phone, NOVA_STAGE_KEY)).toEqual({...travels, proactive: true, gentle: phoneOwn.gentle});
    expect(read(computer, NOVA_STAGE_KEY)).toEqual({...travels, ...computerOwn, proactive: true});
    // A travelling change still goes both ways, and still without the three.
    phone.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({...read(phone, NOVA_STAGE_KEY), hidden: ['weight']}));
    expect(byState(await phone.sync()).nova).toBe('pushed');
    expect(byState(await computer.sync()).nova).toBe('pulled');
    expect((await cloudNova())![NOVA_STAGE_KEY]).toEqual({...travels, hidden: ['weight']});
    expect(read(computer, NOVA_STAGE_KEY)).toEqual({...travels, hidden: ['weight'], ...computerOwn, proactive: true});
  });
  test('AM-S11 (second pass): a cloud copy that carries keep, gentle cards or shown cards anyway (another build\'s, a tampered one) sets none of them on a device that holds none, and never replaces a device\'s own', async () => {
    const {device, putNova} = await account();
    const fresh = device(), chosen = device();
    chosen.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, proactive: false, made: []}));
    await putNova({[NOVA_STAGE_KEY]: {version: 1, made: [{id: 'habit-week', at: at(5)}], asks: [ask('a-other-1', 5, 'phone', ['habit-week'])], keep: true, proactive: true, gentle: {day: '2026-11-11', shown: ['plan']}}});
    expect(byState(await fresh.sync()).nova).toBe('pulled');
    expect(read(fresh, NOVA_STAGE_KEY)).toEqual({version: 1, made: [{id: 'habit-week', at: at(5)}], asks: [ask('a-other-1', 5, 'phone', ['habit-week'])]});
    await chosen.sync();
    const mine = read(chosen, NOVA_STAGE_KEY);
    expect([mine.keep, mine.proactive, mine.gentle]).toEqual([undefined, false, undefined]);
    expect(mine.asks).toEqual([ask('a-other-1', 5, 'phone', ['habit-week'])]);
  });
  test('both ask and both pin while apart: every request is kept, newest first; both arrangements join; a later sync settles both devices on the same', async () => {
    const {device} = await account();
    const a = device(), b = device();
    a.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, asks: [ask('a1', 1, 'phone')]}));
    await a.sync(); await b.sync();
    a.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, asks: [ask('a3', 30, 'phone'), ask('a1', 1, 'phone')]}));
    a.storage.setItem(NOVA_KEY, JSON.stringify({version: 1, widgets: [{id: 'weight', size: 'M', slot: 0}]}));
    b.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, asks: [ask('b2', 20), ask('a1', 1, 'phone')]}));
    b.storage.setItem(NOVA_KEY, JSON.stringify({version: 1, widgets: [{id: 'steps', size: 'S', slot: 0}], persona: {name: 'Fictional B'}}));
    expect(byState(await a.sync()).nova).toBe('pushed');
    expect(byState(await b.sync()).nova).toBe('merged');
    expect(byState(await a.sync()).nova).toBe('pulled');
    for (const d of [a, b]) {
      expect(read(d, NOVA_STAGE_KEY).asks.map((x: {id: string}) => x.id)).toEqual(['a3', 'b2', 'a1']);
      expect(read(d, NOVA_KEY).widgets.map((w: {id: string}) => w.id).sort()).toEqual(['steps', 'weight']);
    }
    expect(read(b, NOVA_KEY).persona).toEqual({name: 'Fictional B'});
    expect(read(a, NOVA_KEY).persona).toBeUndefined();
    expect(byState(await b.sync()).nova).toBe('unchanged');
    // A forgotten request on one device is forgotten on the other.
    b.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({...read(b, NOVA_STAGE_KEY), asks: read(b, NOVA_STAGE_KEY).asks.filter((x: {id: string}) => x.id !== 'a1')}));
    await b.sync(); await a.sync();
    expect(read(a, NOVA_STAGE_KEY).asks.map((x: {id: string}) => x.id)).toEqual(['a3', 'b2']);
  });
});

describe('a merge stays inside the records\' bounds', () => {
  test('two devices with 150 requests each settle on the newest 200, newest first, with no refusal', async () => {
    const {device} = await account();
    const a = device(), b = device();
    a.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, asks: Array.from({length: 150}, (_, i) => ask(`a${i}`, 1000 - 2 * i, 'phone'))}));
    b.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, asks: Array.from({length: 150}, (_, i) => ask(`b${i}`, 999 - 2 * i))}));
    expect(byState(await a.sync()).nova).toBe('pushed');
    const second = await b.sync();
    expect(second.find(o => o.section === 'nova')).toEqual({section: 'nova', state: 'merged'});
    expect(byState(await a.sync()).nova).toBe('pulled');
    const asks = read(a, NOVA_STAGE_KEY).asks as {id: string; at: string}[];
    expect(asks).toHaveLength(MAX_ASKS);
    expect(asks.map(x => x.at)).toEqual([...asks.map(x => x.at)].sort().reverse());
    expect(asks.slice(0, 4).map(x => x.id)).toEqual(['a0', 'b0', 'a1', 'b1']);
    expect(read(b, NOVA_STAGE_KEY)).toEqual(read(a, NOVA_STAGE_KEY));
    expect(novaStageSchema.safeParse(read(a, NOVA_STAGE_KEY)).success).toBe(true);
    expect(byState(await b.sync()).nova).toBe('unchanged');
  });
  test('two devices with 20 made and 20 pinned widgets each settle on 24 of each', async () => {
    const {device} = await account();
    const a = device(), b = device();
    const made = (p: string, t: number) => Array.from({length: 20}, (_, i) => ({id: `${p}-made-${i}`, at: at(t - i)}));
    const pinned = (p: string) => Array.from({length: 20}, (_, i) => ({id: `${p}-pin-${i}`, size: 'M', slot: i}));
    a.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, keep: true, made: made('a', 500)})); a.storage.setItem(NOVA_KEY, JSON.stringify({version: 1, widgets: pinned('a')}));
    b.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, keep: true, made: made('b', 400)})); b.storage.setItem(NOVA_KEY, JSON.stringify({version: 1, widgets: pinned('b')}));
    await a.sync();
    expect((await b.sync()).find(o => o.section === 'nova')).toEqual({section: 'nova', state: 'merged'});
    await a.sync();
    for (const d of [a, b]) {
      expect(novaStageSchema.safeParse(read(d, NOVA_STAGE_KEY)).success).toBe(true);
      expect(novaRecordSchema.safeParse(read(d, NOVA_KEY)).success).toBe(true);
      expect(read(d, NOVA_STAGE_KEY).made).toHaveLength(MAX_WIDGETS);
      expect(read(d, NOVA_KEY).widgets).toHaveLength(MAX_WIDGETS);
    }
    // The newest made widgets, and the first places of both arrangements.
    expect(read(a, NOVA_STAGE_KEY).made.slice(0, 21).map((w: {id: string}) => w.id)).toEqual([...made('a', 500).map(w => w.id), 'b-made-0']);
    expect(read(a, NOVA_KEY).widgets.map((w: {slot: number}) => w.slot)).toEqual(Array.from({length: 24}, (_, i) => Math.floor(i / 2)));
    expect(read(b, NOVA_KEY)).toEqual(read(a, NOVA_KEY));
  });
  test('a value taken whole from one side is never reordered or cut; a bound is never set below what one side already holds', () => {
    const unordered = {version: 1, asks: [ask('x1', 1), ask('x2', 9), ask('x3', 5)]};
    expect(fitNovaStage(unordered, unordered, {version: 1})).toEqual(unordered);
    expect(fitNovaStage(unordered, undefined, unordered)).toEqual(unordered);
    // Joined: put in order.
    expect((fitNovaStage(unordered, {version: 1, asks: [ask('x1', 1)]}, {version: 1, asks: [ask('x2', 9), ask('x3', 5)]}).asks as {id: string}[]).map(x => x.id)).toEqual(['x2', 'x3', 'x1']);
    // A later build's longer list joined with this device's: not cut below what that side holds.
    const long = Array.from({length: 260}, (_, i) => ask(`r${i}`, 5000 - i)), mine = [ask('m1', 9000)];
    expect(fitNovaStage({version: 1, asks: [...mine, ...long]}, {version: 1, asks: mine}, {version: 1, asks: long}).asks).toHaveLength(260);
    const wide = Array.from({length: 30}, (_, i) => ({id: `w-${i}`, size: 'M', slot: i}));
    expect(fitNovaArrangement({widgets: wide}, {widgets: wide}, {})).toEqual({widgets: wide});
    expect((fitNovaArrangement({widgets: [...wide, {id: 'mine', size: 'S', slot: 0}]}, {widgets: [{id: 'mine', size: 'S', slot: 0}]}, {widgets: wide}).widgets as unknown[])).toHaveLength(30);
    // A list this build cannot read as times is left as it is.
    expect(fitNovaStage({version: 1, asks: ['later-shape', 1]}, {version: 1, asks: []}, {version: 1, asks: [2]})).toEqual({version: 1, asks: ['later-shape', 1]});
  });
  test('a longer list than this build may hold (a later build\'s) is refused in plain words: nothing is changed here and nothing is uploaded', async () => {
    const {device, cloud, putNova, cloudNova} = await account();
    const d = device();
    const mine = JSON.stringify({version: 1, asks: [ask('m1', 9000)]});
    d.storage.setItem(NOVA_STAGE_KEY, mine);
    await putNova({[NOVA_STAGE_KEY]: {version: 1, asks: Array.from({length: 260}, (_, i) => ask(`r${i}`, 5000 - i))}});
    cloud.calls.length = 0;
    const out = await d.sync();
    expect(out.find(o => o.section === 'nova')).toEqual({section: 'nova', state: 'error', message: 'Your NOVA requests, pinned widgets and layout from another device could not be combined with this device\'s. Nothing was changed on this device.'});
    expect(d.storage.getItem(NOVA_STAGE_KEY)).toBe(mine);
    expect(cloud.calls).not.toContain('write:nova');
    expect(((await cloudNova())![NOVA_STAGE_KEY]!.asks as unknown[])).toHaveLength(260);
    // The other sections are not held back by it.
    expect(Object.entries(byState(out)).filter(([, state]) => state === 'error').map(([section]) => section)).toEqual(['nova']);
  });
});

describe('a later build\'s values travel through this build untouched', () => {
  test('an unknown record, an unknown field and values this build reads as a default are still in the cloud after this build pulled, edited and pushed', async () => {
    const {device, putNova, cloudNova} = await account();
    const later = {
      'zigoals:nova-later-record:v3': {version: 3, list: [1, 2, 3]},
      [NOVA_STAGE_KEY]: {version: 1, laterTop: {a: 1}, made: [{id: 'weight', at: at(3), size: 'XL', glow: true}], asks: [{...ask('l1', 3), device: 'watch', by: 'routine', laterField: 'kept'}]},
      [NOVA_KEY]: {layout: 'constellation', widgets: [{id: 'orbit', size: 'XL', slot: 0, tilt: 3}], theme: 'later-theme'},
    };
    await putNova(later);
    const d = device();
    d.storage.setItem(NOVA_KEY, JSON.stringify({version: 1, persona: {name: 'Fictional Mine'}}));
    expect(byState(await d.sync()).nova).toBe('pulled');
    // On this device: stored as the later build wrote them (this build reads them with its own defaults), its own fields kept.
    expect(read(d, NOVA_STAGE_KEY)).toEqual(later[NOVA_STAGE_KEY]);
    expect(read(d, NOVA_KEY)).toEqual({version: 1, persona: {name: 'Fictional Mine'}, layout: 'constellation', widgets: [{id: 'orbit', size: 'XL', slot: 0, tilt: 3}]});
    expect(novaStageSchema.parse(read(d, NOVA_STAGE_KEY)).asks![0]!.device).toBe('computer');
    expect(novaRecordSchema.parse(read(d, NOVA_KEY)).layout).toBeUndefined();
    expect(d.storage.getItem('zigoals:nova-later-record:v3')).toBeNull();
    expect(await cloudNova()).toEqual(later);
    // This build adds a request and pins a widget, and pushes.
    d.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({...read(d, NOVA_STAGE_KEY), asks: [ask('mine', 50), ...read(d, NOVA_STAGE_KEY).asks]}));
    d.storage.setItem(NOVA_KEY, JSON.stringify({...read(d, NOVA_KEY), widgets: [...read(d, NOVA_KEY).widgets, {id: 'water', size: 'S', slot: 1}]}));
    expect(byState(await d.sync()).nova).toBe('pushed');
    expect(await cloudNova()).toEqual({
      'zigoals:nova-later-record:v3': {version: 3, list: [1, 2, 3]},
      [NOVA_STAGE_KEY]: {...later[NOVA_STAGE_KEY], asks: [ask('mine', 50), later[NOVA_STAGE_KEY].asks[0]]},
      [NOVA_KEY]: {layout: 'constellation', widgets: [{id: 'orbit', size: 'XL', slot: 0, tilt: 3}, {id: 'water', size: 'S', slot: 1}], theme: 'later-theme'},
    });
  });
});

describe('a sync service from before the NOVA section (A6)', () => {
  test('the note is the section\'s own sentence; the Checklist\'s is the sentence it was', () => {
    expect(SERVICE_UPDATE_NOTE('checklist')).toBe('Your Checklist items sync once the sync service is updated. Nothing was changed here.');
    expect(SERVICE_UPDATE_NOTE('nova')).toBe('Your NOVA requests, pinned widgets and layout sync once the sync service is updated. Nothing was changed here.');
  });
  test('the other sections sync; NOVA is neither read nor written and stays as it is; once the service lists it, it syncs', async () => {
    const {device, cloud, cloudNova} = await account(['goals', 'life', 'habits', 'health', 'checklist']);
    const a = device(), b = device();
    const stage = JSON.stringify({version: 1, asks: [ask('a1', 1, 'phone')]}), own = JSON.stringify(FULL);
    a.storage.setItem(NOVA_STAGE_KEY, stage); a.storage.setItem(NOVA_KEY, own);
    a.storage.setItem('zigoals:goal-extras:v1', JSON.stringify(setGoalReasons(emptyGoalExtras(), 'private:1', {why: 'Fictional'}, at(0))));
    a.storage.setItem('zigoals:checklist:v1', JSON.stringify({version: 1, items: [{id: 'c1', kind: 'custom', label: 'Fictional piano', addedAt: at(0)}], healthItems: [], order: ['c1']}));
    const first = await a.sync();
    expect(byState(first)).toEqual({goals: 'pushed', life: 'unchanged', habits: 'unchanged', health: 'unchanged', checklist: 'pushed', nova: 'skipped'});
    expect(first.find(o => o.section === 'nova')!.message).toBe(SERVICE_UPDATE_NOTE('nova'));
    expect(byState(await b.sync())).toEqual({goals: 'pulled', life: 'unchanged', habits: 'unchanged', health: 'unchanged', checklist: 'pulled', nova: 'skipped'});
    expect(cloud.calls.filter(c => c.includes('nova'))).toEqual([]);
    expect(a.storage.getItem(NOVA_STAGE_KEY)).toBe(stage); expect(a.storage.getItem(NOVA_KEY)).toBe(own);
    expect(b.storage.getItem(NOVA_STAGE_KEY)).toBeNull(); expect(b.storage.getItem(NOVA_KEY)).toBeNull();
    expect(a.bases.m.has('nova')).toBe(false);
    // Any number of further syncs: one heads request each, nothing else, never an error.
    cloud.calls.length = 0;
    for (let i = 0; i < 5; i++) expect((await a.sync()).filter(o => o.state === 'error' || o.state === 'waiting' || o.state === 'unreadable')).toEqual([]);
    expect(cloud.calls).toEqual(['heads', 'heads', 'heads', 'heads', 'heads']);
    // The service is updated: the section is listed, and what waited on the device travels.
    cloud.state.listed = [...cloud.state.listed, 'nova'];
    expect(byState(await a.sync()).nova).toBe('pushed');
    expect(byState(await b.sync()).nova).toBe('pulled');
    expect(read(b, NOVA_STAGE_KEY).asks[0].device).toBe('phone');
    expect((await cloudNova())![NOVA_KEY]).toEqual({layout: 'bento', widgets: FULL.widgets});
    // And rolled back again: the section is not listed, nothing is lost on either device, the others go on.
    cloud.state.listed = cloud.state.listed.filter(s => s !== 'nova');
    a.storage.setItem(NOVA_STAGE_KEY, JSON.stringify({version: 1, asks: [ask('a2', 2, 'phone'), ask('a1', 1, 'phone')]}));
    expect(byState(await a.sync()).nova).toBe('skipped');
    expect(read(a, NOVA_STAGE_KEY).asks).toHaveLength(2);
    cloud.state.listed = [...cloud.state.listed, 'nova'];
    expect(byState(await a.sync()).nova).toBe('pushed');
    expect(byState(await b.sync()).nova).toBe('pulled');
    expect(read(b, NOVA_STAGE_KEY).asks.map((x: {id: string}) => x.id)).toEqual(['a2', 'a1']);
  });
});

describe('the wire', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  test('the heads schema takes a service with and without the optional sections, and nothing it does not know', () => {
    const head = {revision: 0, generation: 0, epoch: null, parts: 0}, four = {goals: head, life: head, habits: head, health: head};
    for (const sections of [four, {...four, checklist: head}, {...four, checklist: head, nova: head}, {...four, nova: head}]) expect(extrasHeadsSchema.safeParse({protocol: 1, sections}).success).toBe(true);
    expect(extrasHeadsSchema.safeParse({protocol: 1, sections: {...four, later: head}}).success).toBe(false);
  });
  test('the app asks for the optional sections one per `with`, the Checklist first (the form the service deployed before NOVA also answers)', async () => {
    expect(EXTRAS_OPTIONAL_SECTIONS).toEqual(['checklist', 'nova']);
    expect(EXTRAS_HEADS_QUERY).toBe('&with=checklist&with=nova');
    const urls: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { urls.push(`${init.method} ${url}`); return Response.json({}); });
    const transport = extrasTransport('10000000-0000-4000-8000-000000000001', () => {});
    await transport.heads(); await transport.read('nova'); await transport.read('checklist'); await transport.write({});
    expect(urls).toEqual(['GET /api/private-account?action=extras&with=checklist&with=nova', 'GET /api/private-account?action=extras&section=nova', 'GET /api/private-account?action=extras&section=checklist', 'POST /api/private-account']);
  });
  test('a NOVA part is bound to its own section: presented as another section it does not open', async () => {
    const vault = await createVault(), text = sectionText({[NOVA_STAGE_KEY]: {version: 1}});
    const parts = await sealSection(vault.key, vault.manifest, 'nova', 1, text), cloud = {protocol: 1 as const, revision: 1, generation: 0, epoch: vault.manifest.epoch, parts};
    expect(await openSection(vault.key, vault.manifest, {...cloud, section: 'nova'})).toBe(text);
    for (const other of ['goals', 'life', 'habits', 'health', 'checklist'] as const) await expect(openSection(vault.key, vault.manifest, {...cloud, section: other})).rejects.toThrow();
  });
});
