'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {getAccountScope, isAccountLocked} from '../../lib/account-session';
import {beginSpotify} from '../../lib/music/spotify/oauth';
import {SpotifyReconnect} from '../../lib/music/spotify/tokens';
import {SpotifyError, createSpotifyPlayer, type Playback, type SpotifyDevice, type SpotifyPlayer} from '../../lib/music/spotify/player';
import {spotifySession} from '../../lib/music/spotify/session';

/** Where Spotify's tokens are sealed: the open account, or "local" without one; null while an account is locked (nothing is kept then). */
export function spotifyScope(): string | null { try { const scope = getAccountScope(); return scope ? (isAccountLocked() ? null : scope) : 'local'; } catch { return null; } }

/**
 * Spotify in the music panel (Session W Part 20): whether it is connected, what plays and on which device, and the
 * controls. The playback state is asked only while the panel is open and the page visible (every 10 s, and after each
 * control); nothing is asked in the background and nothing about the music is kept.
 */
export function useSpotify({clientId, active}: {clientId: string | null; active: boolean}) {
  const scope = spotifyScope(), session = useMemo(() => clientId && scope ? spotifySession({clientId, scope}) : null, [clientId, scope]);
  const player = useMemo<SpotifyPlayer | null>(() => session ? createSpotifyPlayer({token: session.token, refresh: session.refresh}) : null, [session]);
  const [connected, setConnected] = useState<boolean | null>(null), [playback, setPlayback] = useState<Playback | null>(null), [devices, setDevices] = useState<SpotifyDevice[] | null>(null);
  const [problem, setProblem] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { let alive = true; if (!session) { queueMicrotask(() => { if (alive) setConnected(false); }); return () => { alive = false; }; } void session.connected().then(c => { if (alive) setConnected(c); }, () => { if (alive) setConnected(false); }); return () => { alive = false; }; }, [session]);
  const handle = useCallback((error: unknown) => {
    if (error instanceof SpotifyReconnect) { setConnected(false); setPlayback(null); setProblem(error.message); }
    else setProblem(error instanceof SpotifyError || (error instanceof Error && error.message) ? (error as Error).message : 'Spotify is not answering right now.');
  }, []);
  const read = useCallback(async () => { if (!player) return; try { setPlayback(await player.playback()); setProblem(''); } catch (error) { handle(error); } }, [player, handle]);
  useEffect(() => {
    if (!active || !connected || !player) return;
    const first = setTimeout(() => void read(), 0), timer = setInterval(() => { if (document.visibilityState === 'visible') void read(); }, 10_000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, [active, connected, player, read]);
  // Spotify applies a command a moment after answering it, so the state is read again shortly after, not at once.
  async function act(work: (p: SpotifyPlayer) => Promise<unknown>) {
    if (!player || busy) return;
    setBusy(true);
    let done = false;
    try { await work(player); done = true; } catch (error) { handle(error); } finally { setBusy(false); }
    if (done) { setProblem(''); window.setTimeout(() => void read(), 700); }
  }
  return {
    available: !!clientId, scope, connected, playback, devices, problem, busy, act,
    loadDevices: () => act(async p => setDevices(await p.devices())),
    connect: async () => { if (!clientId || !scope) return; window.location.assign(await beginSpotify({clientId, origin: window.location.origin, scope, back: window.location.pathname + window.location.search})); },
    disconnect: async () => { await session?.disconnect(); setConnected(false); setPlayback(null); setDevices(null); setProblem(''); },
  };
}
