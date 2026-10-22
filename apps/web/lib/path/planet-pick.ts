import type {PathColour} from './colours';
import type {PlanetId} from './planet-designs';
import {stableHash} from './orbit-colours';

/**
 * Session AG Polish (ADR-030; owner Part 4): which of the owner's planets each orbit wears, from the colour of the orbit's
 * first node (the node the planet "spawns"): cyan → 05 (the glowing cyan sphere), blue → 06 (the double ring), magenta → 07
 * (the rubble ring and moon), purple → 09 (the crossing neon orbits), teal → 04, 08 and 10 in turn, so two teal orbits in a
 * day never share a design. Pink (where a stored gold shows, J4) takes 07, or 09 when 07 is already taken that day.
 * Deterministic: the same orbits with the same first colours in the same order always give the same planets; the teal
 * rotation starts from a place seeded by the path's id.
 */
const TEALS: readonly PlanetId[] = ['04', '08', '10'];
const BY_HUE: Partial<Record<PathColour, PlanetId>> = {cyan: '05', blue: '06', magenta: '07', purple: '09'};

export function planetDesigns(firstColours: readonly (PathColour | null)[], seed: string): (PlanetId | null)[] {
  let teal = stableHash(`${seed}|teal`) % TEALS.length;
  const used = new Set<PlanetId>();
  return firstColours.map(colour => {
    if (!colour) return null;
    let id: PlanetId;
    if (colour === 'teal') { id = TEALS[teal % TEALS.length]!; teal++; }
    else if (colour === 'pink' || colour === 'gold') id = used.has('07') ? '09' : '07';
    else id = BY_HUE[colour] ?? '05';
    used.add(id);
    return id;
  });
}
