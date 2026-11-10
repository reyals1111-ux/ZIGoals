/**
 * Session AL (Part 15, P-BN-84 / P-BN-85; C-BN-19, C-BN-20): the current run of results and the openings played, from
 * the games the sites listed (newest first, as the Chess page keeps them). Information about past games only; pure.
 */
type Game = {result: 'win' | 'draw' | 'loss'; endedAt: string; opening?: string | null};
export type Streak = {result: Game['result']; count: number};
const newestFirst = <G extends Game>(games: readonly G[]) => [...games].sort((a, b) => b.endedAt.localeCompare(a.endedAt));
/** The run the newest game belongs to: 3 wins in a row, 2 losses in a row… null without games. */
export function currentStreak(games: readonly Game[]): Streak | null {
  const list = newestFirst(games), first = list[0];
  if (!first) return null;
  let count = 0;
  for (const g of list) { if (g.result !== first.result) break; count++; }
  return {result: first.result, count};
}
/** The longest run of wins among these games. */
export function longestWinStreak(games: readonly Game[]): number {
  let best = 0, run = 0;
  for (const g of newestFirst(games).reverse()) { run = g.result === 'win' ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}
export const streakText = (s: Streak) => `${s.count} ${s.result === 'win' ? (s.count === 1 ? 'win' : 'wins') : s.result === 'loss' ? (s.count === 1 ? 'loss' : 'losses') : (s.count === 1 ? 'draw' : 'draws')}${s.count > 1 ? ' in a row' : ''}`;
/** Openings by how often they were played, each with its own won/drawn/lost; at most `limit`. Games without one are left out. */
export function openingStats(games: readonly Game[], limit = 5): {opening: string; games: number; win: number; draw: number; loss: number}[] {
  const by = new Map<string, {opening: string; games: number; win: number; draw: number; loss: number}>();
  for (const g of games) {
    const name = g.opening?.trim();
    if (!name) continue;
    const row = by.get(name) ?? {opening: name, games: 0, win: 0, draw: 0, loss: 0};
    row.games++; row[g.result]++; by.set(name, row);
  }
  return [...by.values()].sort((a, b) => b.games - a.games || a.opening.localeCompare(b.opening)).slice(0, limit);
}
