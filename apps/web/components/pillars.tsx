import type {ReactNode} from 'react';
import {BullGlyph, ButterflyGlyph, HeartGlyph, LotusGlyph} from './footer/pillar-glyphs';
import './pillars.css';

/**
 * Session AB-Design (owner request 28): the four pillars' identity in one place — an accent colour token and a fold-mark
 * glyph each — for headers, chips, search results, charts and insights. Goals = lotus, Habits = butterfly, Health =
 * heart, Wealth = bull. Colours are the tokens in app/visual-v21.css (`--pillar-*`).
 */
import type {Pillar} from '../lib/pillar-route';
export type {Pillar} from '../lib/pillar-route';
export {pillarOf, pillarOfHref} from '../lib/pillar-route';
export const PILLARS: Record<Pillar, {label: string; color: string; glyph: (size?: number) => ReactNode}> = {
  goals: {label: 'Goals', color: 'var(--pillar-goals)', glyph: (size = 18) => <LotusGlyph size={size}/>},
  habits: {label: 'Habits', color: 'var(--pillar-habits)', glyph: (size = 18) => <ButterflyGlyph size={size}/>},
  health: {label: 'Health', color: 'var(--pillar-health)', glyph: (size = 18) => <HeartGlyph size={size}/>},
  wealth: {label: 'Wealth', color: 'var(--pillar-wealth)', glyph: (size = 18) => <BullGlyph size={size}/>},
};
/** A small pillar chip: the glyph disc in the pillar's colour, with or without its word. */
export function PillarMark({pillar, size = 18, word = false, className = ''}: {pillar: Pillar; size?: number; word?: boolean; className?: string}) {
  const p = PILLARS[pillar];
  return <span className={`pillar-mark ${className}`.trim()} data-pillar={pillar} aria-hidden={word ? undefined : 'true'}><span className="pillar-mark-disc">{p.glyph(size)}</span>{word && <span className="pillar-mark-word">{p.label}</span>}</span>;
}
