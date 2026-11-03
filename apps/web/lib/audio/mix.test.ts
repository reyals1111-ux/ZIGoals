import {describe, expect, test} from 'vitest';
import {DEFAULT_LEVEL, MAX_MIX_LAYERS, SOUNDSCAPE_PRESETS, SOUNDSCAPE_PRESET_IDS, TIMER_CHOICES, TIMER_FADE_S, clampLevel, isSoundscapePreset, layerGain, mixIsActive, mixVolume, normalizeMix, savedLayers, setLayerLevelIn, timerSchedule, toggleLayer, withMix} from './mix';
import {SOUNDSCAPE_PRESET_NAMES} from '../music/mix-store';
import {emptyMusic} from '../music/schema';
import {LAYER_LABELS, MIX_ORDER, TONES_NOTE, playingLabel} from './ambient-labels';
import {SOUND_LAYERS} from '../music/mix-store';

// Session AK (owner decision MUSIC): the mix's rules, the timer's fade and the ready-made soundscapes, as plain data.
describe('the mix', () => {
  test('levels stay between 0 and 1; anything not a number is silence; the gain is the level squared', () => {
    expect([-1, 0, 0.4, 1, 1.7, Number.NaN, Number.POSITIVE_INFINITY].map(clampLevel)).toEqual([0, 0, 0.4, 1, 1, 0, 0]);
    expect(layerGain(0.5)).toBe(0.25);
    expect(layerGain(3)).toBe(1);
  });
  test('at most three sounds, each once, known sounds only, levels clamped', () => {
    expect(MAX_MIX_LAYERS).toBe(3);
    expect(normalizeMix([{sound: 'rain', level: 2}, {sound: 'rain', level: 0.1}, {sound: 'thunder', level: 0.5}, {sound: 'pad', level: -1}, {sound: 'tones', level: 0.3}, {sound: 'ocean', level: 0.9}]))
      .toEqual([{sound: 'rain', level: 1}, {sound: 'pad', level: 0}, {sound: 'tones', level: 0.3}]);
  });
  test('adding a fourth sound is refused and changes nothing; a sound already in is taken out', () => {
    let layers = toggleLayer([], 'rain').layers;
    expect(layers).toEqual([{sound: 'rain', level: DEFAULT_LEVEL}]);
    layers = toggleLayer(layers, 'pad').layers; layers = toggleLayer(layers, 'tones', 1.5).layers;
    expect(layers.map(l => l.sound)).toEqual(['rain', 'pad', 'tones']);
    expect(layers[2]!.level).toBe(1);
    const fourth = toggleLayer(layers, 'ocean');
    expect(fourth).toEqual({layers, full: true});
    expect(toggleLayer(layers, 'pad')).toEqual({layers: [{sound: 'rain', level: DEFAULT_LEVEL}, {sound: 'tones', level: 1}], full: false});
    expect(setLayerLevelIn(layers, 'rain', -3)[0]).toEqual({sound: 'rain', level: 0});
    const record = withMix({version: 1, playOnSilent: true}, [...layers, {sound: 'ocean', level: 1}], true);
    expect(record).toEqual({version: 1, playOnSilent: true, mix: {layers, active: true}});
    expect(savedLayers(record)).toEqual(layers);
    expect(mixIsActive(record)).toBe(true);
    expect(mixIsActive(withMix(record, [], true))).toBe(false);
    expect(mixIsActive({version: 1})).toBe(false);
  });
  test('the mix plays at its own volume once set, else at the player\'s', () => {
    expect(mixVolume({version: 1}, {...emptyMusic(), volume: 35})).toBe(35);
    expect(mixVolume({version: 1, master: 80}, {...emptyMusic(), volume: 35})).toBe(80);
  });
  test('every sound is offered once, by name; the focus tones say what they are, word for word', () => {
    expect([...MIX_ORDER].sort()).toEqual([...SOUND_LAYERS].sort());
    expect(Object.keys(LAYER_LABELS).sort()).toEqual([...SOUND_LAYERS].sort());
    expect(TONES_NOTE).toBe('Focus tones (binaural-style) — for relaxation, not therapy; use headphones');
    expect(playingLabel({sound: 'rain'})).toBe('Rain-like');
    expect(playingLabel({sound: 'rain', layers: ['rain', 'pad', 'tones']})).toBe('Rain-like + Soft synth pad + Focus tones');
  });
});

describe('the sleep timer', () => {
  test('off, 15, 30, 45, 60 or 90 minutes, with a 30-second fade to silence at the end', () => {
    expect(TIMER_CHOICES).toEqual([15, 30, 45, 60, 90]);
    expect(TIMER_FADE_S).toBe(30);
    for (const minutes of TIMER_CHOICES) expect(timerSchedule(100, minutes, 1.5)).toEqual({holdUntil: 100 + minutes * 60 - 30, end: 100 + minutes * 60});
  });
  test('the fade never starts before the sound has faded in', () => {
    expect(timerSchedule(0, 0.25, 1.5)).toEqual({holdUntil: 1.5, end: 15});
  });
});

describe('the ready-made soundscapes', () => {
  test('focus is brown noise + focus tones; wind-down is rain + pad for 30 min; sleep is ocean + brown noise for 60 min', () => {
    expect(SOUNDSCAPE_PRESET_IDS).toEqual(['focus', 'wind-down', 'sleep']);
    expect(SOUNDSCAPE_PRESET_IDS).toEqual([...SOUNDSCAPE_PRESET_NAMES]);
    const shape = (id: keyof typeof SOUNDSCAPE_PRESETS) => ({sounds: SOUNDSCAPE_PRESETS[id].layers.map(l => l.sound), timerMin: SOUNDSCAPE_PRESETS[id].timerMin});
    expect(shape('focus')).toEqual({sounds: ['brown', 'tones'], timerMin: undefined});
    expect(shape('wind-down')).toEqual({sounds: ['rain', 'pad'], timerMin: 30});
    expect(shape('sleep')).toEqual({sounds: ['ocean', 'brown'], timerMin: 60});
    for (const id of SOUNDSCAPE_PRESET_IDS) expect(normalizeMix(SOUNDSCAPE_PRESETS[id].layers)).toEqual(SOUNDSCAPE_PRESETS[id].layers);
  });
  test('only the three names are presets', () => {
    expect(['focus', 'wind-down', 'sleep'].every(isSoundscapePreset)).toBe(true);
    expect(['toString', 'Focus', '', null, 3].some(isSoundscapePreset)).toBe(false);
  });
});
