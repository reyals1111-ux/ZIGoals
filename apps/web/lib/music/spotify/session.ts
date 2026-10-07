import {forgetTokens, readTokens, sealTokens} from '../../links/token-store';
import {refreshTokens, SpotifyReconnect, tokensFresh} from './tokens';

/**
 * Spotify's tokens for one scope (the open account's id, or "local"), sealed in this browser's link-token store and
 * never anywhere else. A token that has run out is refreshed under one cross-tab lock, so two tabs never spend the same
 * refresh token; a rotated refresh token replaces the old one; "connect again" removes what was kept.
 */
export function spotifySession({clientId, scope}: {clientId: string; scope: string}) {
  const locked = <T,>(work: () => Promise<T>): Promise<T> => typeof navigator !== 'undefined' && navigator.locks ? navigator.locks.request('zigoals-spotify-refresh', work) as Promise<T> : work();
  async function refresh(): Promise<string> {
    return locked(async () => {
      const tokens = await readTokens(scope, 'spotify');
      if (!tokens) throw new SpotifyReconnect();
      try { const next = await refreshTokens({clientId, tokens}); await sealTokens(scope, 'spotify', next); return next.accessToken; }
      catch (error) { if (error instanceof SpotifyReconnect) await forgetTokens(scope, 'spotify').catch(() => undefined); throw error; }
    });
  }
  async function token(): Promise<string> {
    const tokens = await readTokens(scope, 'spotify');
    if (!tokens) throw new SpotifyReconnect();
    return tokensFresh(tokens) ? tokens.accessToken : refresh();
  }
  return {token, refresh, connected: async () => !!(await readTokens(scope, 'spotify')), disconnect: () => forgetTokens(scope, 'spotify')};
}
