import type {GlyphPaint} from '../orbit-art';
/** Session AE (Part 4, ADR-027 G5): Health — a heart with one pulse running through it, the beat a small bright star. */
export function HealthGlyph({line, accent, fill}: GlyphPaint) {
  return <g>
    <path d="M110 148c-15-11.5-41-27-41-50.5C69 85 78.5 76 90.5 76c8.5 0 15 4.5 19.5 11.5C114.5 80.5 121 76 129.5 76 141.5 76 151 85 151 97.5 151 121 125 136.5 110 148z" fill={fill} stroke={line} strokeWidth="2.1"/>
    <path d="M56 113h26l7.5-12 10 26 11-37 8.5 27 6-10H164" stroke={accent} strokeWidth="2.2"/>
    <circle cx="164" cy="113" r="3" className="ha-ink-a" stroke="none"/>
    <path d="M89 90c-4 1.5-7 5-7.5 9.5" stroke={line} strokeWidth="1.6" opacity=".7"/>
  </g>;
}
