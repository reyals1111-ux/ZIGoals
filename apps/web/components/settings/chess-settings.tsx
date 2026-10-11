'use client';
import Link from 'next/link';
import {useChess} from '../chess/use-chess';
import {ChessUsernames} from '../chess/chess-usernames';

/**
 * Settings → Chess (Session W Part 14): the usernames Chess follows, what is sent and kept, and a way to the page. The
 * Chess page itself shows once it is switched on under Your pages & buttons (hidden by default for existing people).
 */
export function ChessSettings() {
  const state = useChess(null);
  return <section className="panel chess-settings-card" id="chess" aria-label="Chess">
    <p className="eyebrow">CHESS</p><h2>Your chess</h2>
    <p>Ratings and recent games from chess.com and Lichess, read with your username only, one request at a time, from the Chess page, Today&apos;s chess card or Refresh. Your ratings over time stay on this device.</p>
    <ChessUsernames state={state} />
    <p className="fine"><Link href="/app/chess">Open Chess</Link> · Show or hide the page under Your pages &amp; buttons.</p>
  </section>;
}
