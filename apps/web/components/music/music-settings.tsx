'use client';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {usePagesView} from '../pages/use-pages-view';
import {useShowcase} from '../showcase-controls';
import {APPLE_MUSIC_HOME, SPOTIFY_HOME} from '../../lib/music/brand';
import {MUSIC} from '../../lib/music/schema';
import {isShown, withChoice} from '../../lib/pages/visibility';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {updateSettingsGroup} from '../../lib/w-homes-store';
import {useSpotifyClientId} from './music-config';
import {openMusicPlayer} from './music-events';
import {useSpotify} from './use-spotify';

/**
 * Settings → Music (Session W Part 20): whether the player shows (the same switch as Your pages & buttons), the mini-bar,
 * and each source's honest state: Spotify (not set up on this site · connect · connected, with Disconnect), Apple Music
 * (a link), focus sounds (always). Spotify's sign-in is sealed on this device; nothing here is synced or exported.
 */
export function MusicSettings() {
  const shown = isShown(usePagesView(), 'music'), showcase = useShowcase(), prefs = useDeviceRecord(MUSIC), config = useSpotifyClientId();
  const spotify = useSpotify({clientId: config.clientId, active: false}), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const showPlayer = () => updateSettingsGroup('pages', pages => withChoice(pages, 'music', true, new Date().toISOString()))
    .then(() => setMessage({text: 'The music player shows again.'}), (error: unknown) => setMessage({text: error instanceof Error ? error.message : 'Could not save.', failed: true}));
  const mini = (on: boolean) => { try { prefs.update(m => ({...m, mini: on})); setMessage({text: on ? 'The mini-bar takes the music button’s place on this device.' : 'The round music button is back on this device.'}); } catch (error) { setMessage({text: `Not saved on this device. ${deviceSettingFailureMessage(error)}`, failed: true}); } };
  const spotifyState = showcase ? 'The Showcase connects nothing.' : !config.loaded ? 'Checking…' : !config.clientId ? 'Not set up on this site yet: its owner needs to register a Spotify app first.' : !spotify.scope ? 'Unlock your account to connect Spotify.' : spotify.connected ? 'Connected on this device.' : spotify.connected === false ? 'Not connected.' : 'Checking…';
  return <section className="panel music-settings" id="music" aria-labelledby="music-settings-title">
    <p className="eyebrow">MUSIC</p><h2 id="music-settings-title">Your soundtrack.</h2>
    <p>Focus sounds made on this device, or what Spotify plays, from one small player at the side opposite ZIGi.</p>
    {shown ? <div className="actions"><button type="button" className="secondary" onClick={openMusicPlayer}>Open the player</button></div>
      : <p>The music player is hidden. <button type="button" className="text-link" onClick={() => void showPlayer()}>Show the music player</button></p>}
    {prefs.loaded && <label className="checkbox"><input type="checkbox" checked={prefs.data.mini} onChange={e => mini(e.currentTarget.checked)}/><span>Show a mini-bar instead of the round button (this device)</span></label>}
    <h3>Spotify</h3>
    <p className="music-settings-state">{spotifyState}</p>
    {!showcase && config.clientId && spotify.scope && spotify.connected === false && <button type="button" className="secondary" onClick={() => void spotify.connect()}>Connect Spotify</button>}
    {!showcase && spotify.connected && <button type="button" className="secondary" onClick={() => void spotify.disconnect().then(() => setMessage({text: 'Spotify is disconnected on this device. To remove ZIGoals from your Spotify account too, use Spotify’s account page → Manage apps.'}))}>Disconnect Spotify</button>}
    <p className="fine">Controlling playback needs Spotify Premium. While ZIGoals is in Spotify’s development mode, only up to five accounts its owner listed can connect. The sign-in is sealed on this device: never synced, exported or put in an address. <a href={SPOTIFY_HOME} target="_blank" rel="noopener noreferrer">Open Spotify ↗</a></p>
    <h3>Apple Music</h3>
    <p className="fine">Playing Apple Music inside ZIGoals needs an Apple Developer membership and a signed key, which this site doesn’t have. <a href={APPLE_MUSIC_HOME} target="_blank" rel="noopener noreferrer">Open Apple Music ↗</a></p>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </section>;
}
