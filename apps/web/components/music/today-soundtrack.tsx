'use client';
import {useSyncExternalStore} from 'react';
import {AMBIENT_LABELS} from '../../lib/audio/ambient-labels';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {openMusicPlayer} from './music-events';

/**
 * Today's "Your soundtrack" widget (Session W Part 20): what plays from focus sounds, and a button to the player. It asks
 * no service: what Spotify plays shows in the player itself.
 */
export function TodaySoundtrack() {
  const state = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState);
  return <div className="today-soundtrack">
    <div className="dashboard-metric-value"><strong>{state.playing ? AMBIENT_LABELS[state.sound] : 'Nothing playing'}</strong></div>
    <p className="fine">{state.playing ? 'A focus sound plays, made on this device.' : 'Focus sounds made on this device, or Spotify.'}</p>
    <button type="button" className="text-link" onClick={openMusicPlayer}>Open the player →</button>
  </div>;
}
