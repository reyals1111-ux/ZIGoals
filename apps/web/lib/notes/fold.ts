/**
 * Session AV lane 2 (r4-notes; LEDGER #313, Bear's folding): a heading folds the blocks under it, up to the next heading
 * of its level or higher. `levels[i]` is block i's heading level (1–3), or null for any other block. Pure; the folds
 * last for one visit (component state), so nothing is stored.
 */
export type Levels = readonly (number | null)[];
/** How many blocks a heading's section holds (0: nothing to fold). */
export function sectionSize(levels: Levels, i: number): number {
  const level = levels[i];
  if (level === null || level === undefined) return 0;
  let n = 0;
  for (let j = i + 1; j < levels.length; j++) { const l = levels[j]; if (l !== null && l !== undefined && l <= level) break; n++; }
  return n;
}
/** The blocks hidden by the folded headings (a folded heading inside a folded section is hidden with it). */
export function hiddenBlocks(levels: Levels, folded: ReadonlySet<number>): Set<number> {
  const hidden = new Set<number>();
  let active: number | null = null;
  levels.forEach((l, j) => {
    if (active !== null && l !== null && l <= active) active = null;
    if (active !== null) { hidden.add(j); return; }
    if (l !== null && folded.has(j) && sectionSize(levels, j) > 0) active = l;
  });
  return hidden;
}
/** The folded headings that hide block `target` (opening them shows it). */
export function foldsHiding(levels: Levels, folded: ReadonlySet<number>, target: number): number[] {
  return [...folded].filter(h => h < target && h + sectionSize(levels, h) >= target);
}
/** Every heading with something under it (what Fold all folds). */
export const foldable = (levels: Levels): number[] => levels.flatMap((l, i) => l !== null && sectionSize(levels, i) > 0 ? [i] : []);
