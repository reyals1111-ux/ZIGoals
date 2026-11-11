'use client';
import {useSyncExternalStore} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {usePagesView} from '../../pages/use-pages-view';
import {isShown} from '../../../lib/pages/visibility';
import {AMBIENT_LABELS, playAmbient, playMix, stopAmbient} from '../../../lib/audio/ambient';
import {LAYER_LABELS, playingLabel} from '../../../lib/audio/ambient-labels';
import {mixIsActive, mixVolume, savedLayers} from '../../../lib/audio/mix';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../../lib/audio/ambient-state';
import {APPLE_MUSIC_HOME} from '../../../lib/music/brand';
import {MUSIC} from '../../../lib/music/schema';
import {openMusicPlayer} from '../../music/music-events';
import {useMusicMix} from '../../music/use-music-mix';
import {NovaReading} from './empty';

/**
 * "Now playing": what ZIGoals' own player is doing, live from its store (lib/audio/ambient-state.ts), with play and stop
 * as the music mini-bar has them (components/music/music-mini.tsx: the same functions, the same saved choices). Spotify and
 * Apple Music play in their own apps; NOVA opens the player for them and asks Spotify for nothing.
 */
export default function NowPlayingWidget() {
  const prefs = useDeviceRecord(MUSIC), mixRecord = useMusicMix(), ambient = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState);
  const playerShown = isShown(usePagesView(), 'music');
  if (!prefs.loaded || !mixRecord.loaded) return <NovaReading/>;
  const source = prefs.data.source, {sound, timerMin, stopOnHide} = prefs.data.ambient, playOnSilent = !!mixRecord.data.playOnSilent;
  const mix = savedLayers(mixRecord.data), mixMode = mixIsActive(mixRecord.data), mixTimer = mixRecord.data.timerMin;
  const label = source === 'ambient' ? (ambient.playing ? playingLabel(ambient) : mixMode ? `Your mix · ${mix.map(l => LAYER_LABELS[l.sound]).join(' + ')}` : `Focus sounds · ${AMBIENT_LABELS[sound]}`) : source === 'spotify' ? 'Spotify' : 'Apple Music';
  // Session AK lane EXF (EX-14): the widget's own link already reads "Open Music" (lib/nova/widgets/catalog.ts); the player
  // button is the one extra door, and only where the player is shown.
  const open = playerShown ? <button type="button" className="nova-chip-link" onClick={openMusicPlayer}>Open the player</button> : null;
  return <div className="nova-playing" data-playing={source === 'ambient' && ambient.playing || undefined}>
    {/* Session AM-2: a small level meter (five columns; an ornament: it moves only while this device's own sound plays, under Full motion). */}
    <span className="nova-disc" aria-hidden="true"><i/><i/><i/><i/><i/></span>
    <div className="nova-playing-text">
      <p className="nova-line"><strong>{label}</strong></p>
      <p className="nova-line nova-quiet" role="status">{source === 'ambient' ? (ambient.playing ? 'Playing, made on this device.' : 'Stopped.') : source === 'spotify' ? 'Plays in Spotify; the player has its controls.' : 'Plays in Apple Music.'}</p>
    </div>
    <div className="nova-playing-actions">
      {source === 'ambient' ? <button type="button" className="nova-round" aria-label={ambient.playing ? 'Stop the focus sound' : 'Play the focus sound'}
        onClick={() => { if (ambient.playing) stopAmbient(); else if (mixMode) void playMix({layers: mix, volume: mixVolume(mixRecord.data, prefs.data), ...(mixTimer ? {timerMin: mixTimer} : {}), stopOnHide, playOnSilent}); else void playAmbient({sound, volume: prefs.data.volume, ...(timerMin ? {timerMin} : {}), stopOnHide, playOnSilent}); }}>
        {ambient.playing ? <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/></svg> : <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>}
      </button> : source === 'apple' ? <a className="nova-chip-link" href={APPLE_MUSIC_HOME} target="_blank" rel="noopener noreferrer">Open Apple Music <span className="sr-only">(opens a new tab)</span></a> : null}
      {open}
    </div>
  </div>;
}
