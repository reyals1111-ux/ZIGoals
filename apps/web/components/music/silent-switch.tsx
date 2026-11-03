'use client';
import {silentSwitchChoice} from '../../lib/audio/audio-session';
import type {MusicMixState} from './use-music-mix';

/**
 * "Play when the phone is on silent" and what it does, said plainly (lib/audio/audio-session.ts). Kept in the mix's record
 * (`zigoals:music-mix:v1`, field `playOnSilent`); it applies to every focus sound and mix.
 */
export function SilentSwitchChoice({mix}: {mix: MusicMixState}) {
  const supported = silentSwitchChoice();
  return <div className="music-mix-silent">
    <label className="checkbox"><input type="checkbox" checked={!!mix.data.playOnSilent} onChange={e => { const on = e.target.checked; mix.save(m => ({...m, playOnSilent: on})); }}/><span>Play when the phone is on silent</span></label>
    <p className="music-mix-hint">On iPhone and iPad, sounds made in the browser follow the ring/silent switch, so on silent you hear nothing. Turn this on to play anyway{supported ? '' : ' (this browser doesn’t offer the choice, so its own rule applies)'}. Elsewhere the device’s volume and mute decide. Applies from the next Play.</p>
    {mix.error && <p className="music-problem" role="alert">{mix.error}</p>}
  </div>;
}
