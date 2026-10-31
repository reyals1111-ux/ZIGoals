import {readDeviceRecord} from '../device-record';
import {MUSIC_MIX} from '../music/mix-store';
import {MUSIC} from '../music/schema';
import {getAppStorage} from '../showcase-storage';
import {playMix} from './ambient';
import {SOUNDSCAPE_PRESETS, isSoundscapePreset, mixVolume, type SoundscapePreset} from './mix';

/**
 * The ready-made soundscapes (Session AK, owner decision MUSIC), the hook point for Focus Sessions and Sleep wind-down:
 * 'focus' (brown noise + focus tones, no timer), 'wind-down' (rain + soft pad, 30 min) and 'sleep' (ocean + brown noise,
 * 60 min). They play at the mix's volume (`zigoals:music-mix:v1`, else the player's own, `zigoals:music:v1`) with the
 * person's "stop when I leave" and "play on silent" choices, and never change what they saved. Usually started through
 * `startSoundscape(preset)` (components/music/soundscape-start.ts), which wakes the audio inside the tap; this loads on first use.
 */
export async function playSoundscapePreset(preset: SoundscapePreset, storage: Pick<Storage, 'getItem'> = getAppStorage()): Promise<boolean> {
  if (!isSoundscapePreset(preset)) return false;
  const chosen = SOUNDSCAPE_PRESETS[preset];
  const music = readDeviceRecord(storage, MUSIC).data, mix = readDeviceRecord(storage, MUSIC_MIX).data;
  return playMix({layers: chosen.layers, volume: mixVolume(mix, music), ...(chosen.timerMin ? {timerMin: chosen.timerMin} : {}), stopOnHide: music.ambient.stopOnHide, playOnSilent: !!mix.playOnSilent});
}
