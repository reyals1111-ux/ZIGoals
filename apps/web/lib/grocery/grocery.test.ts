import {describe, expect, test} from 'vitest';
import {createEmptyHealth, healthSchema, saveFood, type HealthData} from '../health';
import {groceryList, saveGroceryEdit, removeMealPlan} from '../health-daily';
import {planFromFood} from '../health-aa/planner';
import {GROCERY_KEY, addGroceryItem, emptyGroceryRecord, groceryName, groceryRecordSchema, removeGroceryItem, setPantry, setTick, MAX_TICKS} from './schema';
import {frequentItems, groceryCsv, groceryItems, groceryPrintHtml, groceryText, normalisedQuantity, quantityText, type GroceryRow} from './list';

const AT = '2026-10-05T08:00:00.000Z', FROM = '2026-10-05', TO = '2026-10-11';
const food = (id: string, name: string, servingGrams: number | null, servingMl?: number) => ({id, name, brand: '', servingGrams, ...(servingMl ? {servingMl} : {}), nutrients: {kcal: 100, proteinMg: 1, carbsMg: 1, fatMg: 1}, createdAt: AT, updatedAt: AT});
function planned(): HealthData {
  let h = createEmptyHealth();
  h = saveFood(h, food('health_f-oats0001', 'Oats', 600));
  h = saveFood(h, food('health_f-oats0002', 'oats', 500));
  h = saveFood(h, food('health_f-milk0001', 'Milk', null, 250));
  h = planFromFood(h, 'health_f-oats0001', 1000, '2026-10-06', 'Breakfast', AT, 'health_p-000001');
  h = planFromFood(h, 'health_f-oats0002', 1000, '2026-10-07', 'Breakfast', AT, 'health_p-000002');
  h = planFromFood(h, 'health_f-milk0001', 2000, '2026-10-07', 'Breakfast', AT, 'health_p-000003');
  h = planFromFood(h, 'health_f-milk0001', 3000, '2026-10-08', 'Breakfast', AT, 'health_p-000004');
  return h;
}

describe('4.6 aggregation and units', () => {
  test('same name and measure add up across foods; g→kg and ml→l; a mass and a volume never mix', () => {
    const {items} = groceryItems(groceryList(planned(), FROM, TO), emptyGroceryRecord(), FROM);
    expect(items.map(i => [i.key, i.amount])).toEqual([['milk|volume', 1250], ['oats|mass', 1100]]);
    expect(items.map(quantityText)).toEqual(['1.25 l', '1.1 kg']);
    expect(normalisedQuantity('mass', 250)).toEqual({value: 250, unit: 'g'});
    expect(normalisedQuantity('volume', 999.6)).toEqual({value: 1000, unit: 'ml'});
    expect(normalisedQuantity('pieces', 3)).toEqual({value: 3, unit: 'pieces'});
    expect(normalisedQuantity('unknown', null)).toBeNull();
    expect(quantityText({kind: 'pieces', amount: 1})).toBe('1 piece');
  });
  test('a manual correction in pieces counts as pieces', () => {
    const rows: GroceryRow[] = [{key: 'a', name: 'Eggs', grams: 120, millilitres: null, planIds: ['health_p-1'], note: '', checked: false, manual: {quantityMilli: 6000, unit: 'item'}}];
    expect(groceryItems(rows, emptyGroceryRecord(), FROM).items[0]).toMatchObject({key: 'eggs|pieces', amount: 6});
  });
});

describe('4.6 ticks survive a rebuilt plan; the pantry leaves the list', () => {
  test('a tick is kept by item key when the plans behind it change', () => {
    const h = planned();
    let r = setTick(emptyGroceryRecord(), FROM, 'oats|mass', true, AT);
    expect(groceryItems(groceryList(h, FROM, TO), r, FROM).items.find(i => i.key === 'oats|mass')!.checked).toBe(true);
    // re-planned: one oats plan removed and planned again under a new id
    let again = removeMealPlan(h, 'health_p-000002');
    again = planFromFood(again, 'health_f-oats0002', 1000, '2026-10-09', 'Breakfast', AT, 'health_p-000009');
    expect(groceryItems(groceryList(again, FROM, TO), r, FROM).items.find(i => i.key === 'oats|mass')!.checked).toBe(true);
    // another week starts unticked
    expect(groceryItems(groceryList(again, FROM, TO), r, '2026-10-12').items.find(i => i.key === 'oats|mass')!.checked).toBe(false);
    r = setTick(r, FROM, 'oats|mass', false, AT);
    expect(groceryItems(groceryList(again, FROM, TO), r, FROM).items.find(i => i.key === 'oats|mass')!.checked).toBe(false);
  });
  test('an older tick in Health’s corrections still counts until the person changes it', () => {
    const h = planned(), row = groceryList(h, FROM, TO).find(r => r.name === 'Milk')!;
    const edited = saveGroceryEdit(h, FROM, TO, row.key, row.planIds, {name: 'Milk', quantityMilli: null, unit: 'ml', checked: true});
    expect(groceryItems(groceryList(edited, FROM, TO), emptyGroceryRecord(), FROM).items.find(i => i.key === 'milk|volume')!.checked).toBe(true);
    expect(groceryItems(groceryList(edited, FROM, TO), setTick(emptyGroceryRecord(), FROM, 'milk|volume', false, AT), FROM).items.find(i => i.key === 'milk|volume')!.checked).toBe(false);
  });
  test('"I have this" moves an item to the pantry for every week until put back', () => {
    const r = setPantry(emptyGroceryRecord(), 'OATS', true, AT), out = groceryItems(groceryList(planned(), FROM, TO), r, FROM);
    expect(out.items.map(i => i.key)).toEqual(['milk|volume']); expect(out.pantry.map(i => i.key)).toEqual(['oats|mass']);
    expect(groceryItems(groceryList(planned(), FROM, TO), setPantry(r, 'oats', false, AT), FROM).pantry).toEqual([]);
  });
  test('ticks are capped (the oldest go); added items join the week', () => {
    let r = emptyGroceryRecord();
    for (let i = 0; i < MAX_TICKS + 3; i++) r = setTick(r, FROM, `item-${i}|mass`, true, new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString());
    expect(Object.keys(r.ticks!)).toHaveLength(MAX_TICKS); expect(r.ticks![`${FROM}|item-0|mass`]).toBeUndefined();
    let a = addGroceryItem(emptyGroceryRecord(), FROM, 'Coffee beans', AT);
    a = addGroceryItem(a, FROM, 'coffee  beans', AT); // the same item once
    expect(a.added![FROM]).toHaveLength(1);
    expect(groceryItems([], a, FROM).items).toMatchObject([{key: 'added:coffee beans', name: 'Coffee beans', added: true, kind: 'unknown'}]);
    expect(removeGroceryItem(a, FROM, 'added:coffee beans').added).toEqual({});
    expect(() => addGroceryItem(a, FROM, '  !! ', AT)).toThrow();
    expect(GROCERY_KEY).toBe('zigoals:grocery:v1');
    expect(groceryRecordSchema.parse({version: 1, later: true})).toMatchObject({later: true});
    expect(groceryName('Crème  fraîche!')).toBe('creme fraiche');
  });
});

test('4.6 often logged: three or more times in 28 days, not on the list or in the pantry', () => {
  const h = healthSchema.parse({...createEmptyHealth(), foods: [food('health_f-apple001', 'Apple', 150)], diary: [0, 1, 2, 3].map(i => ({id: `health_e-00000${i}`, sourceId: 'health_f-apple001', sourceKind: 'food', snapshot: {name: 'Apple', servingGrams: 150, nutrients: {kcal: 80, proteinMg: 1, carbsMg: 1, fatMg: 1}}, date: `2026-10-0${i + 1}`, meal: 'Snacks', quantityMilli: 1000, createdAt: AT, updatedAt: AT}))});
  expect(frequentItems(h, '2026-10-07', [], emptyGroceryRecord())).toEqual([{name: 'Apple', count: 4}]);
  expect(frequentItems(h, '2026-10-07', ['apple'], emptyGroceryRecord())).toEqual([]);
  expect(frequentItems(h, '2026-10-07', [], setPantry(emptyGroceryRecord(), 'Apple', true, AT))).toEqual([]);
  expect(frequentItems(h, '2026-12-07', [], emptyGroceryRecord())).toEqual([]);
});

test('4.6 share and export: text, CSV through csvSafeCell, an escaped print page', () => {
  const groups = [{aisle: 'Pantry', items: [{key: 'k', name: '=HYPERLINK("x")', kind: 'mass' as const, amount: 1500, checked: true, planIds: [], rowKeys: [], added: false}, {key: 'k2', name: '<b>Salt</b>', kind: 'unknown' as const, amount: null, checked: false, planIds: [], rowKeys: [], added: true}]}];
  expect(groceryText('Groceries', groups)).toBe('Groceries\n\nPantry\n[x] =HYPERLINK("x") — 1.5 kg\n[ ] <b>Salt</b>\n');
  const csv = groceryCsv(groups).split('\r\n');
  expect(csv[0]).toBe('"aisle","item","quantity","unit","bought"');
  expect(csv[1]).toBe('"Pantry","\'=HYPERLINK(""x"")","1.5","kg","yes"');
  expect(csv[2]).toBe('"Pantry","<b>Salt</b>","","unknown","no"');
  const html = groceryPrintHtml('Groceries <week>', groups);
  expect(html).toContain('&lt;b&gt;Salt&lt;/b&gt;'); expect(html).toContain('Groceries &lt;week&gt;');
  expect(html).not.toMatch(/<script|<b>Salt/);
});
