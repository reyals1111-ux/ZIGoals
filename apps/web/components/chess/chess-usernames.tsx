'use client';
import {useState, type FormEvent} from 'react';
import {CHESSCOM_USERNAME, LICHESS_USERNAME, type ChessSite} from '../../lib/skills/chess/schema';
import {forgetSite, setUsername, SITE_NAME} from '../../lib/skills/chess/engine';
import type {useChess} from './use-chess';

/**
 * The usernames Chess follows (Session W Part 14), in Settings → Chess and on an empty Chess page. Only a username is
 * kept (settings v3 `chess`) and only it is ever sent, to the site it belongs to; removing one forgets what that site said.
 */
export function ChessUsernames({state, onSaved}: {state: ReturnType<typeof useChess>; onSaved?: () => void}) {
  const {settings, cache, chess, showcase} = state, [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget), names = {chesscom: String(f.get('chesscom') ?? '').trim(), lichess: String(f.get('lichess') ?? '').trim()};
    if (names.chesscom && !CHESSCOM_USERNAME.test(names.chesscom)) { setMessage({text: 'A chess.com username has 3 to 25 letters, digits, "_" or "-".', failed: true}); return; }
    if (names.lichess && !LICHESS_USERNAME.test(names.lichess)) { setMessage({text: 'A Lichess username has 2 to 30 letters, digits, "_" or "-".', failed: true}); return; }
    try {
      const at = new Date().toISOString(), changed: ChessSite[] = (['chesscom', 'lichess'] as const).filter(site => (chess?.[site]?.username ?? '').toLowerCase() !== names[site].toLowerCase());
      if (changed.length) await settings.update(s => changed.reduce((next, site) => setUsername(next, site, names[site] || null, at), s));
      if (changed.length && cache.loaded && !cache.unreadable) cache.update(c => changed.reduce((next, site) => forgetSite(next, site), c));
      setMessage({text: changed.length ? 'Saved. Only these usernames are sent, each to its own site.' : 'Nothing changed.'});
      if (changed.length) onSaved?.();
    } catch (error) { setMessage({text: error instanceof Error && error.message ? error.message : 'Could not save.', failed: true}); }
  }
  if (!settings.loaded || settings.error) return null;
  return <form className="platform-form chess-usernames" aria-label="Your chess usernames" key={`${chess?.chesscom?.username ?? ''}:${chess?.lichess?.username ?? ''}`} onSubmit={e => void save(e)}>
    {(['chesscom', 'lichess'] as const).map(site => <label key={site} className="field">{SITE_NAME[site]} username (optional)<input name={site} defaultValue={chess?.[site]?.username ?? ''} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={showcase} /></label>)}
    <button className="secondary" type="submit" disabled={showcase}>Save usernames</button>
    <p className="fine">{showcase ? 'The Showcase shows fictional ratings and asks no site.' : 'Your ratings and games are public on these sites; ZIGoals reads them with the username only, from this device.'}</p>
    {message && <p role={message.failed ? 'alert' : 'status'}>{message.text}</p>}
  </form>;
}
