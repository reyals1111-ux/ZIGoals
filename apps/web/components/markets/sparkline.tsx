/**
 * A 7-day line from exact samples (Session W Parts 15–16, shared by Portfolio and Markets). The samples carry no times,
 * so the line has no axis; its label says, in words, where it starts and ends. Drawn once, no animation.
 */
export function Sparkline({prices, label, width = 96, height = 28}: {prices: readonly {value: string; decimals: number}[]; label: string; width?: number; height?: number}) {
  if (prices.length < 2) return <span className="sparkline-none">Not provided</span>;
  const decimals = Math.max(...prices.map(p => p.decimals)), values = prices.map(p => BigInt(p.value) * 10n ** BigInt(decimals - p.decimals));
  const min = values.reduce((a, b) => a < b ? a : b), max = values.reduce((a, b) => a > b ? a : b), range = max - min;
  const points = values.map((v, i) => `${(i / (values.length - 1) * (width - 2) + 1).toFixed(1)},${range === 0n ? (height / 2).toFixed(1) : (height - 1 - Number((v - min) * 1000n / range) / 1000 * (height - 2)).toFixed(1)}`).join(' ');
  const direction = values.at(-1)! > values[0]! ? 'up' : values.at(-1)! < values[0]! ? 'down' : 'flat';
  return <svg className="sparkline" data-direction={direction} role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
  </svg>;
}
/** The words for a sparkline: first and last sample and the direction. */
export function sparklineWords(name: string, prices: readonly {value: string; decimals: number}[], format: (text: string) => string) {
  if (prices.length < 2) return `${name}: no 7-day line`;
  const text = (p: {value: string; decimals: number}) => { if (!p.decimals) return p.value; const padded = p.value.padStart(p.decimals + 1, '0'); return `${padded.slice(0, -p.decimals)}.${padded.slice(-p.decimals)}`; };
  const first = text(prices[0]!), last = text(prices.at(-1)!), up = Number(last) > Number(first), down = Number(last) < Number(first);
  return `${name}, last 7 days: from ${format(first)} to ${format(last)}, ${up ? 'up' : down ? 'down' : 'unchanged'}`;
}
