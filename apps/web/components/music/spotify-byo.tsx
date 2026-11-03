'use client';
import {useEffect, useId, useState} from 'react';
import {forgetTokens} from '../../lib/links/token-store';
import {redirectUri} from '../../lib/music/spotify/oauth';
import {BYO_CHANGE_EVENT, forgetByoSpotify, readByoSpotify, saveByoSpotify, tidyClientId, validByoClientId} from '../../lib/music/spotify/byo-store';
import {spotifyScope} from './use-spotify';
import './music-mix.css';

/** A sign-in made with another app's id cannot be refreshed with this one, so a change of id disconnects this device. */
async function disconnectHere() { const scope = spotifyScope(); if (scope) await forgetTokens(scope, 'spotify').catch(() => undefined); }
/**
 * "Use my own Spotify app" (Session AK, owner decision MUSIC; advanced): the person registers their own app in Spotify's
 * developer dashboard and enters its Client ID here. It stays on this device (IndexedDB `zigoals-music-byo-v1`): never
 * synced, exported or sent to ZIGoals; on this device it wins over the site's id, even once the site has one. The
 * connection is the existing PKCE one, back to <this origin>/app/music/spotify. The Showcase never shows this.
 */
export default function SpotifyByo() {
  const id = useId(), [saved, setSaved] = useState<string | null | undefined>(undefined), [input, setInput] = useState(''), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const [origin, setOrigin] = useState(''), [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    const read = () => void readByoSpotify().then(v => { if (active) setSaved(v); });
    queueMicrotask(() => { if (active) setOrigin(window.location.origin); });
    read(); window.addEventListener(BYO_CHANGE_EVENT, read);
    return () => { active = false; window.removeEventListener(BYO_CHANGE_EVENT, read); };
  }, []);
  const redirect = origin ? redirectUri(origin) : '';
  const tidy = tidyClientId(input), typed = tidy.length, looksRight = validByoClientId(tidy);
  async function save() {
    setMessage(null);
    try {
      const clientId = await saveByoSpotify(input);
      if (clientId !== saved) await disconnectHere();
      setInput(''); setMessage({text: 'Saved on this device. Choose Connect Spotify above to sign in through your own app.'});
    } catch (error) { setMessage({text: error instanceof Error ? error.message : 'Not saved.', failed: true}); }
  }
  async function remove() {
    setMessage(null);
    try { await forgetByoSpotify(); await disconnectHere(); setMessage({text: 'Your client id is removed from this device, and Spotify is disconnected here.'}); }
    catch { setMessage({text: 'This device’s storage did not remove it. Try again.', failed: true}); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(redirect); setCopied(true); setMessage({text: 'Redirect URI copied.'}); } catch { setMessage({text: 'Copying was refused here: select the address and copy it yourself.', failed: true}); }
  }
  return <div className="music-byo">
    <p className="music-mix-hint">If this site has no Spotify app yet, or you’d rather use your own, register a free app with Spotify and enter its Client ID. It stays on this device only: never synced, exported or sent to ZIGoals.</p>
    {saved === undefined ? <p className="music-mix-hint">Checking this device…</p>
      : saved ? <p className="music-mix-hint"><strong>Your own client id is in use on this device</strong> (ending …{saved.slice(-4)}). If this site gets its own Spotify app later, yours still wins on this device.</p> : null}
    <details className="music-more">
      <summary>How to make your own Spotify app (7 steps)</summary>
      <ol>
        <li>Open <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer">developer.spotify.com/dashboard<span className="sr-only"> (opens in a new tab)</span></a> and sign in with your Spotify account.</li>
        <li>Choose <strong>Create app</strong>; any name and description will do.</li>
        <li>Under Redirect URIs, add exactly <code>{redirect || '…'}</code>
          <span className="music-byo-copy"><button type="button" className="secondary" disabled={!redirect} onClick={() => void copy()}>{copied ? 'Copied' : 'Copy the Redirect URI'}</button></span></li>
        <li>Under “Which API/SDKs are you planning to use?”, select <strong>Web API</strong> and <strong>Web Playback SDK</strong>, then save.</li>
        <li>Open the app’s settings, copy its <strong>Client ID</strong> and paste it below. (Never the Client secret: ZIGoals doesn’t need it.)</li>
        <li>New apps are in development mode: up to 25 Spotify accounts you add yourself under User Management can connect.</li>
        <li>Controlling playback needs Spotify Premium.</li>
      </ol>
    </details>
    <label className="field" htmlFor={`${id}-client`}>Your Spotify Client ID</label>
    <input id={`${id}-client`} type="text" inputMode="text" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64} placeholder="32 letters a–f and digits" value={input} aria-describedby={`${id}-rule`} aria-invalid={input !== '' && !looksRight} onChange={e => setInput(e.target.value)}/>
    <p className="music-mix-hint" id={`${id}-rule`}>{input === '' ? 'A Client ID is 32 characters, letters a–f and digits.' : looksRight ? 'That looks like a Client ID.' : `${typed} of 32 characters, letters a–f and digits only.`}</p>
    <div className="actions">
      <button type="button" className="primary" disabled={!looksRight} onClick={() => void save()}>Save my client id</button>
      {saved && <button type="button" className="secondary" onClick={() => void remove()}>Remove my client id</button>}
    </div>
    <p className={message?.failed ? 'music-problem' : 'music-mix-note'} aria-live="polite">{message?.text ?? ''}</p>
  </div>;
}
