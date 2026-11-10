import {describe, expect, it} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../../device-record';
import {HUD_PRESETS, HUD_PRESET_PLAN, NOVA_HUD, NOVA_HUD_KEY, hudLookOf, phoneColumn, presetShown, presetWidgets, setHudLook, setHudPreset} from '../layout';
import {NOVA_STORE, novaRecordSchema, widgetsFor, DEFAULT_WIDGETS} from '../store';
import {isWidgetId} from '../widgets/catalog';

/** Session AL Part 11 (lane L8): the HUD's device record (TIER 3 stored format, additive) and its presets. */
const store = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), raw: (k: string) => m.get(k)};
};

describe('the HUD record (zigoals:nova-hud:v1)', () => {
  it('is a new key; absent reads as Holo, the default look', () => {
    expect(NOVA_HUD_KEY).toBe('zigoals:nova-hud:v1');
    const read = readDeviceRecord(store(), NOVA_HUD);
    expect(read).toEqual({data: {version: 1}, unreadable: false});
    expect(hudLookOf(read.data)).toBe('holo');
  });
  it('tolerant reads: an unknown look or preset reads as the default; extra fields survive; bad bytes read as the default', () => {
    const odd = readDeviceRecord(store({[NOVA_HUD_KEY]: JSON.stringify({version: 1, look: 'neon-2030', preset: 'galaxy', later: {x: 1}})}), NOVA_HUD);
    expect(odd.unreadable).toBe(false);
    expect(hudLookOf(odd.data)).toBe('holo');
    expect(odd.data.preset).toBeUndefined();
    expect((odd.data as Record<string, unknown>).later).toEqual({x: 1});
    expect(readDeviceRecord(store({[NOVA_HUD_KEY]: '{nope'}), NOVA_HUD)).toEqual({data: {version: 1}, unreadable: true});
  });
  it('writes the look and the preset, and reads them back', () => {
    const s = store();
    updateDeviceRecord(s, NOVA_HUD, r => setHudPreset(setHudLook(r, 'classic'), 'wealth'));
    expect(JSON.parse(s.raw(NOVA_HUD_KEY)!)).toEqual({version: 1, look: 'classic', preset: 'wealth'});
    expect(hudLookOf(readDeviceRecord(s, NOVA_HUD).data)).toBe('classic');
  });
  it('old NOVA layouts read unchanged: the NOVA record and its widgets are not touched by this key', () => {
    const old = {version: 1, layout: 'bento', widgets: [{id: 'water', size: 'L', slot: 0}, {id: 'orbit', size: 'M', slot: 1}], accent: 'cyan'};
    const s = store({'zigoals:nova:v1': JSON.stringify(old)});
    const read = readDeviceRecord(s, NOVA_STORE);
    expect(read.data).toEqual(novaRecordSchema.parse(old));
    expect(widgetsFor(read.data, isWidgetId)).toEqual([{id: 'water', size: 'L', slot: 0}, {id: 'orbit', size: 'M', slot: 1}]);
    expect(widgetsFor({version: 1}, isWidgetId)).toEqual([...DEFAULT_WIDGETS]);
    // An older build that does not know a HUD instrument leaves it out (its `known` refuses the id); nothing else moves.
    const withHud = novaRecordSchema.parse({...old, widgets: [...old.widgets, {id: 'health-hud', size: 'L', slot: 2}]});
    expect(widgetsFor(withHud, id => id !== 'health-hud').map(w => w.id)).toEqual(['water', 'orbit']);
  });
});

describe('presets', () => {
  it('every preset names only known widgets and fits NOVA\'s record', () => {
    for (const p of HUD_PRESETS) {
      for (const w of HUD_PRESET_PLAN[p].widgets) expect(isWidgetId(w.id), `${p}: ${w.id}`).toBe(true);
      expect(() => novaRecordSchema.parse({version: 1, layout: HUD_PRESET_PLAN[p].layout, widgets: presetWidgets(p)})).not.toThrow();
    }
  });
  it('a preset leaves out what is not available here, and is recognised until the person changes anything', () => {
    const noMarkets = (id: string) => id !== 'markets';
    expect(presetWidgets('wealth', noMarkets).map(w => w.id)).not.toContain('markets');
    const w = presetWidgets('wealth', noMarkets);
    expect(presetShown('orbit', w, noMarkets)).toBe('wealth');
    expect(presetShown('bento', w, noMarkets)).toBeNull();
    expect(presetShown('orbit', w.map((x, i) => i === 0 ? {...x, size: 'S'} : x), noMarkets)).toBeNull();
    expect(presetShown('orbit', [...w].reverse(), noMarkets)).toBeNull();
  });
  it('a phone shows one column of what the layout shows', () => {
    const w = presetWidgets('command');
    expect(phoneColumn('orbit', w)).toEqual(w);
    expect(phoneColumn('focus', w)).toHaveLength(3);
    expect(phoneColumn('minimal', w)).toEqual([]);
  });
});
