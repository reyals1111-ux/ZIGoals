'use client';
import './goals.css';
import Link from 'next/link';
import {usePrivateStore} from '../use-private-store';
import {useDeviceRecord} from '../ai/use-device-record';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings} from '../../lib/dashboard-settings';
import {CHESS_CACHE} from '../../lib/skills/chess/schema';
import {chessOf} from '../../lib/skills/chess/engine';
import {chessGoalLines, type ChessGoalFilter} from '../../lib/goals/chess-goals';
import {localDate} from '../../lib/local-date';

/**
 * Session AL sweep 4 (C-BN-23): the rating goals set on Chess, listed with the Goals page's own goals as read-only cards.
 * Each opens Chess, where they are added and removed; the Goals record is not touched. Nothing shows without one.
 */
export function ChessRatingGoals({filter}: {filter: ChessGoalFilter}) {
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), cache = useDeviceRecord(CHESS_CACHE);
  if (!settings.loaded || settings.error || !cache.loaded) return null;
  const lines = chessGoalLines(chessOf(settings.data), cache.unreadable ? null : cache.data, filter, localDate());
  if (!lines.length) return null;
  return <section className="panel chess-rating-goals" aria-labelledby="chess-rating-goals-title">
    <p className="eyebrow">From Chess</p><h2 id="chess-rating-goals-title">Chess rating goals</h2>
    <ul className="chess-rating-goal-list">{lines.map(l => <li key={l.id}><Link className="chess-rating-goal" href="/app/chess"><strong>{l.title}</strong><span>{l.detail}</span><span className="text-link" aria-hidden="true">Open Chess →</span></Link></li>)}</ul>
    <p className="fine">Set and removed on Chess; your public ratings are read from the site you play on.</p>
  </section>;
}
export default ChessRatingGoals;
