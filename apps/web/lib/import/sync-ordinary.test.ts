// B13 (Session P, PR 3): the records the new features create are ordinary records of the four synced modules, so a
// second device receives them through sync as they are. The device-only keys are not part of the synced data at all.
import 'fake-indexeddb/auto';
import {describe, expect, test} from 'vitest';
import {createVault, type VaultManifest} from '../vault/crypto';
import {RevisionConflict, synchronize, type CloudOperation, type CloudTransport, type Journal, type PrivateData, type SyncState} from '../vault/cloud-sync';
import {createHabit, emptyHabitData, habitDataSchema, planSkip} from '../habits';
import {createEmptyHealth, healthSchema} from '../health';
import {addWater} from '../health-daily';
import {emptyPlatform, platformSchema} from '../positions';
import {emptyHabitHealthLinks} from '../habit-health-links/schema';
import {setHabitHealthLink} from '../habit-health-links/store';
import {applyAutoCompletion, autoCompletions} from '../habit-health-links/engine';
import {applyHoldingsImport, planHoldingsImport} from './holdings';
import {applyNutritionImport, planNutritionImport} from './nutrition';

type Row = CloudOperation['changes'][number];
class MemoryJournal implements Journal {
  state: SyncState = {version: 1, base: {}, revision: 0, headRevision: 0, headDigest: null, pending: null};
  async read() { return structuredClone(this.state); } async write(state: SyncState) { this.state = structuredClone(state); }
}
class Cloud implements CloudTransport {
  revision = 0; rows = new Map<string, Row>(); receipts = new Map<string, {body: string; revision: number}>();
  constructor(public manifest: VaultManifest) {}
  async read() { return {protocol: 1 as const, revision: this.revision, manifest: this.manifest, records: structuredClone([...this.rows.values()]), cursor: null}; }
  async write(input: CloudOperation) {
    const operation = structuredClone(input), body = JSON.stringify(operation), receipt = this.receipts.get(operation.operation);
    if (receipt) { if (receipt.body !== body) throw Error('Operation reused'); return {revision: receipt.revision}; }
    if (operation.base !== this.revision) throw new RevisionConflict();
    for (const row of operation.changes) if (row.revision !== (this.rows.get(row.id)?.revision ?? 0) + 1) throw new RevisionConflict();
    for (const row of operation.changes) this.rows.set(row.id, row);
    this.revision++; this.receipts.set(operation.operation, {body, revision: this.revision});
    return {revision: this.revision};
  }
}
const noop = () => {};
const NOW = new Date('2026-10-01T09:00:00.000Z'), AT = NOW.toISOString(), HABIT = '11111111-1111-4111-8111-111111111111', OTHER = '22222222-2222-4222-8222-222222222222';

function deviceA(): {data: PrivateData; expectations: () => void} {
  // Habits: one habit linked to water (H7), another with a planned skip (H1).
  let habits = createHabit(emptyHabitData(), {title: 'Drink water', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'boolean'}}, new Date('2026-09-01T00:00:00.000Z'), HABIT);
  habits = createHabit(habits, {title: 'Stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, measurement: {kind: 'boolean'}}, new Date('2026-09-01T00:00:00.000Z'), OTHER);
  let health = addWater(createEmptyHealth(), {id: 'health_water-device-a', date: '2026-10-01', amountMilli: 250_000, unit: 'ml'}, AT);
  const links = setHabitHealthLink(emptyHabitHealthLinks(), HABIT, {version: 1, measure: 'water', rule: 'at-least', target: 250, updatedAt: AT});
  const due = autoCompletions({links, habits, health, now: NOW});
  expect(due.map(d => d.habitId)).toEqual([HABIT]);
  habits = applyAutoCompletion(habits, due[0]!, NOW);
  habits = planSkip(habits, OTHER, '2026-10-02', 'travel', NOW);
  // Wealth: an imported holding (W3). Health: an imported meal (I1).
  const holdings = planHoldingsImport({rows: [['Gold', 'XAU', '2', 'Precious metals', '', 'EUR']], mapping: {name: 0, asset: 1, quantity: 2, class: 3, value: 4, currency: 5}, numberStyle: 'point'});
  expect(holdings.refused).toEqual([]);
  const platform = applyHoldingsImport(emptyPlatform(), holdings.ready, {importId: 'imp-a', at: AT});
  const meals = planNutritionImport({rows: [['2026-10-01', 'Breakfast', 'Oats', '380']], mapping: {date: 0, meal: 1, food: 2, kcal: 3}, numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: '2026-10-01', importId: 'imp-b', at: AT});
  expect(meals.refused).toEqual([]);
  health = applyNutritionImport(health, meals);
  const data: PrivateData = {finance: JSON.stringify(platform), habits: JSON.stringify(habits), health: JSON.stringify(health)};
  return {data, expectations: () => {
    const h = habitDataSchema.parse(JSON.parse(data.habits!));
    expect(h.habits.find(x => x.id === HABIT)!.entries).toMatchObject([{date: '2026-10-01', count: 1, disposition: 'logged'}]);
    expect(h.habits.find(x => x.id === OTHER)!.entries).toMatchObject([{date: '2026-10-02', disposition: 'skipped'}]);
    expect(platformSchema.parse(JSON.parse(data.finance!)).positions).toMatchObject([{id: 'imp_imp-a_1', providerId: 'Gold', sourceType: 'MANUAL'}]);
    expect(healthSchema.parse(JSON.parse(data.health!)).diary).toMatchObject([{id: 'health_imp-imp-b-e1', date: '2026-10-01', meal: 'Breakfast'}]);
  }};
}

describe('B13: what the new features create syncs as ordinary records', () => {
  test('an automatic check-in, a planned skip and imported records reach a second device as ordinary records', async () => {
    const vault = await createVault(), cloud = new Cloud(vault.manifest), a = new MemoryJournal(), b = new MemoryJournal();
    const device = deviceA();
    device.expectations();
    const uploaded = await synchronize(cloud, a, vault.key, vault.manifest, device.data, noop, noop); await uploaded.commit();
    const received = await synchronize(cloud, b, vault.key, vault.manifest, {}, noop, noop); await received.commit();
    expect(received.data.habits).toBe(device.data.habits);
    expect(received.data.finance).toBe(device.data.finance);
    expect(received.data.health).toBe(device.data.health);
    expect(Object.keys(received.data).sort()).toEqual(['finance', 'habits', 'health']);
    // The device-only records never travel: the synced data has no key for them and the records carry no marker.
    expect(JSON.stringify(received.data)).not.toMatch(/habit-health-links|health-goals|weekly-review|fasting|insights|import-undo|appliedAt/);
    const habits = habitDataSchema.parse(JSON.parse(received.data.habits!));
    expect(habits.habits.find(x => x.id === HABIT)!.entries[0]).toMatchObject({count: 1, disposition: 'logged'});
    expect(habits.habits.find(x => x.id === OTHER)!.entries[0]).toMatchObject({disposition: 'skipped'});
  });
});
