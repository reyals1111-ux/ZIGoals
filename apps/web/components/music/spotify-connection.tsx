'use client';
import {useSpotify} from './use-spotify';

/** Settings → Music's Spotify line and its Connect / Disconnect (components/music/music-settings.tsx), its own chunk. */
export default function SpotifyConnection({clientId, onDisconnected}: {clientId: string; onDisconnected: () => void}) {
  const spotify = useSpotify({clientId, active: false});
  const state = !spotify.scope ? 'Unlock your account to connect Spotify.' : spotify.connected ? 'Connected on this device.' : spotify.connected === false ? 'Not connected.' : 'Checking…';
  return <>
    <p className="music-settings-state">{state}</p>
    {spotify.scope && spotify.connected === false && <button type="button" className="secondary" onClick={() => void spotify.connect()}>Connect Spotify</button>}
    {spotify.connected && <button type="button" className="secondary" onClick={() => void spotify.disconnect().then(onDisconnected)}>Disconnect Spotify</button>}
  </>;
}
