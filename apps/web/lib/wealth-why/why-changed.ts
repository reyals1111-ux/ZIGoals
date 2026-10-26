/**
 * Session AH (CO6): "why did it change", by rule. Between two recorded totals, the asset classes that moved most, in
 * the order of how much they moved (at most `top`). Only recorded values are compared; nothing is guessed. A class
 * missing on one side counts as zero there (it was added, or it is gone).
 */
export type ClassMove = {name: string; delta: bigint};
export type WhyChanged = {total: bigint; moves: ClassMove[]; others: number};

export function whyChanged(before: {value: string; classes?: Record<string, string>}, after: {value: string; classes?: Record<string, string>}, top = 2): WhyChanged {
  const read = (v: string | undefined) => (v && /^-?\d+$/.test(v) ? BigInt(v) : 0n);
  const total = read(after.value) - read(before.value);
  const names = new Set([...Object.keys(before.classes ?? {}), ...Object.keys(after.classes ?? {})]);
  const moves = [...names].map(name => ({name, delta: read(after.classes?.[name]) - read(before.classes?.[name])}))
    .filter(m => m.delta !== 0n)
    .sort((a, b) => { const x = a.delta < 0n ? -a.delta : a.delta, y = b.delta < 0n ? -b.delta : b.delta; return x === y ? a.name.localeCompare(b.name) : y > x ? 1 : -1; });
  return {total, moves: moves.slice(0, top), others: Math.max(0, moves.length - top)};
}
