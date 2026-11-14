/**
 * Shares of a total in basis points (hundredths of a percent), rounded by largest remainder: each share is floored, then
 * the hundredths still missing go to the largest remainders (the earlier part first on a tie), so the shown shares add up
 * to exactly the rounded share of the parts together: 100.00 % when the parts make the total (Session AF Gate C, design
 * critique 1; moved here in Session AO, L-075, so Wealth's composition and a goal's asset mix share one rounding).
 * 125 of 300 and the 175 left read 41.67 % and 58.33 %; three thirds read 33.34 %, 33.33 % and 33.33 %.
 * Parts past the total (an overfunded goal) are shares of that total, rounded the same way.
 */
export function shareBasisPoints(values: readonly bigint[], total: bigint): number[] {
  if (total <= 0n) return values.map(() => 0);
  const floors = values.map(v => v * 10000n / total), rest = values.map((v, i) => ({i, r: v * 10000n - floors[i]! * total}));
  const sum = values.reduce((n, v) => n + v, 0n), whole = (sum * 20000n + total) / (2n * total);
  let missing = Number(whole - floors.reduce((n, f) => n + f, 0n));
  const out = floors.map(Number);
  for (const {i} of [...rest].sort((a, b) => a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1)) { if (missing <= 0) break; out[i]! += 1; missing--; }
  return out;
}
