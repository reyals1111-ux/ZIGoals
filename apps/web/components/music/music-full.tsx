'use client';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {MUSIC, type MusicPrefs} from '../../lib/music/schema';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import MixPlayer from './mix-player';
import {AmbientSource, AppleSource} from './music-panel';
import PlaylistLinks from './playlist-links';
import {SpotifySource} from './spotify-source';
import {useMusicMix} from './use-music-mix';
import './music-panel.css';
import './music-mix.css';

/**
 * /app/music (Session AK, owner decision MUSIC): the full player, with the same parts as the music panel: focus sounds
 * with previous and next, the mix of up to three sounds with its volume, sleep timer and switches, the playlist links,
 * Spotify (with "Use my own Spotify app") and Apple Music. The choices are this device's (`zigoals:music:v1`, and the mix's own `zigoals:music-mix:v1`); every
 * sound is generated here, so it works offline. Loaded as its own chunk by components/music/music-page-client.tsx.
 */
export default function MusicFull() {
  const prefs = useDeviceRecord(MUSIC), mix = useMusicMix(), [error, setError] = useState('');
  const save = (change: (m: MusicPrefs) => MusicPrefs) => { try { prefs.update(change); setError(''); return true; } catch (err) { setError(`Not saved on this device. ${deviceSettingFailureMessage(err)}`); return false; } };
  if (!prefs.loaded || !mix.loaded) return <p className="fine" role="status">Loading the player…</p>;
  return <div className="music-page">
    <section className="music-page-card music-page-now" aria-labelledby="music-page-sounds">
      <p className="music-eyebrow" id="music-page-sounds">Focus sounds</p>
      <AmbientSource prefs={prefs.data} save={save} full/>
    </section>
    <section className="music-page-card" aria-labelledby="music-page-mix">
      <p className="music-eyebrow" id="music-page-mix">Your mix</p>
      <MixPlayer music={prefs.data} saveMusic={save} mix={mix}/>
    </section>
    <section className="music-page-card" aria-labelledby="music-page-links">
      <p className="music-eyebrow" id="music-page-links">In your music app</p>
      <PlaylistLinks/>
    </section>
    <section className="music-page-card" aria-labelledby="music-page-spotify">
      <p className="music-eyebrow" id="music-page-spotify">Spotify</p>
      <SpotifySource active/>
    </section>
    <section className="music-page-card" aria-labelledby="music-page-apple">
      <p className="music-eyebrow" id="music-page-apple">Apple Music</p>
      <AppleSource/>
    </section>
    {prefs.unreadable && <p className="fine">This device’s music choices could not be read, so the defaults show; a change saves new ones.</p>}
    {error && <p className="music-problem" role="alert">{error}</p>}
    <p className="music-footer">Made on this device: nothing is downloaded, recorded or tracked. A reload stops the sound.</p>
  </div>;
}
