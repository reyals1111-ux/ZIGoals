import {MAX_MIX_LAYERS, SOUND_LAYERS, type MusicMixPrefs, type SOUNDSCAPE_PRESET_NAMES, type SoundLayer} from '../music/mix-store';
import type {MusicPrefs} from '../music/schema';

/**
 * A mix of focus sounds (Session AK, owner decision MUSIC), as plain data: up to three sounds, each with a level from 0
 * to 1, and the three ready-made soundscapes other features start (Focus Sessions, Sleep wind-down). No audio here: the
 * player (lib/audio/ambient.ts) turns a mix into sound; these rules are what the panel, the page and the tests share.
 */
export type MixLayer = {sound: SoundLayer; level: number};
export {MAX_MIX_LAYERS};
export const DEFAULT_LEVEL = 0.7;
/** A level kept between 0 and 1 (anything not a number is silence). */
export const clampLevel = (level: number) => Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
/** A level (0–1) to a layer's gain: squared, so the slider's middle sounds like the middle. */
export const layerGain = (level: number) => clampLevel(level) ** 2;
const known = new Set<string>(SOUND_LAYERS);
/** A clean mix: known sounds only, each once, levels clamped, at most three (the first ones kept). */
export function normalizeMix(layers: readonly {sound: string; level: number}[]): MixLayer[] {
  const seen = new Set<string>(), out: MixLayer[] = [];
  for (const layer of layers) {
    if (out.length >= MAX_MIX_LAYERS) break;
    if (!known.has(layer.sound) || seen.has(layer.sound)) continue;
    seen.add(layer.sound); out.push({sound: layer.sound as SoundLayer, level: clampLevel(layer.level)});
  }
  return out;
}
/** Adds a sound, or takes it out when it is in already. A fourth sound is refused (`full`), the mix unchanged. */
export function toggleLayer(layers: readonly MixLayer[], sound: SoundLayer, level = DEFAULT_LEVEL): {layers: MixLayer[]; full: boolean} {
  if (layers.some(l => l.sound === sound)) return {layers: layers.filter(l => l.sound !== sound), full: false};
  if (layers.length >= MAX_MIX_LAYERS) return {layers: [...layers], full: true};
  return {layers: [...layers, {sound, level: clampLevel(level)}], full: false};
}
export const setLayerLevelIn = (layers: readonly MixLayer[], sound: SoundLayer, level: number): MixLayer[] => layers.map(l => l.sound === sound ? {...l, level: clampLevel(level)} : l);
/** The mix record (`zigoals:music-mix:v1`) with these layers, played or not; every other field kept. */
export const withMix = (record: MusicMixPrefs, layers: readonly MixLayer[], active: boolean): MusicMixPrefs => ({...record, mix: {layers: normalizeMix(layers), active}});
/** The saved mix's layers, cleaned; and whether the player plays the mix rather than one sound. */
export const savedLayers = (record: MusicMixPrefs): MixLayer[] => normalizeMix(record.mix?.layers ?? []);
export const mixIsActive = (record: MusicMixPrefs): boolean => !!record.mix?.active && savedLayers(record).length > 0;
/** The mix's volume: its own master, else the player's volume (`zigoals:music:v1`). */
export const mixVolume = (record: MusicMixPrefs, music: MusicPrefs): number => record.master ?? music.volume;

/** Sleep timer choices in minutes (off is no timer), and the gentle fade at its end. */
export const TIMER_CHOICES = [15, 30, 45, 60, 90] as const;
export const TIMER_FADE_S = 30;
/**
 * When a timed sound fades, on the audio clock (seconds): it holds its level until `holdUntil`, then ramps to silence at
 * `end`. The fade is 30 s, or shorter when the sound has not finished fading in by then (never before `fadeInEnd`).
 */
export function timerSchedule(start: number, timerMin: number, fadeIn: number): {holdUntil: number; end: number} {
  const end = start + timerMin * 60;
  return {holdUntil: Math.max(start + fadeIn, end - TIMER_FADE_S), end};
}

/** The ready-made soundscapes (hook points for Focus Sessions and Sleep wind-down). */
export const SOUNDSCAPE_PRESETS = {
  focus: {label: 'Focus', layers: [{sound: 'brown', level: 0.7}, {sound: 'tones', level: 0.45}], timerMin: undefined},
  'wind-down': {label: 'Wind down', layers: [{sound: 'rain', level: 0.7}, {sound: 'pad', level: 0.5}], timerMin: 30},
  sleep: {label: 'Sleep', layers: [{sound: 'ocean', level: 0.75}, {sound: 'brown', level: 0.45}], timerMin: 60},
} as const satisfies Record<typeof SOUNDSCAPE_PRESET_NAMES[number], {label: string; layers: readonly MixLayer[]; timerMin: number | undefined}>;
export type SoundscapePreset = keyof typeof SOUNDSCAPE_PRESETS;
export const SOUNDSCAPE_PRESET_IDS = Object.keys(SOUNDSCAPE_PRESETS) as SoundscapePreset[];
export const isSoundscapePreset = (value: unknown): value is SoundscapePreset => typeof value === 'string' && Object.hasOwn(SOUNDSCAPE_PRESETS, value);
