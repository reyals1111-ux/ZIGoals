import {describe, expect, it} from 'vitest';
import {createEmptyHealth, logHealthItem, saveFood, setHealthTargets, type HealthFood} from '../../health';
import {addWater, saveHealthPreferences, dailyData, waterToday, waterOn} from '../../health-daily';
import {flowRibbons, histogramBars, histogramY, smoothPath, timePoints} from './geometry';
import {healthHud, kcalWeek} from './health';
import {BURST_MS, isTextEntry, shortcutKind, shortcutLines, typedLetter} from './keys';

/** Session AL Part 11, second pass (lane L8): the reference image's instruments, the week's calories, and the key guard. */
const DAY = '2026-11-04', AT = '2026-11-04T12:00:00.000Z';
const hid = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const food: HealthFood = {id: hid(1), name: 'Fictional oats', brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: 5000, carbsMg: 27000, fatMg: 3000}, createdAt: AT, updatedAt: AT};
const key = (k: string, mods: Partial<{ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean; isComposing: boolean; repeat: boolean}> = {}) => ({key: k, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods});

describe('the flowing wave never shows a value the records do not hold', () => {
  it('a monotone curve: each segment stays between its two points', () => {
    const pts = [{x: 0, y: 50}, {x: 10, y: 10}, {x: 20, y: 40}, {x: 30, y: 40}, {x: 40, y: 0}];
    const d = smoothPath(pts), nums = d.replace(/[MC]/g, ' ').trim().split(/\s+/).map(Number);
    expect(d.startsWith('M0 50C')).toBe(true);
    // Every control point's y lies within the y range of the segment it belongs to.
    const segs = d.split('C').slice(1).map(c => c.trim().split(/\s+/).map(Number));
    segs.forEach((c, i) => { const lo = Math.min(pts[i]!.y, pts[i + 1]!.y), hi = Math.max(pts[i]!.y, pts[i + 1]!.y); expect(c[1]).toBeGreaterThanOrEqual(lo - 1e-9); expect(c[1]).toBeLessThanOrEqual(hi + 1e-9); expect(c[3]).toBeGreaterThanOrEqual(lo - 1e-9); expect(c[3]).toBeLessThanOrEqual(hi + 1e-9); });
    expect(nums.length).toBeGreaterThan(10);
    expect(smoothPath([{x: 0, y: 1}, {x: 2, y: 3}])).toBe('M0 1L2 3');
  });
  it('points are placed by time, so a quiet month stays wide', () => {
    const p = timePoints([{at: '2026-01-01', value: 10}, {at: '2026-01-02', value: 20}, {at: '2026-03-01', value: 15}, {at: 'not a day', value: 1}], 100, 50, 0);
    expect(p).toHaveLength(3);
    expect(p[0]!.x).toBe(0); expect(p[2]!.x).toBe(100);
    expect(p[1]!.x).toBeLessThan(5); // one day after the first, of 59
    expect(p[1]!.y).toBe(0); expect(p[0]!.y).toBe(50); // top = the highest value
  });
});

describe('the histogram and the flow', () => {
  it('bars to their values against the line\'s top; unknown is an empty slot, never a zero bar', () => {
    const bars = histogramBars([1000, null, 2000, 0], 400, 100, {max: 2500});
    expect(bars[1]).toBeNull();
    expect(bars[0]!.height).toBe(40); expect(bars[2]!.height).toBe(80); expect(bars[3]!.height).toBe(0);
    expect(histogramY(2500, [1000, null, 2000], 100, 2500)).toBe(0);
    expect(histogramY(1250, [1000, null, 2000], 100, 2500)).toBe(50);
  });
  it('ribbons: widths are shares of the source; a zero part draws nothing; more than the whole is scaled to fit', () => {
    const r = flowRibbons([0.25, 0, 0.75], 200, 100, {gap: 0});
    expect(r).toHaveLength(2);
    expect(r[0]!.from).toEqual([0, 25]); expect(r[1]!.from).toEqual([25, 100]);
    expect(flowRibbons([0, 0], 200, 100)).toEqual([]);
    const over = flowRibbons([1, 1], 200, 100, {gap: 0});
    expect(over.at(-1)!.from[1]).toBe(100);
  });
});

describe('the week\'s calories (Health HUD histogram)', () => {
  it('the diary\'s own totals; a day without meals is unknown, never 0; the target is the line', () => {
    let d = saveFood(createEmptyHealth(), food);
    d = logHealthItem(d, {id: hid(2), sourceId: hid(1), sourceKind: 'food', date: DAY, meal: 'Breakfast', quantityMilli: 2000}, AT);
    d = setHealthTargets(d, {...d.targets, kcal: 2200});
    const w = kcalWeek(d, DAY);
    expect(w.days).toHaveLength(7);
    expect(w.days.at(-1)).toMatchObject({date: DAY, kcal: 300});
    expect(w.days[0]!.kcal).toBeNull(); expect(w.days[0]!.text).toBe('No meals logged');
    expect(w.target).toBe(2200); expect(w.targetText).toBe('2,200 kcal'); expect(w.known).toBe(1);
    // The HUD's ring reads the same figure for today.
    expect(healthHud(d, DAY).kcal.value).toBe(300);
  });
  it('water: the HUD reads L2\'s one source (waterOn / waterToday)', () => {
    let d = saveHealthPreferences(createEmptyHealth(), {...dailyData(createEmptyHealth()).preferences, waterTargetMl: 2000, timezone: 'UTC'});
    d = addWater(d, {id: hid(3), date: DAY, amountMilli: 250_000, unit: 'ml'}, AT);
    const hud = healthHud(d, DAY), w = waterOn(d, DAY);
    expect(hud.water.value).toBe(w.millilitres); expect(hud.water.target).toBe(w.targetMl);
    expect(waterToday(d, new Date(AT)).millilitres).toBe(w.millilitres);
  });
});

describe('single-key shortcuts on NOVA (P-TK-41, TK-074, N-TK-29)', () => {
  it('never inside a field, anything editable, or a text-box role', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'input']) expect(isTextEntry({tagName})).toBe(true);
    expect(isTextEntry({tagName: 'DIV', isContentEditable: true})).toBe(true);
    for (const role of ['textbox', 'searchbox', 'combobox', 'spinbutton', 'TextBox']) expect(isTextEntry({tagName: 'DIV', role})).toBe(true);
    expect(isTextEntry({tagName: 'BUTTON'})).toBe(false); expect(isTextEntry({tagName: 'BODY', role: null})).toBe(false); expect(isTextEntry(null)).toBe(false);
  });
  it('never with a modifier, Shift on a letter, an input method composing, or a held key', () => {
    expect(shortcutKind(key('c'))).toBe('dock');
    expect(shortcutKind(key(','))).toBe('dock');
    expect(shortcutKind(key('7'))).toBe('dock');
    for (const mods of [{ctrlKey: true}, {metaKey: true}, {altKey: true}, {shiftKey: true}, {isComposing: true}, {repeat: true}]) expect(shortcutKind(key('c', mods)), JSON.stringify(mods)).toBe('none');
    expect(shortcutKind(key('C', {shiftKey: true}))).toBe('none');
    expect(shortcutKind(key('?', {shiftKey: true}))).toBe('help');
    expect(shortcutKind(key('['))).toBe('panel'); expect(shortcutKind(key(']'))).toBe('panel');
    expect(shortcutKind(key(' '))).toBe('none'); expect(shortcutKind(key('Enter'))).toBe('none'); expect(shortcutKind(key('.'))).toBe('none');
  });
  it('typed words: letters (any case) continue a burst; commas, brackets and modified keys do not', () => {
    expect(typedLetter(key('a'))).toBe(true); expect(typedLetter(key('A', {shiftKey: true}))).toBe(true); expect(typedLetter(key('é'))).toBe(true);
    expect(typedLetter(key(','))).toBe(false); expect(typedLetter(key('['))).toBe(false); expect(typedLetter(key('a', {ctrlKey: true}))).toBe(false);
    expect(BURST_MS).toBeGreaterThanOrEqual(250); expect(BURST_MS).toBeLessThanOrEqual(500);
  });
  it('the list says every key a person can use, the hidden dock entries left out', () => {
    const lines = shortcutLines([{key: 'c', label: 'Checklist'}, {key: 'm', label: 'Music', hidden: true}, {key: ',', label: 'Settings'}], {panels: true, persona: 'NOVA'});
    expect(lines.map(l => l.keys)).toEqual(['C', ',', '[', ']', '?', 'Ctrl/⌘ + K', 'Esc']);
    expect(lines[0]!.does).toBe('Open Checklist');
    expect(shortcutLines([], {panels: false, persona: 'Vega'}).map(l => l.keys)).toEqual(['?', 'Ctrl/⌘ + K', 'Esc']);
  });
});
