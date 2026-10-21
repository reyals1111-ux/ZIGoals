import {PATH_COLOURS, type PathColour} from './colours';

/**
 * Session AG (ADR-029 I3; owner pointer 1): the colour each node wears on the orbit path. Presentation only: a stored
 * colour is never rewritten. Pure, no React and no DOM, so the path, the List, Today's card and the Day timeline agree.
 *
 * - A starred habit wears its habit card's tone (components/visual-tone.ts rotates the cards through five colours).
 * - Anything else wears its own colour (the one chosen for it, or its page's), else a stable pick from the palette by id.
 * - Then one pass along the path makes every node differ from the one before it and, where it can, the one after it, so
 *   the path never shows two neighbours in one colour (today every habit is cyan). The same ids in the same order always
 *   give the same colours: on every visit, every day.
 */
export const ORBIT_PALETTE: readonly PathColour[] = ['teal', 'cyan', 'blue', 'purple', 'magenta', 'pink', 'gold'];
/** The habit cards' five tones (app/visual-v21.css `[data-tone]`, by each tone's lead colour): 0 cyan, 1 violet, 2 mint, 3 blue, 4 magenta. */
export const HABIT_TONE_COLOURS: readonly PathColour[] = ['cyan', 'purple', 'teal', 'blue', 'magenta'];

/** A small stable hash (FNV-1a, 32 bit) of a text: the same id gives the same number in every browser. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export type OrbitColourSource = {id: string; colour?: PathColour | null; tone?: number | null};
const own = (item: OrbitColourSource): PathColour => {
  if (typeof item.tone === 'number' && Number.isInteger(item.tone)) return HABIT_TONE_COLOURS[((item.tone % 5) + 5) % 5]!;
  if (item.colour && item.colour in PATH_COLOURS) return item.colour;
  return ORBIT_PALETTE[stableHash(item.id) % ORBIT_PALETTE.length]!;
};

/** Each item's colour on the path, in path order: its own, then nudged along the palette until it differs from its neighbours. */
export function orbitColours(items: readonly OrbitColourSource[]): PathColour[] {
  const wanted = items.map(own), out: PathColour[] = [];
  items.forEach((item, i) => {
    const before = out[i - 1], after = wanted[i + 1], first = wanted[i]!;
    if (first !== before && first !== after) { out.push(first); return; }
    // (Nudge from the item's own place in the palette, so the result stays stable for that id.)
    const start = ORBIT_PALETTE.indexOf(first) + 1 + (stableHash(item.id) % 3);
    const pick = (avoid: (c: PathColour) => boolean) => { for (let k = 0; k < ORBIT_PALETTE.length; k++) { const c = ORBIT_PALETTE[(start + k) % ORBIT_PALETTE.length]!; if (!avoid(c)) return c; } return null; };
    out.push(first !== before ? first : pick(c => c === before || c === after) ?? pick(c => c === before) ?? first);
  });
  return out;
}

/** The same as a map from id to colour. */
export const orbitColourMap = (items: readonly OrbitColourSource[]): Map<string, PathColour> => { const c = orbitColours(items); return new Map(items.map((it, i) => [it.id, c[i]!])); };
