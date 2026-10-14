import type {ReactNode} from 'react';
import {BullGlyph, ButterflyGlyph, HeartGlyph, LotusGlyph} from './footer/pillar-glyphs';
import './pillars.css';

/**
 * Session AB-Design (owner request 28): the four pillars' identity in one place — an accent colour token and a fold-mark
 * glyph each — for headers, chips, search results, charts and insights. Goals = lotus, Habits = butterfly, Health =
 * heart, Wealth = bull. Colours are the tokens in app/visual-v21.css (`--pillar-*`).
 */
export type Pillar = 'goals' | 'habits' | 'health' | 'wealth';
export const PILLARS: Record<Pillar, {label: string; color: string; glyph: (size?: number) => ReactNode}> = {
  goals: {label: 'Goals', color: 'var(--pillar-goals)', glyph: (size = 18) => <LotusGlyph size={size}/>},
  habits: {label: 'Habits', color: 'var(--pillar-habits)', glyph: (size = 18) => <ButterflyGlyph size={size}/>},
  health: {label: 'Health', color: 'var(--pillar-health)', glyph: (size = 18) => <HeartGlyph size={size}/>},
  wealth: {label: 'Wealth', color: 'var(--pillar-wealth)', glyph: (size = 18) => <BullGlyph size={size}/>},
};
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
/** A small pillar chip: the glyph disc in the pillar's colour, with or without its word. */
export function PillarMark({pillar, size = 18, word = false, className = ''}: {pillar: Pillar; size?: number; word?: boolean; className?: string}) {
  const p = PILLARS[pillar];
  return <span className={`pillar-mark ${className}`.trim()} data-pillar={pillar} aria-hidden={word ? undefined : 'true'}><span className="pillar-mark-disc">{p.glyph(size)}</span>{word && <span className="pillar-mark-word">{p.label}</span>}</span>;
}
