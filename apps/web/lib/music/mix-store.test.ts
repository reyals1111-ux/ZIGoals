import {createHash} from 'node:crypto';
import {expect, test} from 'vitest';
import * as z from 'zod';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {MUSIC_MIX, MUSIC_MIX_KEY, SOUND_LAYERS, emptyMusicMix, musicMixSchema} from './mix-store';
import {AMBIENT_SOUNDS, MUSIC, MUSIC_KEY, emptyMusic, musicSchema} from './schema';

// Session AK (owner decision MUSIC; TIER 3 stored format): the mix lives in its own device key, loose and versioned,
// so the player's record `zigoals:music:v1` (read strictly by older builds) is untouched.
const store = (initial: Record<string, string> = {}) => { const map = new Map(Object.entries(initial)); return {getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); }, map}; };
const MIX = {version: 1, mix: {layers: [{sound: 'rain', level: 0.7}, {sound: 'pad', level: 0.4}, {sound: 'tones', level: 0.5}], active: true}, master: 55, timerMin: 30, preset: 'wind-down', playOnSilent: true};

test('a new key, named like every ZIGoals key; the mix offers the six ambient sounds, the pad and the tones', () => {
  expect(MUSIC_MIX.key).toBe('zigoals:music-mix:v1');
  expect(MUSIC_MIX_KEY).toMatch(/^zigoals:[a-z-]+:v1$/);
  expect(MUSIC_MIX_KEY).not.toBe(MUSIC_KEY);
  expect(SOUND_LAYERS).toEqual([...AMBIENT_SOUNDS, 'pad', 'tones']);
});
test('missing reads as "not set"; {version: 1} is a complete record; a full record parses and round-trips', () => {
  expect(readDeviceRecord(store(), MUSIC_MIX)).toEqual({data: emptyMusicMix(), unreadable: false});
  expect(musicMixSchema.parse({version: 1})).toEqual({version: 1});
  expect(musicMixSchema.parse(MIX)).toEqual(MIX);
  const s = store();
  updateDeviceRecord(s, MUSIC_MIX, () => MIX as never);
  expect(readDeviceRecord(s, MUSIC_MIX)).toEqual({data: MIX, unreadable: false});
});
test('a future record: unknown fields are kept; a field this build cannot read falls back to "not set" alone', () => {
  const later = {...MIX, futureField: {x: 1}, mix: {...MIX.mix, crossfade: 3}};
  expect(musicMixSchema.parse(later)).toEqual(later);
  const odd = {version: 1, mix: {layers: [{sound: 'thunder', level: 0.5}]}, master: 101, timerMin: 0, preset: 'party', playOnSilent: 'yes'};
  expect(musicMixSchema.parse(odd)).toEqual({version: 1, mix: undefined, master: undefined, timerMin: undefined, preset: undefined, playOnSilent: undefined});
  expect(musicMixSchema.parse({version: 1, mix: {layers: [1, 2, 3, 4]}}).mix).toBeUndefined();
});
test('unreadable bytes or another version read as "not set" and are never rewritten by a read; a bad write throws, nothing written', () => {
  for (const raw of ['{not json', JSON.stringify({version: 2, master: 50}), JSON.stringify('mix'), JSON.stringify(null)]) {
    const s = store({[MUSIC_MIX_KEY]: raw});
    expect(readDeviceRecord(s, MUSIC_MIX)).toEqual({data: emptyMusicMix(), unreadable: true});
    expect(s.map.get(MUSIC_MIX_KEY)).toBe(raw);
  }
  const clean = store();
  expect(() => updateDeviceRecord(clean, MUSIC_MIX, current => ({...current, version: 3} as never))).toThrow();
  expect(clean.map.size).toBe(0);
});
test('no field names a secret or a token (the device-record rule)', () => {
  expect(JSON.stringify(Object.keys(musicMixSchema.shape))).not.toMatch(/key|secret|token|password|seed|mnemonic|address/i);
});
test('zigoals:music:v1 is untouched: still strict, still pinned, an older record reads, a mix field is refused there', () => {
  const old = {version: 1, source: 'spotify', mini: true, volume: 40, ambient: {sound: 'rain', timerMin: 30, stopOnHide: true}};
  expect(musicSchema.parse(old)).toEqual(old);
  expect(musicSchema.parse(emptyMusic())).toEqual(emptyMusic());
  expect(musicSchema.safeParse({...old, mix: MIX.mix}).success).toBe(false);
  expect(musicSchema.safeParse({...old, playOnSilent: true}).success).toBe(false);
  expect(MUSIC.key).toBe('zigoals:music:v1');
  // The same digest lib/vault/schema-snapshot.test.ts pins for it.
  const digest = createHash('sha256').update(JSON.stringify(z.toJSONSchema(musicSchema, {io: 'input', unrepresentable: 'any'}))).digest('hex').slice(0, 16);
  expect(digest).toBe('ea64d4e5de4d9bc5');
});
