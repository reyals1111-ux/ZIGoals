import {formatNumber} from '../../lib/visual-format';
import type {Planet} from '../../lib/universe/model';

/** A planet in words (Session AF, L5b): its counts, and the name a screen reader hears for it. Counts only. */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export const planetSummary = (p: Planet) => [plural(p.rings, 'ring'), plural(p.moons, 'moon'), ...(p.faintRings ? [plural(p.faintRings, 'faint ring')] : [])].join(' · ');
export function planetLabel(p: Planet): string {
  return `${p.label}: ${planetSummary(p)}${p.lit ? ', lit today' : p.light === null ? '' : ', not lit yet today'}`;
}
