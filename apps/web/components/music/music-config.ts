'use client';
import {useEffect, useState} from 'react';
import * as z from 'zod';
import {validClientId} from '../../lib/music/spotify/oauth';
import {BYO_CHANGE_EVENT, readByoSpotify} from '../../lib/music/spotify/byo-store';
import {isShowcase} from '../../lib/showcase-storage';

const schema = z.object({version: z.literal(1), spotify: z.object({clientId: z.string().nullable()})});
let pending: Promise<string | null> | null = null;
/** The deployment's Spotify client id, asked once per page load; null when Spotify is not set up (or in the Showcase, which connects nothing). */
export function siteSpotifyClientId(): Promise<string | null> {
  if (isShowcase()) return Promise.resolve(null);
  pending ??= fetch('/api/music-config', {credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000)})
    .then(async response => { if (!response.ok) return null; const id = schema.parse(await response.json()).spotify.clientId; return validClientId(id) ? id : null; })
    .catch(() => { pending = null; return null; });
  return pending;
}
/**
 * The Spotify client id this device connects with, and whose it is. Session AK (owner decision MUSIC): the person's own
 * id (lib/music/spotify/byo-store.ts, this device only) wins over the site's, even once the site has one; the site is
 * then not asked at all. The Showcase connects nothing, so it has neither.
 */
export async function spotifyClientConfig(): Promise<{clientId: string | null; own: boolean}> {
  if (isShowcase()) return {clientId: null, own: false};
  const own = await readByoSpotify();
  if (own) return {clientId: own, own: true};
  return {clientId: await siteSpotifyClientId(), own: false};
}
/** The client id this device connects with (the person's own first, then the site's); null when there is none. */
export const spotifyClientId = (): Promise<string | null> => spotifyClientConfig().then(c => c.clientId);
export function useSpotifyClientId(): {loaded: boolean; clientId: string | null; own: boolean} {
  const [state, setState] = useState<{loaded: boolean; clientId: string | null; own: boolean}>({loaded: false, clientId: null, own: false});
  useEffect(() => {
    let active = true;
    const read = () => void spotifyClientConfig().then(c => { if (active) setState({loaded: true, ...c}); });
    read();
    window.addEventListener(BYO_CHANGE_EVENT, read);
    return () => { active = false; window.removeEventListener(BYO_CHANGE_EVENT, read); };
  }, []);
  return state;
}
