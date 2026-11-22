import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from './notify/plan';
import {emptyNotifyPrefs, setType, typeOn} from './notify/prefs';
import {zonedInstant} from './notify/zone';
import {DEFAULT_SPREAD, paceDue, spreadSlots, spreadTimes, withWaterSpread} from './water-spread';
import {drinkEnergyDay, moveOwnDrink, ownDrinks, readDrinkEnergy, removeOwnDrink, saveOwnDrink, tapNote, type DrinkFormInput} from './own-drinks';
import {emptyHealthExtras, setDrink, type HealthExtras} from './health-extras';
import {WATER_TIPS, waterTipOf} from './water-tips';
import type {WaterEntry} from './health';

/**
 * Session AV lane 2 (health r3; LEDGER #280–#283, Waterllama): reminders through the day skipped on pace, your own drinks,
 * energy and sugar only as typed, and a tip a day with no health claims.
 */
const ZONE = 'UTC', TODAY = '2026-11-20', NOW = Date.UTC(2026, 10, 20, 8, 0);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '08:00'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string}}}).self.zigoalsCompose;
};

describe('water reminders through the day (LEDGER #280)', () => {
  it('spreads the times from the start to the end, at most 12', () => {
    expect(spreadTimes({from: '09:00', to: '21:00', every: 120})).toEqual(['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00']);
    expect(spreadTimes({from: '08:30', to: '12:00', every: 180})).toEqual(['08:30', '11:30']);
    expect(spreadTimes({from: '06:00', to: '23:59', every: 60})).toHaveLength(12);
    expect(spreadTimes({from: '20:00', to: '09:00', every: 60})).toEqual(['20:00']);
  });
  it('the pace is a straight line from nothing at the start to the whole target at the end', () => {
    expect(paceDue(DEFAULT_SPREAD, 2000, '09:00')).toBe(0);
    expect(paceDue(DEFAULT_SPREAD, 2000, '15:00')).toBe(1000);
    expect(paceDue(DEFAULT_SPREAD, 2000, '21:00')).toBe(2000);
    expect(paceDue(DEFAULT_SPREAD, null, '15:00')).toBeNull();
  });
  it('a reminder is skipped when today is on pace for it; the first once anything is logged', () => {
    const slots = spreadSlots(DEFAULT_SPREAD, {targetMl: 2400, millilitres: 800, entries: 3});
    expect(slots.map(s => [s.time, s.onPace])).toEqual([['09:00', true], ['11:00', true], ['13:00', true], ['15:00', false], ['17:00', false], ['19:00', false], ['21:00', false]]);
    expect(spreadSlots(DEFAULT_SPREAD, {targetMl: 2400, millilitres: 0, entries: 0})[0]!.onPace).toBe(false);
    expect(spreadSlots(DEFAULT_SPREAD, {targetMl: 2400, millilitres: 2400, entries: 6}).every(s => s.onPace)).toBe(true);
    // No target: no pace, so every reminder after the first comes.
    expect(spreadSlots(DEFAULT_SPREAD, {targetMl: null, millilitres: 900, entries: 2}).map(s => s.onPace)).toEqual([true, false, false, false, false, false, false]);
  });
  it('switching it on also switches the Water notifications on, and keeps the choice when off', () => {
    let p = withWaterSpread(setType(emptyNotifyPrefs(), 'water', false), DEFAULT_SPREAD);
    expect(typeOn(p, 'water')).toBe(true);
    p = withWaterSpread(p, {...DEFAULT_SPREAD, on: false, every: 180});
    expect(p.waterSpread).toEqual({on: false, from: '09:00', to: '21:00', every: 180});
  });
  it('the plan wakes at each time, stands in for the one water time, skips today’s on-pace ones and refuses quiet ones', () => {
    const waterSpread = [{time: '09:00', done: true}, {time: '13:00', done: false, detail: '400 mL to be on pace'}, {time: '23:00', done: false}];
    const plan = buildPlan(base({water: {time: '10:00', toGo: '1 L', done: false}, waterSpread}));
    const water = plan.snapshot.items.filter(i => i.kind === 'water');
    expect(water.filter(i => i.at === zonedInstant(TODAY, '13:00', ZONE))).toEqual([{at: zonedInstant(TODAY, '13:00', ZONE), kind: 'water', id: 'water-2', detail: '400 mL to be on pace', href: '/app/health', actionable: false}]);
    expect(water.some(i => i.at === zonedInstant(TODAY, '09:00', ZONE))).toBe(false);
    expect(water.some(i => i.id === 'water')).toBe(false);
    // Tomorrow's 09:00 still comes, without today's line.
    expect(water.find(i => i.at === zonedInstant('2026-11-21', '09:00', ZONE))).toMatchObject({id: 'water-1'});
    expect(water.find(i => i.at === zonedInstant('2026-11-21', '13:00', ZONE))?.detail).toBeUndefined();
    expect(plan.refused).toEqual([{kind: 'water', time: '23:00'}]);
    // (08:00 is the morning orbit's own wake; 23:00 is inside quiet hours and wakes nothing.)
    expect(plan.registration.wakes.map(w => w.m)).toEqual([8 * 60, 9 * 60, 13 * 60]);
    expect(plan.registration.skips).toContain(Math.floor(zonedInstant(TODAY, '09:00', ZONE) / 60000));
    // Off with the Water type, as the one water time is.
    expect(buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'water', false), waterSpread})).snapshot.items.filter(i => i.kind === 'water')).toEqual([]);
  });
  it('the notification says what is left to be on pace, in the existing water line', () => {
    const plan = buildPlan(base({waterSpread: [{time: '13:00', done: false, detail: '400 mL to be on pace'}]}));
    expect(composer()(plan.snapshot, zonedInstant(TODAY, '13:00', ZONE)).body).toContain('Water: 400 mL to be on pace');
  });
});

const FORM: DrinkFormInput = {name: 'Oat latte', type: 'coffee', sizeMl: '300', symbol: '☕', colour: 'yellow', caffeine: '80', kcal: '130', sugar: '7,5'};
const entry = (id: string, ml: number, date = TODAY): WaterEntry => ({id, date, amountMilli: ml * 1000, unit: 'ml', createdAt: `${date}T09:00:00.000Z`, updatedAt: `${date}T09:00:00.000Z`} as WaterEntry);
describe('your own drinks (LEDGER #281)', () => {
  it('saves a drink with its look, size, caffeine, energy and sugar', () => {
    const r = saveOwnDrink(emptyHealthExtras(), FORM);
    expect(r.ok && r.drink).toEqual({id: 'oat-latte', name: 'Oat latte', type: 'coffee', sizeMl: 300, symbol: '☕', colour: 'yellow', caffeineMg: 80, kcal: 130, sugarG: 7.5});
  });
  it('says which field to fix', () => {
    const issue = (over: Partial<DrinkFormInput>) => { const r = saveOwnDrink(emptyHealthExtras(), {...FORM, ...over}); return r.ok ? null : r.issue.field; };
    expect(issue({name: '  '})).toBe('name');
    expect(issue({sizeMl: '0'})).toBe('sizeMl');
    expect(issue({sizeMl: '3000'})).toBe('sizeMl');
    expect(issue({caffeine: 'lots'})).toBe('caffeine');
    expect(issue({kcal: '12.5'})).toBe('kcal');
    expect(issue({sugar: '1.25'})).toBe('sugar');
    expect(issue({type: 'beer'})).toBe('type');
    const one = saveOwnDrink(emptyHealthExtras(), FORM);
    expect(one.ok && saveOwnDrink(one.value, {...FORM, name: 'OAT LATTE'}).ok).toBe(false);
  });
  it('keeps up to 30, edits in place, moves and removes', () => {
    let x: HealthExtras = emptyHealthExtras();
    for (let i = 0; i < 30; i++) { const r = saveOwnDrink(x, {...FORM, name: `Drink ${i}`}); if (!r.ok) throw new Error(r.issue.message); x = r.value; }
    const full = saveOwnDrink(x, {...FORM, name: 'One more'});
    expect(!full.ok && full.issue.message).toContain('Up to 30');
    const edited = saveOwnDrink(x, {...FORM, name: 'Drink 0', sizeMl: '200'}, 'drink-0');
    expect(edited.ok && ownDrinks(edited.value)[0]).toMatchObject({id: 'drink-0', sizeMl: 200});
    expect(ownDrinks(moveOwnDrink(x, 'drink-1', -1))[0]!.id).toBe('drink-1');
    expect(ownDrinks(removeOwnDrink(x, 'drink-0'))).toHaveLength(29);
  });
  it('a tap notes the drink’s fixed type, caffeine, energy and sugar on the entry, so older builds still read its type', () => {
    const r = saveOwnDrink(emptyHealthExtras(), FORM);
    if (!r.ok) throw new Error('not saved');
    const note = tapNote(r.drink), x = setDrink(r.value, 'w-1', note.type, note.caffeineMg, note.more);
    expect(x.drinks?.['w-1']).toEqual({type: 'coffee', caffeineMg: 80, own: 'oat-latte', kcal: 130, sugarG: 7.5});
  });
});

describe('energy and sugar from drinks, only as typed (LEDGER #282)', () => {
  it('reads blank as unknown, never zero', () => {
    expect(readDrinkEnergy('', '')).toEqual({ok: true});
    expect(readDrinkEnergy('0', '0')).toEqual({ok: true, kcal: 0, sugarG: 0});
    expect(readDrinkEnergy('110 kcal', '21,5 g')).toEqual({ok: true, kcal: 110, sugarG: 21.5});
    expect(readDrinkEnergy('3000', '')).toMatchObject({ok: false, field: 'kcal'});
  });
  it('the day counts only what was typed, and says the drinks without an amount', () => {
    let x: HealthExtras = emptyHealthExtras();
    const r = saveOwnDrink(x, {...FORM, name: 'Orange juice', type: 'juice', caffeine: '', kcal: '110', sugar: '21'});
    if (!r.ok) throw new Error('not saved');
    x = setDrink(r.value, 'w-1', 'juice', undefined, tapNote(r.drink).more);
    x = setDrink(x, 'w-2', 'coffee', 95);
    x = setDrink(x, 'w-3', 'soft drink', undefined, {kcal: 140});
    const day = drinkEnergyDay(x, [entry('w-1', 250), entry('w-2', 200), entry('w-3', 330), entry('w-4', 500), entry('w-5', 250, '2026-11-19')], TODAY);
    expect(day).toMatchObject({kcal: 250, sugarG: 21, withKcal: 2, withSugar: 1, drinks: 3, counted: 2, uncounted: 1});
    expect(day.lines.map(l => l.name)).toEqual(['Orange juice', 'Soft drink']);
    expect(drinkEnergyDay(x, [entry('w-2', 200), entry('w-4', 500)], TODAY)).toMatchObject({kcal: null, sugarG: null});
  });
});

// Session AV lane 2 (review B3B-6): a drink with only kcal and one with only sugar are both counted.
describe('counting the drinks with an amount', () => {
  it('counts a drink with an energy or a sugar typed, and only the others as without an amount', () => {
    let x: HealthExtras = setDrink(emptyHealthExtras(), 'w-1', 'juice', undefined, {kcal: 110});
    x = setDrink(x, 'w-2', 'milk', undefined, {sugarG: 12});
    x = setDrink(x, 'w-3', 'tea', 20);
    expect(drinkEnergyDay(x, [entry('w-1', 250), entry('w-2', 200), entry('w-3', 250)], TODAY)).toMatchObject({counted: 2, uncounted: 1, kcal: 110, sugarG: 12});
  });
});

describe('a water tip a day (LEDGER #283)', () => {
  it('has English and Dutch for every tip, the same tip all day, and Another tip moves on', () => {
    expect(WATER_TIPS.length).toBeGreaterThanOrEqual(25);
    for (const t of WATER_TIPS) { expect(t.en.length).toBeGreaterThan(20); expect(t.nl.length).toBeGreaterThan(20); }
    expect(new Set(WATER_TIPS.map(t => t.id)).size).toBe(WATER_TIPS.length);
    expect(waterTipOf(TODAY)).toBe(waterTipOf(TODAY));
    expect(waterTipOf(TODAY, 1)).not.toBe(waterTipOf(TODAY));
  });
  it('makes no health claims and names no amount the body needs', () => {
    const banned = /\b(health(y)?|detox|toxins?|kidneys?|skin|weight|burn|metabolism|dehydrat\w*|cure|prevent\w*|immune|brain|litres? a day|glasses a day|should drink|must drink|gezond\w*|ontgift\w*|nieren?|huid|gewicht|verbrand\w*|uitdrog\w*|moet drinken)\b/i;
    for (const t of WATER_TIPS) { expect(t.en).not.toMatch(banned); expect(t.nl).not.toMatch(banned); }
  });
});
