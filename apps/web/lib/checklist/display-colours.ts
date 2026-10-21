import {visualTone} from '../../components/visual-tone';
import {orbitColourMap} from '../path/orbit-colours';
import type {PathColour} from '../path/colours';
import type {DerivedDot} from './derive';
import {sectionsOf} from './store';
import type {Checklist} from './schema';

/**
 * Session AG (ADR-029 I3): the colour each of today's items wears on the path, the List, Today's card and the Day
 * timeline — in path order (the person's orbits, then their order inside each), so no two neighbours on the path share
 * one. A starred habit takes its habit card's tone; every other item its own colour. Presentation only.
 */
export function checklistDisplayColours(record: Checklist, dots: readonly Pick<DerivedDot, 'id' | 'kind' | 'section' | 'colour' | 'item'>[]): Map<string, PathColour> {
  const order = sectionsOf(record).map(s => s.id), rank = (id: string) => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
  const ordered = dots.map((d, i) => ({d, i})).sort((a, b) => rank(a.d.section) - rank(b.d.section) || a.i - b.i).map(x => x.d);
  return orbitColourMap(ordered.map(d => {
    const habitId = d.kind === 'habit' ? (d.item as {ref?: {habitId?: string}} | undefined)?.ref?.habitId : undefined;
    return habitId ? {id: d.id, tone: visualTone(habitId)} : {id: d.id, colour: d.colour};
  }));
}
