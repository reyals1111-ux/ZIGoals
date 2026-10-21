import {describe, expect, test} from 'vitest';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {readDeviceRecord} from '../../device-record';
import {ZIGI_PLANS_KEY} from '../../af-zigi-keys';
import {forgetAllPlans, forgetPlan, markPlanItem, MAX_PLANS, planLines, recordBundle, withBundle, withOutcome, ZIGI_PLANS, zigiPlansSchema, type BundleInput} from './plans';
import {AI_MEMORY, BRIEF_DEFAULTS, briefPrefs, memoryConsent, ZIGI, zigiSchema} from './records';

const memory = () => { const m = new Map<string, string>(); return {m, storage: {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }}}; };
const NOW = new Date('2026-10-19T08:00:00.000Z');
const bundle = (id = 'b_1', n = 3): BundleInput => ({id, title: 'Your 10k plan', chatId: 'chat_1', items: Array.from({length: n}, (_, i) => ({sig: `0000000${i}`, kind: i ? 'create-habit' : 'create-goal', label: i ? `Create the habit "Run ${i}"` : 'Create goal · Run 10 km'}))});

describe('zigoals:zigi-plans:v1 (Session AF, TIER 3 storage)', () => {
  test('a bundle is kept with every step proposed; a step\'s outcome is kept; the plan is done once nothing is left to decide', () => {
    const {storage} = memory();
    recordBundle(storage, bundle(), NOW);
    let read = readDeviceRecord(storage, ZIGI_PLANS).data;
    expect(read.plans).toHaveLength(1); expect(read.plans![0]!.items.map(i => i.outcome)).toEqual(['proposed', 'proposed', 'proposed']);
    markPlanItem(storage, bundle(), '00000000', 'added', NOW); markPlanItem(storage, bundle(), '00000001', 'dismissed', NOW);
    read = readDeviceRecord(storage, ZIGI_PLANS).data;
    expect(read.plans![0]!.done).toBe(false);
    markPlanItem(storage, bundle(), '00000002', 'undone', NOW);
    read = readDeviceRecord(storage, ZIGI_PLANS).data;
    expect(read.plans![0]!.done).toBe(true);
    expect(planLines(read.plans![0]!)).toEqual({title: 'Your 10k plan', done: true, steps: [{label: 'Create goal · Run 10 km', outcome: 'added'}, {label: 'Create the habit "Run 1"', outcome: 'skipped'}, {label: 'Create the habit "Run 2"', outcome: 'undone'}]});
    // A bundle seen again (a reload, the same reply) keeps the outcomes it has.
    recordBundle(storage, bundle(), NOW);
    expect(readDeviceRecord(storage, ZIGI_PLANS).data.plans![0]!.items.map(i => i.outcome)).toEqual(['added', 'dismissed', 'undone']);
  });
  test('caps: 20 plans (newest first), 12 steps; labels and titles are clipped', () => {
    let record = ZIGI_PLANS.empty();
    for (let i = 0; i < MAX_PLANS + 5; i++) record = withBundle(record, bundle(`b_${i}`, 15), NOW);
    expect(record.plans).toHaveLength(MAX_PLANS); expect(record.plans![0]!.id).toBe(`b_${MAX_PLANS + 4}`);
    expect(record.plans![0]!.items).toHaveLength(12);
    const long = withBundle(ZIGI_PLANS.empty(), {id: 'x', title: 'T'.repeat(200), items: [{sig: 'abcdef01', kind: 'create-goal', label: 'L'.repeat(300)}]}, NOW);
    expect(long.plans![0]!.title.length).toBe(80); expect(long.plans![0]!.items[0]!.label.length).toBe(120);
    expect(zigiPlansSchema.safeParse(long).success).toBe(true);
  });
  test('unknown fields and a newer build\'s outcome survive a write of this build', () => {
    const {m, storage} = memory();
    m.set(ZIGI_PLANS_KEY, JSON.stringify({version: 1, later: {x: 1}, plans: [{id: 'b_1', title: 'Your 10k plan', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), items: [{sig: '00000000', kind: 'create-goal', label: 'Goal', outcome: 'snoozed', extra: true}, {sig: '00000001', kind: 'x', label: 'Y', outcome: 'proposed'}], future: 'kept'}]}));
    markPlanItem(storage, bundle('b_1', 2), '00000001', 'added', NOW);
    const raw = JSON.parse(m.get(ZIGI_PLANS_KEY)!);
    expect(raw.later).toEqual({x: 1}); expect(raw.plans[0].future).toBe('kept'); expect(raw.plans[0].items[0]).toMatchObject({outcome: 'snoozed', extra: true});
    expect(planLines(readDeviceRecord(storage, ZIGI_PLANS).data.plans![0]!).steps[0]!.outcome).toBe('not decided yet');
  });
  test('an unreadable record reads as empty and is never overwritten; forget one, forget all', () => {
    const {m, storage} = memory();
    m.set(ZIGI_PLANS_KEY, '{not json');
    expect(recordBundle(storage, bundle(), NOW)).toBeNull();
    expect(m.get(ZIGI_PLANS_KEY)).toBe('{not json');
    m.delete(ZIGI_PLANS_KEY);
    recordBundle(storage, bundle('a'), NOW); recordBundle(storage, bundle('b'), NOW);
    forgetPlan(storage, 'a');
    expect(readDeviceRecord(storage, ZIGI_PLANS).data.plans!.map(p => p.id)).toEqual(['b']);
    forgetAllPlans(storage);
    expect(m.has(ZIGI_PLANS_KEY)).toBe(false);
    expect(withOutcome(ZIGI_PLANS.empty(), 'none', '00000000', 'added', NOW)).toEqual(ZIGI_PLANS.empty());
  });
  test('never synced: no sync module, extras section or Worker names the key (only the keys module and the store name it, outside tests)', () => {
    const WEB = join(__dirname, '..', '..', '..'), ROOT = join(WEB, '..', '..');
    const files = (dir: string): string[] => { try { return readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? (n === 'node_modules' || n === '.next' ? [] : files(p)) : /\.(ts|tsx|mjs|js)$/.test(n) && !/\.test\.|\.spec\./.test(n) ? [p] : []; }); } catch { return []; } };
    const naming = [...files(join(WEB, 'lib')), ...files(join(WEB, 'components')), ...files(join(WEB, 'app')), ...files(join(ROOT, 'workers'))].filter(f => readFileSync(f, 'utf8').includes(ZIGI_PLANS_KEY)).map(f => f.slice(WEB.length + 1));
    expect(naming.sort()).toEqual(['lib/af-zigi-keys.ts', 'lib/ai/store/plans.ts']);
  });
});

describe('the brief choices on zigoals:zigi:v1 and the notes consent on zigoals:ai-memory:v1 (additive fields)', () => {
  test('the brief\'s defaults; a value this build cannot read is dropped, never the record', () => {
    expect(briefPrefs(ZIGI.empty())).toEqual(BRIEF_DEFAULTS);
    expect(BRIEF_DEFAULTS).toEqual({morning: true, evening: true, eveningTime: '18:00', earning: true, readAloud: false});
    expect(briefPrefs(zigiSchema.parse({version: 1, brief: {evening: false, eveningTime: '20:30'}}))).toMatchObject({evening: false, eveningTime: '20:30', morning: true});
    const odd = zigiSchema.safeParse({version: 1, skin: 'origami-nebula', brief: {eveningTime: 'late'}});
    expect(odd.success).toBe(true); expect(odd.data!.skin).toBe('origami-nebula'); expect(odd.data!.brief).toBeUndefined();
    // An older build's record (no field) still reads, and a newer field inside brief is kept.
    expect(zigiSchema.parse({version: 1, brief: {morning: false, later: 1}}).brief).toEqual({morning: false, later: 1});
  });
  test('consent: a record without the field reads as agreed when it holds notes, unasked when empty; given or declined when set', () => {
    const note = {id: 'n1', text: 'Trains in the morning', category: 'schedule', source: 'person', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString()};
    expect(memoryConsent(AI_MEMORY.empty())).toBe('unasked');
    expect(memoryConsent(AI_MEMORY.schema.parse({version: 1, notes: [note]}))).toBe('given');
    expect(memoryConsent(AI_MEMORY.schema.parse({version: 1, consent: {given: false, at: NOW.toISOString()}}))).toBe('declined');
    expect(memoryConsent(AI_MEMORY.schema.parse({version: 1, notes: [], consent: {given: true, at: NOW.toISOString()}}))).toBe('given');
    const broken = AI_MEMORY.schema.safeParse({version: 1, notes: [note], consent: {given: 'maybe'}});
    expect(broken.success).toBe(true); expect(broken.data!.notes).toHaveLength(1); expect(broken.data!.consent).toBeUndefined();
  });
});
