import type {ChessCache, ChessGoal, ChessSettings} from '../skills/chess/schema';
import {CONTROL_NAME, SITE_NAME, goalProgress} from '../skills/chess/engine';
import {formatDate, formatNumber} from '../visual-format';

/**
 * Session AL sweep 4 (C-BN-23): the chess rating goals (settings v3 `chess.goals`) as read-only lines on the Goals page,
 * filtered like the page's own goals. Nothing new is stored; Chess keeps adding and removing them. Pure.
 */
export type ChessGoalFilter = 'Active' | 'Completed' | 'Closed' | 'All';
const STATUS: Readonly<Record<Exclude<ChessGoalFilter, 'All'>, ChessGoal['status']>> = {Active: 'active', Completed: 'done', Closed: 'closed'};
export type ChessGoalLine = {id: string; title: string; detail: string};

export function chessGoalLines(chess: ChessSettings | undefined, cache: ChessCache | null, filter: ChessGoalFilter, today: string): ChessGoalLine[] {
  if (!chess) return [];
  return chess.goals.filter(g => filter === 'All' || g.status === STATUS[filter]).map(g => {
    const p = cache ? goalProgress(cache, g) : {rating: null, left: null, reached: false};
    const now = p.rating === null ? 'No rating read yet on this site and time control' : p.reached ? `Reached: ${formatNumber(p.rating)} now` : `${formatNumber(p.rating)} now · ${formatNumber(p.left ?? 0)} to go`;
    const by = g.by ? ` · by ${formatDate(g.by)}${g.by < today && !p.reached ? ' (its date has passed)' : ''}` : '';
    return {id: g.id, title: `${SITE_NAME[g.site]} ${CONTROL_NAME[g.control]}: reach ${formatNumber(g.target)}`, detail: `${now}${by}`};
  });
}
