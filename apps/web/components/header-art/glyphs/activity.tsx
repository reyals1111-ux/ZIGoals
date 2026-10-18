import type {GlyphPaint} from '../orbit-art';
const MOMENTS = [[66, 'a'], [88, 'c'], [110, 'b'], [132, 'a']] as const;
/** Session AE (Part 4, ADR-027 G5): Activity — a comet crossing a timeline of moments, its tail streaming back over the
 * steps already taken. */
export function ActivityGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M58 140h104" stroke={accent} strokeWidth="1.4" opacity=".55"/>
    {MOMENTS.map(([x, ink]) => <g key={x}><path d={`M${x} 134v12`} stroke={accent} strokeWidth="1.4" opacity=".5"/><circle cx={x} cy="140" r="3" className={`ha-ink-${ink}`} stroke="none"/></g>)}
    <path d="M133 87C112 100 88 116 70 132" stroke={accent} strokeWidth="1.9" opacity=".9"/>
    <path d="M136 91C122 104 106 118 94 131" stroke={accent} strokeWidth="1.5" opacity=".6"/>
    <path d="M131 82C114 88 98 94 82 104" stroke={accent} strokeWidth="1.5" opacity=".45"/>
    <circle cx="142" cy="80" r="10" fill={fill} stroke={line} strokeWidth="2.1"/>
    <circle cx="144" cy="78" r="3.6" className="ha-ink-a" stroke="none"/>
  </g>;
}
