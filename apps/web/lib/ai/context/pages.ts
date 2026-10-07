import type {PageArea} from '../settings';

/**
 * Which specialist a page gets (ADR-012). Wealth covers Portfolio, Staking and Markets; Activity and the welcome use
 * Today's overview; Help, Settings and Ecosystem use the Help specialist (how ZIGoals works). Settings attaches no
 * records at all, whatever the switches say: it holds the account, sync and recovery controls.
 */
export function pageArea(pathname: string): PageArea {
  const path = pathname.replace(/\/+$/, '') || '/';
  // Session W Part 14: Chess, a skill, gets Today's overview; its tools (chess_ratings, chess_games, Part 21) are Today's.
  // The Spotify sign-in page (/app/music/spotify, Part 20) stays Help's: a callback attaches nothing.
  if (path === '/app' || path === '/app/activity' || path === '/app/welcome' || path === '/app/chess') return 'today';
  if (path === '/app/goals' || path.startsWith('/app/goals/')) return 'goals';
  if (path === '/app/habits' || path.startsWith('/app/habits/')) return 'habits';
  if (path === '/app/health' || path.startsWith('/app/health/')) return 'health';
  if (/^\/app\/(wealth|portfolio|staking|markets)(\/|$)/.test(path)) return 'wealth';
  return 'help';
}
export const AREA_LABELS: Record<PageArea, string> = {today: 'Today', goals: 'Goals', habits: 'Habits', health: 'Health', wealth: 'Wealth', help: 'Help'};
/** Paths whose records are never attached: the person's account, sync and recovery controls live there. */
export function attachesContext(pathname: string): boolean { return !/^\/app\/settings(\/|$)/.test(pathname.replace(/\/+$/, '')); }
/** The sub-page of Wealth the person is on, for the specialist's framing. */
export function wealthView(pathname: string): 'wealth' | 'portfolio' | 'staking' | 'markets' {
  const match = /^\/app\/(portfolio|staking|markets)(\/|$)/.exec(pathname);
  return (match?.[1] as 'portfolio' | 'staking' | 'markets' | undefined) ?? 'wealth';
}
