/** Stable decorative identity only; independent of funding health or wellness status. */
export function visualTone(id: string): number {
  if (/^\d+$/.test(id)) return Number((BigInt(id) + 4n) % 5n);
  let hash = 0;
  for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % 5;
}
