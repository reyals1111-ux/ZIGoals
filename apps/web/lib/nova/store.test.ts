import {describe, expect, it} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {DEFAULT_WIDGETS, MAX_INSTRUCTIONS, MAX_WIDGETS, NOVA_KEY, NOVA_STORE, WIDGET_LIMIT_MESSAGE, accentOf, addWidget, emptyNova, instructionsOf, layoutOf, markOpeningSeen, nudgeWidget, panelsOf, novaRecordSchema, personaOf, placeWidget, removeWidget, resizeWidget, restoreWidgets, setInstructions, setPersona, setShortcuts, shortcutsOn, widgetsFor, type NovaRecord} from './store';

const memory = (initial: Record<string, string> = {}) => { const map = new Map(Object.entries(initial)); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map}; };

describe('zigoals:nova:v1', () => {
  it('is a new device key; a missing record reads as the defaults, never as unreadable', () => {
    expect(NOVA_KEY).toBe('zigoals:nova:v1');
    const read = readDeviceRecord(memory(), NOVA_STORE);
    expect(read).toEqual({data: {version: 1}, unreadable: false});
    expect(layoutOf(read.data)).toBe('orbit'); expect(accentOf(read.data)).toBe('violet'); expect(shortcutsOn(read.data)).toBe(true);
    expect(personaOf(read.data)).toEqual({name: 'NOVA', avatar: 'orb'});
    expect(widgetsFor(read.data)).toEqual(DEFAULT_WIDGETS);
  });
  it('keeps fields a later build adds, and reads a later build’s layout or accent as the default instead of dropping the record', () => {
    const later = {version: 1, layout: 'galaxy', accent: 'ultraviolet', persona: {name: 'Vega', avatar: 'hologram'}, widgets: [{id: 'orbit', size: 'XL', slot: 0}], future: {x: 1}};
    const read = readDeviceRecord(memory({[NOVA_KEY]: JSON.stringify(later)}), NOVA_STORE);
    expect(read.unreadable).toBe(false);
    expect(layoutOf(read.data)).toBe('orbit'); expect(accentOf(read.data)).toBe('violet');
    expect(personaOf(read.data)).toEqual({name: 'Vega', avatar: 'orb'});
    expect(widgetsFor(read.data)).toEqual([{id: 'orbit', size: 'M', slot: 0}]);
    expect((read.data as Record<string, unknown>).future).toEqual({x: 1});
  });
  it('reads damaged bytes as the defaults and says so; a read never rewrites them', () => {
    const store = memory({[NOVA_KEY]: '{not json'});
    expect(readDeviceRecord(store, NOVA_STORE)).toEqual({data: {version: 1}, unreadable: true});
    expect(store.map.get(NOVA_KEY)).toBe('{not json');
  });
  it('is bounded: at most 24 widgets, each once, slots 0–23, a 24-character name, 2,000 characters of instructions', () => {
    const widgets = Array.from({length: 25}, (_, i) => ({id: `w-${i}`, size: 'S', slot: Math.min(i, 23)}));
    expect(novaRecordSchema.safeParse({version: 1, widgets}).success).toBe(false);
    expect(novaRecordSchema.safeParse({version: 1, widgets: [{id: 'water', size: 'S', slot: 0}, {id: 'water', size: 'M', slot: 1}]}).success).toBe(false);
    expect(novaRecordSchema.safeParse({version: 1, widgets: [{id: 'water', size: 'S', slot: 24}]}).success).toBe(false);
    expect(novaRecordSchema.safeParse({version: 1, widgets: [{id: 'Not An Id', size: 'S', slot: 0}]}).success).toBe(false);
    expect(novaRecordSchema.safeParse({version: 1, persona: {name: 'x'.repeat(25)}}).success).toBe(false);
    expect(novaRecordSchema.safeParse({version: 1, persona: {name: 'Bad\u0007name'}}).success).toBe(false);
    expect(novaRecordSchema.safeParse({version: 1, customInstructions: 'x'.repeat(MAX_INSTRUCTIONS + 1)}).success).toBe(false);
    expect(novaRecordSchema.safeParse({version: 1, dock: {order: Array.from({length: 33}, (_, i) => `d-${i}`)}}).success).toBe(false);
    expect(novaRecordSchema.safeParse({version: 2}).success).toBe(false);
  });
  it('review M8 (lane L8d): a brand-new NOVA starts on the Command preset; a record that exists keeps its widgets', async () => {
    const {presetWidgets} = await import('./layout');
    expect(markOpeningSeen(emptyNova())).toEqual({version: 1, openingSeen: true, widgets: presetWidgets('command')});
    expect(widgetsFor(markOpeningSeen(emptyNova())).map(w => w.id)).toEqual(presetWidgets('command').map(w => w.id));
    // Opened before (openingSeen) or arranged in any way: untouched, the earlier defaults still read as before.
    expect(widgetsFor({version: 1, openingSeen: true})).toEqual([...DEFAULT_WIDGETS]);
    expect(markOpeningSeen({version: 1, accent: 'gold'})).toEqual({version: 1, accent: 'gold', openingSeen: true});
    expect(markOpeningSeen({version: 1, widgets: []})).toEqual({version: 1, widgets: [], openingSeen: true});
  });
  it('review m9 (lane L8d): two widgets trade places; an unknown id changes nothing', async () => {
    const {swapWidgets} = await import('./store');
    const r: NovaRecord = {version: 1, widgets: [{id: 'water', size: 'S', slot: 0}, {id: 'orbit', size: 'M', slot: 1}, {id: 'next', size: 'M', slot: 2}]};
    expect(widgetsFor(swapWidgets(r, 'water', 'next')).map(w => w.id)).toEqual(['next', 'orbit', 'water']);
    expect(swapWidgets(r, 'water', 'gone')).toBe(r);
  });
  it('writes through the device record helpers and keeps every other field', () => {
    const store = memory({[NOVA_KEY]: JSON.stringify({version: 1, customInstructions: 'Short answers.', future: 1})});
    const next = updateDeviceRecord(store, NOVA_STORE, r => markOpeningSeen(r));
    expect(next).toEqual({version: 1, customInstructions: 'Short answers.', future: 1, openingSeen: true});
    expect(JSON.parse(store.map.get(NOVA_KEY)!)).toEqual(next);
  });
});

describe('widgets on their orbits', () => {
  const r: NovaRecord = {version: 1, widgets: [{id: 'water', size: 'S', slot: 5}, {id: 'orbit', size: 'M', slot: 1}, {id: 'gone', size: 'L', slot: 2}]};
  it('reads in slot order, drops ids the build does not know, renumbers without gaps', () => {
    expect(widgetsFor(r, id => id !== 'gone')).toEqual([{id: 'orbit', size: 'M', slot: 0}, {id: 'water', size: 'S', slot: 1}]);
  });
  it('an empty list stays empty (the person removed every widget); only an absent list means the defaults', () => {
    expect(widgetsFor({version: 1, widgets: []})).toEqual([]);
  });
  it('adds at the end or at a place, never twice, and refuses a 25th in plain words', () => {
    const one = addWidget(emptyNova(), 'markets', 'L');
    expect(widgetsFor(one).at(-1)).toEqual({id: 'markets', size: 'L', slot: DEFAULT_WIDGETS.length});
    expect(addWidget(one, 'markets')).toBe(one);
    expect(widgetsFor(addWidget({version: 1, widgets: []}, 'water', 'S', 9))).toEqual([{id: 'water', size: 'S', slot: 0}]);
    const full: NovaRecord = {version: 1, widgets: Array.from({length: MAX_WIDGETS}, (_, i) => ({id: `w-${i}`, size: 'S' as const, slot: i}))};
    expect(() => addWidget(full, 'water')).toThrow(WIDGET_LIMIT_MESSAGE);
  });
  it('removes, resizes and moves (drag or the keyboard alternative); undo puts the list back exactly', () => {
    const start: NovaRecord = {version: 1, widgets: [{id: 'a', size: 'S', slot: 0}, {id: 'b', size: 'M', slot: 1}, {id: 'c', size: 'L', slot: 2}]};
    expect(widgetsFor(removeWidget(start, 'b')).map(w => w.id)).toEqual(['a', 'c']);
    expect(removeWidget(start, 'zzz')).toBe(start);
    expect(widgetsFor(resizeWidget(start, 'a', 'L'))[0]).toEqual({id: 'a', size: 'L', slot: 0});
    expect(resizeWidget(start, 'a', 'S')).toBe(start);
    expect(widgetsFor(placeWidget(start, 'c', 0)).map(w => w.id)).toEqual(['c', 'a', 'b']);
    expect(widgetsFor(placeWidget(start, 'a', 99)).map(w => w.id)).toEqual(['b', 'c', 'a']);
    expect(widgetsFor(nudgeWidget(start, 'b', -1)).map(w => w.id)).toEqual(['b', 'a', 'c']);
    expect(widgetsFor(nudgeWidget(start, 'c', 1)).map(w => w.id)).toEqual(['a', 'b', 'c']);
    const before = widgetsFor(start), changed = removeWidget(start, 'a');
    expect(widgetsFor(restoreWidgets(changed, before))).toEqual(before);
  });
});

describe('persona, instructions, shortcuts', () => {
  it('folds spaces in the name; a blank name or "NOVA" means the default and is not stored', () => {
    expect(personaOf(setPersona(emptyNova(), {name: '  Vega   Star '}))).toEqual({name: 'Vega Star', avatar: 'orb'});
    expect(setPersona(emptyNova(), {name: '   '}).persona).toEqual({});
    expect(setPersona(emptyNova(), {name: 'NOVA', avatar: 'zigi'}).persona).toEqual({avatar: 'zigi'});
    expect(() => setPersona(emptyNova(), {name: 'x'.repeat(25)})).toThrow('24 characters');
  });
  it('custom instructions: kept as written, blank removes them, over 2,000 characters refused', () => {
    expect(instructionsOf(setInstructions(emptyNova(), '  Call me by my first name. '))).toBe('Call me by my first name.');
    expect(setInstructions({version: 1, customInstructions: 'x'}, '  ')).toEqual({version: 1});
    expect(() => setInstructions(emptyNova(), 'x'.repeat(2001))).toThrow('2,000');
  });
  it('single-key shortcuts can be turned off (WCAG 2.1.4)', () => {
    expect(shortcutsOn(setShortcuts(emptyNova(), false))).toBe(false);
    expect(shortcutsOn(setShortcuts(emptyNova(), true))).toBe(true);
  });
});

describe('N12: your name, the panels, routing and the wake phrase', () => {
  it('your name: trimmed, at most 40 characters, blank removes it', async () => {
    const {setYourName, yourNameOf} = await import('./store');
    expect(yourNameOf(setYourName(emptyNova(), '  Rey   Example '))).toBe('Rey Example');
    expect(setYourName({version: 1, yourName: 'Rey'}, ' ')).toEqual({version: 1});
    expect(() => setYourName(emptyNova(), 'x'.repeat(41))).toThrow('40 characters');
  });
  it('panels follow the width until the person chooses, then stay as chosen on this device', async () => {
    const {panelsOf, setLeftPanel, setRightPanel, foldSection, nextLeft} = await import('./store');
    // Release review 2 (R2-3), a deliberate change: "Behind the intelligence" starts hidden at every width until opened.
    expect(panelsOf(emptyNova(), 1920)).toEqual({left: 'open', right: 'hidden', folded: []});
    expect(panelsOf(emptyNova(), 1440)).toEqual({left: 'open', right: 'hidden', folded: []});
    expect(panelsOf(emptyNova(), 1280)).toEqual({left: 'rail', right: 'hidden', folded: []});
    expect(panelsOf(emptyNova(), 1024)).toEqual({left: 'hidden', right: 'hidden', folded: []});
    const chosen = setRightPanel(setLeftPanel(emptyNova(), 'hidden'), 'open');
    expect(panelsOf(chosen, 1920)).toMatchObject({left: 'hidden', right: 'open'});
    expect(panelsOf(chosen, 1024)).toMatchObject({left: 'hidden', right: 'open'});
    expect(panelsOf(foldSection(chosen, 'voice', true), 1920).folded).toEqual(['voice']);
    expect(panelsOf(foldSection(foldSection(chosen, 'voice', true), 'voice', false), 1920).folded).toEqual([]);
    expect(panelsOf(novaRecordSchema.parse({version: 1, panels: {left: 'floating', folded: ['brains', 'gone']}}), 1920)).toMatchObject({left: 'open', folded: ['brains']});
    expect([nextLeft('open'), nextLeft('rail'), nextLeft('hidden')]).toEqual(['rail', 'hidden', 'open']);
  });
  it('routing is "auto" unless a model is chosen; the wake phrase is off unless turned on', async () => {
    const {routingOf, setRouting, wakeOn, setWake} = await import('./store');
    expect(routingOf(emptyNova())).toBe('auto');
    expect(routingOf(setRouting(emptyNova(), 'llama3.2:3b'))).toBe('llama3.2:3b');
    expect(setRouting({version: 1, routing: 'x'}, 'auto')).toEqual({version: 1});
    expect(() => setRouting(emptyNova(), 'x'.repeat(201))).toThrow();
    expect(wakeOn(emptyNova())).toBe(false); expect(wakeOn(setWake(emptyNova(), true))).toBe(true);
  });
});

describe('the Showcase’s NOVA (proposed for the lead)', () => {
  it('is a valid record with no personal field, and plays the opening once', async () => {
    const {showcaseNova} = await import('./store');
    const r = showcaseNova('2026-11-01');
    expect(novaRecordSchema.safeParse(r).success).toBe(true);
    expect(r.openingSeen).toBeUndefined(); expect(r.yourName).toBeUndefined(); expect(r.customInstructions).toBeUndefined();
    expect(widgetsFor(r).map(w => w.id)).toContain('briefs');
    // Session AK WA (T1/T3): the tasks and the running-focus widgets read the Showcase's own labelled records.
    expect(widgetsFor(r).map(w => w.id)).toEqual(expect.arrayContaining(['tasks', 'focus']));
    // Review fixes (lane L8d, NOVA_HUD_REVIEW m15, B2): the Showcase is the Command preset itself — the four pillar
    // instruments first, then the agenda clock and the day's panels — with no duplicate panel, and "Behind the
    // intelligence" closed so the HUD is the first view at 1440 px (it replaces the second pass's 17-widget arrangement).
    const {presetShown, presetWidgets} = await import('./layout');
    expect(widgetsFor(r)).toEqual(presetWidgets('command'));
    expect(presetShown(layoutOf(r), widgetsFor(r))).toBe('command');
    expect(widgetsFor(r).slice(0, 4).map(w => w.id)).toEqual(['health-hud', 'habits-hud', 'goals-hud', 'wealth-hud']);
    for (const twin of ['goal-pace', 'next', 'glance']) expect(widgetsFor(r).map(w => w.id), `${twin} repeats an instrument`).not.toContain(twin);
    expect(r.panels?.right).toBeUndefined();
    // Second review M3, M4 (lane L8f): the window decides the left panel (open at 1440, the rail at 1280, folded on a tablet).
    expect(r.panels?.left).toBeUndefined();
    expect([1440, 1280, 820].map(w => panelsOf(r, w).left)).toEqual(['open', 'rail', 'hidden']);
  });
});
