import type {GlyphPaint} from '../orbit-art';
// The projects around the chain: x, y, radius, paint.
const NODES = [[110, 66, 5, 'a'], [147, 86, 4.4, 'c'], [150, 130, 5.4, 'b'], [112, 154, 3.8, 'c'], [72, 134, 5, 'a'], [70, 90, 4.2, 'b']] as const;
/** Session AE (Part 4, ADR-027 G5): the ecosystem — a node network, one chain in the middle and its projects linked round
 * it. */
export function EcosystemGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M110 66 147 86 150 130M72 134 70 90 110 66" stroke={accent} strokeWidth="1.2" opacity=".42"/>
    <path d={NODES.map(([x, y]) => `M110 110L${x} ${y}`).join('')} stroke={accent} strokeWidth="1.5" opacity=".75"/>
    {NODES.map(([x, y, r, ink]) => <circle key={x} cx={x} cy={y} r={r} className={`ha-ink-${ink}`} stroke="none"/>)}
    <circle cx="110" cy="110" r="11" fill={fill} stroke={line} strokeWidth="2.1"/>
    <circle cx="110" cy="110" r="3.6" className="ha-ink-a" stroke="none"/>
  </g>;
}
