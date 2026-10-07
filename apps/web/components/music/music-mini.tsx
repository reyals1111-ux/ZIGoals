'use client';
import {useSyncExternalStore} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {AMBIENT_LABELS, playAmbient, stopAmbient} from '../../lib/audio/ambient';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {APPLE_MUSIC_HOME} from '../../lib/music/brand';
import {MUSIC} from '../../lib/music/schema';
import {useSpotifyClientId} from './music-config';
import {ControlIcon, Disc} from './music-ui';
import {useSpotify} from './use-spotify';
import './music-panel.css';

/**
 * The mini-bar (Session W Part 20): chosen in the panel, it takes the music button's place, on the same side. It shows
 * the source and play or pause; a tap on the name opens the panel. Spotify's track name needs its logo, so the bar says
 * only "Spotify" (the panel shows the rest); Spotify is asked only while the bar shows, the page is visible and the
 * panel is closed.
 */
export default function MusicMini({phone, onOpen, expanded}: {phone: boolean; onOpen: () => void; expanded: boolean}) {
  const prefs = useDeviceRecord(MUSIC), ambient = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState);
  const source = prefs.data.source, config = useSpotifyClientId();
  const spotify = useSpotify({clientId: source === 'spotify' ? config.clientId : null, active: source === 'spotify' && !expanded});
  if (!prefs.loaded) return null;
  const {sound, timerMin, stopOnHide} = prefs.data.ambient;
  const label = source === 'ambient' ? (ambient.playing ? AMBIENT_LABELS[ambient.sound] : `Focus sounds · ${AMBIENT_LABELS[sound]}`) : source === 'spotify' ? 'Spotify' : 'Apple Music';
  const playing = source === 'ambient' ? ambient.playing : source === 'spotify' ? !!spotify.playback?.playing : false;
  return <div className={`music-mini${phone ? ' music-mini-phone' : ''}`} role="group" aria-label="Music player">
    <button type="button" className="music-mini-open" aria-haspopup="dialog" aria-expanded={expanded} aria-label={`${label}: open the music player`} onClick={onOpen}>
      <Disc small spinning={playing}/><span className="music-mini-title">{label}</span>
    </button>
    {source === 'apple' ? <a className="music-mini-play" href={APPLE_MUSIC_HOME} target="_blank" rel="noopener noreferrer" aria-label="Open Apple Music">↗</a>
      : source === 'spotify' && !(spotify.available && spotify.connected) ? null
      : <button type="button" className="music-mini-play" disabled={spotify.busy && source === 'spotify'} aria-label={playing ? (source === 'ambient' ? 'Stop the focus sound' : 'Pause Spotify') : (source === 'ambient' ? 'Play the focus sound' : 'Play on Spotify')}
          onClick={() => {
            if (source === 'ambient') { if (ambient.playing) stopAmbient(); else void playAmbient({sound, volume: prefs.data.volume, ...(timerMin ? {timerMin} : {}), stopOnHide}); }
            else void spotify.act(p => playing ? p.pause() : p.play());
          }}><ControlIcon name={playing ? (source === 'ambient' ? 'stop' : 'pause') : 'play'}/></button>}
  </div>;
}
