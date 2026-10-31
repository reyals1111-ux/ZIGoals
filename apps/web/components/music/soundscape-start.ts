import {wakeAudio} from '../../lib/audio/context';
import type {SoundscapePreset} from '../../lib/audio/mix';
import {SOUNDSCAPE_EVENT, SOUNDSCAPE_RESULT_EVENT} from './music-events';

/**
 * Session AK (owner decision MUSIC), the hook for Focus Sessions and Sleep wind-down: call from a tap's handler.
 * It wakes the page's audio inside the tap (iPhone and iPad allow sound only then), then asks the music button's
 * listener to play the soundscape. Resolves with whether it plays (false without Web Audio, or when nothing answered
 * within 5 s). Nothing is downloaded: every sound is generated on the device.
 */
export function startSoundscape(preset: SoundscapePreset): Promise<boolean> {
  void wakeAudio();
  return new Promise(resolve => {
    const done = (ok: boolean) => { window.removeEventListener(SOUNDSCAPE_RESULT_EVENT, onResult); clearTimeout(timer); resolve(ok); };
    const onResult = (event: Event) => { const detail = (event as CustomEvent<{preset?: string; ok?: boolean}>).detail; if (detail?.preset === preset) done(!!detail.ok); };
    const timer = setTimeout(() => done(false), 5000);
    window.addEventListener(SOUNDSCAPE_RESULT_EVENT, onResult);
    window.dispatchEvent(new CustomEvent(SOUNDSCAPE_EVENT, {detail: {preset}}));
  });
}
