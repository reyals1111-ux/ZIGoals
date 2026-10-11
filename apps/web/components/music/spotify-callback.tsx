'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {SPOTIFY_CALLBACK_PATH, readSpotifyCallback} from '../../lib/music/spotify/oauth';
import {exchangeCode} from '../../lib/music/spotify/tokens';
import {sealTokens} from '../../lib/links/token-store';
import {isShowcase} from '../../lib/showcase-storage';
import {spotifyClientId} from './music-config';
import {spotifyScope} from './use-spotify';

/**
 * Spotify's answer (Session W Part 20): read and checked against this tab's pending record, which is removed, and the
 * address cleaned of the code, before anything is awaited; then the code is exchanged and the tokens sealed under the
 * same scope the connection started in. A refusal, a stale or foreign answer, a locked account or the Showcase keep nothing.
 */
export function SpotifyCallback() {
  const [message, setMessage] = useState('Finishing the connection to Spotify…'), handled = useRef(false);
  useEffect(() => {
    if (handled.current) return; handled.current = true;
    const showcase = isShowcase(), scope = spotifyScope(), result = showcase || !scope ? null : readSpotifyCallback(window.location.search, scope);
    window.history.replaceState(window.history.state, '', SPOTIFY_CALLBACK_PATH);
    const say = (text: string) => queueMicrotask(() => setMessage(text));
    if (showcase) return say('The Showcase connects nothing, so nothing was kept.');
    if (!scope || !result) return say('Your account is locked, so nothing was kept. Unlock it and connect again.');
    if (result.kind === 'none') return say('There is nothing to finish here.');
    if (result.kind === 'refused') return say(result.message);
    if (result.kind === 'denied') return say('Spotify was not connected: it was declined there. Nothing was kept.');
    void (async () => {
      const clientId = await spotifyClientId();
      if (!clientId) { setMessage('Spotify is not set up on this site, so nothing was kept.'); return; }
      try {
        const tokens = await exchangeCode({clientId, origin: window.location.origin, code: result.code, verifier: result.verifier});
        if (spotifyScope() !== scope) { setMessage('Your account changed or locked while connecting, so nothing was kept.'); return; }
        await sealTokens(scope, 'spotify', tokens);
        setMessage('Spotify is connected.');
        window.location.replace(result.back);
      } catch (error) { setMessage(error instanceof Error && error.message ? error.message : 'Spotify was not connected. Nothing was kept.'); }
    })();
  }, []);
  return <div className="dashboard music-callback"><h1>Spotify</h1><p role="status">{message}</p><p><Link href="/app/settings#music">Settings → Music</Link></p></div>;
}
