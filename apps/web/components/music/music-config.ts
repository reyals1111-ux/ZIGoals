'use client';
import {useEffect, useState} from 'react';
import {z} from 'zod';
import {validClientId} from '../../lib/music/spotify/oauth';
import {isShowcase} from '../../lib/showcase-storage';

const schema = z.object({version: z.literal(1), spotify: z.object({clientId: z.string().nullable()})});
let pending: Promise<string | null> | null = null;
/** The deployment's Spotify client id, asked once per page load; null when Spotify is not set up (or in the Showcase, which connects nothing). */
export function spotifyClientId(): Promise<string | null> {
  if (isShowcase()) return Promise.resolve(null);
  pending ??= fetch('/api/music-config', {credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(10000)})
    .then(async response => { if (!response.ok) return null; const id = schema.parse(await response.json()).spotify.clientId; return validClientId(id) ? id : null; })
    .catch(() => { pending = null; return null; });
  return pending;
}
export function useSpotifyClientId(): {loaded: boolean; clientId: string | null} {
  const [state, setState] = useState<{loaded: boolean; clientId: string | null}>({loaded: false, clientId: null});
  useEffect(() => { let active = true; void spotifyClientId().then(clientId => { if (active) setState({loaded: true, clientId}); }); return () => { active = false; }; }, []);
  return state;
}
