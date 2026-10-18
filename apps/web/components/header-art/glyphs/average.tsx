import type {GlyphPaint} from '../orbit-art';
const DAYS = [[76, 100], [92, 117], [108, 97], [124, 122], [140, 102]] as const;
/** Session AE (Part 4, ADR-027 G5): an average goal — a target, the days' values rising and falling across it and the
 * average held as one dashed line through the centre. */
export function AverageGlyph({line, accent}: GlyphPaint) {
  return <g>
    <circle cx="110" cy="110" r="42" stroke={accent} strokeWidth="1.3" opacity=".42"/>
    <circle cx="110" cy="110" r="24" stroke={accent} strokeWidth="1.3" opacity=".6"/>
    <path d="M56 110h108" stroke={accent} strokeWidth="1.7" strokeDasharray="5 5"/>
    <path d="M60 121C62.7 117.5 70.7 100.7 76 100S86.7 117.5 92 117 102.7 96.2 108 97 118.7 121.2 124 122 134 103.5 140 102 156.7 111.2 160 113" stroke={line} strokeWidth="2.1"/>
    {DAYS.map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.4" className="ha-ink-a" stroke="none"/>)}
    <circle cx="110" cy="110" r="5" className="ha-ink-b" stroke="none"/>
  </g>;
}
