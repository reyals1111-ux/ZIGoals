import {describe, expect, test} from 'vitest';
import {PRIVATE_MAX_BYTES} from './private-storage';
import {createHabit, emptyHabitData, logHabitValue} from './habits';
import {createEmptyHealth, logHealthItem, saveFood, saveWeight} from './health';
import {addWater} from './health-daily';
import {buildShowcase} from './showcase-data';
import {MODULE_KEYS} from './export/everything';
import {NEARLY_FULL, headroomMessage, moduleUse} from './storage-headroom';

// Session AK (owner amendment A6): a year of heavy use, plus the Showcase, stays under each module's 2 MB with headroom.
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const day = (n: number) => new Date(Date.UTC(2026, 0, 1) + n * 86_400_000).toISOString().slice(0, 10);
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hid = (prefix: string, n: number) => `health_${prefix}-${String(n).padStart(8, '0')}`;

describe('A6: storage headroom', () => {
  test('habits: 12 habits checked in every day for a year, with short notes', () => {
    let data = emptyHabitData();
    for (let h = 0; h < 12; h++) data = createHabit(data, {title: `Habit ${h}`, category: 'Health', description: 'A fictional habit', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-01-01T08:00:00Z'), id(h));
    for (let d = 0; d < 365; d++) for (let h = 0; h < 12; h++) data = logHabitValue(data, id(h), day(d), 1, {note: d % 7 ? '' : 'Felt good today.'}, new Date(`${day(d)}T20:00:00Z`));
    const size = bytes(data);
    expect(size, `habits ${size} bytes`).toBeLessThan(PRIVATE_MAX_BYTES * NEARLY_FULL);
  }, 120_000);
  test('health: 120 foods, four diary lines a day, a weight and water every day for a year', () => {
    let data = createEmptyHealth(); const at = '2026-01-01T08:00:00.000Z';
    for (let f = 0; f < 120; f++) data = saveFood(data, {id: hid('food', f), name: `Food ${f}`, brand: '', servingGrams: 100000, nutrients: {kcal: 200, proteinMg: 10000, carbsMg: 20000, fatMg: 5000, fiberMg: 3000, sodiumMg: 300}, createdAt: at, updatedAt: at} as never);
    for (let d = 0; d < 365; d++) {
      for (let m = 0; m < 4; m++) data = logHealthItem(data, {id: hid(`d${m}`, d), sourceId: hid('food', (d * 4 + m) % 120), sourceKind: 'food', date: day(d), meal: (['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const)[m]!, quantityMilli: 1000}, at);
      data = saveWeight(data, {id: hid('w', d), date: day(d), grams: 70000 + d} as never, at);
      data = addWater(data, {id: hid('h2o', d), date: day(d), amountMilli: 2_000_000, unit: 'ml'}, at);
    }
    const size = bytes(data);
    expect(size, `health ${size} bytes`).toBeLessThan(PRIVATE_MAX_BYTES * NEARLY_FULL);
  }, 120_000);
  test('the Showcase fits every module with room to spare', () => {
    const showcase = buildShowcase('2026-10-31', 'UTC') as unknown as {records?: Record<string, string>} & Record<string, unknown>;
    const records = (showcase.records ?? showcase) as Record<string, unknown>;
    let measured = 0;
    for (const key of Object.values(MODULE_KEYS)) {
      const value = records[key]; if (value === undefined) continue;
      measured++;
      const size = typeof value === 'string' ? new TextEncoder().encode(value).byteLength : bytes(value);
      expect(size, key).toBeLessThan(PRIVATE_MAX_BYTES * 0.5);
    }
    expect(measured).toBeGreaterThanOrEqual(3);
  });
  test('the nearly-full line: none with room; the fullest module named with what to do; vault-held modules left out', () => {
    const store = (entries: Record<string, string>) => ({length: Object.keys(entries).length, key: (i: number) => Object.keys(entries)[i] ?? null, getItem: (k: string) => entries[k] ?? null});
    expect(headroomMessage(moduleUse(store({[MODULE_KEYS.habits]: 'x'.repeat(1000)})))).toBeNull();
    const line = headroomMessage(moduleUse(store({[`acct:${MODULE_KEYS.health}`]: 'x'.repeat(1_600_000), [MODULE_KEYS.habits]: 'x'.repeat(1_550_000)})));
    expect(line).toMatch(/^Health on this device is nearly full \(1\.6 of 2\.0 MB\)\. Export everything first/);
  });
});
