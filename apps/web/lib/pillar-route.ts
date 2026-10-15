/**
 * Session AB-Design (owner request 28): which of the four pillars a page or a record kind belongs to. No imports, so the
 * shell can mark <main> with its page's pillar without carrying the pillar glyphs (components/pillars.tsx).
 */
export type Pillar = 'goals' | 'habits' | 'health' | 'wealth';
/** The pillar a page or record kind belongs to (null for the shell pages). */
export function pillarOf(kind: string): Pillar | null {
  if (/^(goal|goals|template|average)/.test(kind)) return 'goals';
  if (/^(habit|habits|routine)/.test(kind)) return 'habits';
  if (/^(health|food|recipe|meal|water|sleep|weight)/.test(kind)) return 'health';
  if (/^(wealth|asset|portfolio|markets|staking|position|account)/.test(kind)) return 'wealth';
  return null;
}
/** The pillar of an app path (`/app/goals/...` → goals; Wealth covers Markets, Portfolio and Staking). */
export function pillarOfHref(href: string): Pillar | null {
  const m = /^\/app\/([a-z-]+)/.exec(href); if (!m) return null;
  const seg = m[1]!;
  if (seg === 'goals') return 'goals'; if (seg === 'habits') return 'habits'; if (seg === 'health') return 'health';
  if (['wealth', 'markets', 'portfolio', 'staking', 'positions', 'calculator'].includes(seg)) return 'wealth';
  return null;
}
