import type {GlyphPaint} from '../orbit-art';
// Five candles, x, wick top and bottom, body top and bottom, rising (filled) or falling (hollow).
const CANDLES = [[70, 116, 146, 122, 140, true], [90, 104, 136, 110, 128, false], [110, 92, 130, 98, 122, true], [130, 96, 122, 100, 114, false], [150, 66, 108, 74, 100, true]] as const;
/** Session AE (Part 4, ADR-027 G5): Markets — five candlesticks climbing, their wick tops joined as a constellation and the
 * last one its brightest star. */
export function MarketsGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d={`M${CANDLES.map(([x, top]) => `${x} ${top}`).join('L')}`} stroke={accent} strokeWidth="1.3" opacity=".7"/>
    {CANDLES.map(([x, top, bottom, open, close, up]) => <g key={x}>
      <path d={`M${x} ${top}V${bottom}`} stroke={line} strokeWidth="1.6"/>
      <rect x={x - 4.5} y={open} width="9" height={close - open} rx="1.5" fill={up ? fill : 'none'} stroke={line} strokeWidth="2"/>
      <circle cx={x} cy={top} r={x === 150 ? 3.4 : 2.4} className={up ? 'ha-ink-a' : 'ha-ink-c'} stroke="none"/>
    </g>)}
  </g>;
}
